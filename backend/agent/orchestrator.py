"""
Agent Orchestrator using Gemini Function Calling (ADK-style)
Main agent that coordinates tool execution based on user queries
"""
import json
from typing import Dict, Any, List, Optional
from fastapi import HTTPException
from logger import get_logger
from agent.tools import AGENT_TOOLS
from agent.services import (
    execute_explain_content,
    execute_generate_quiz,
    execute_generate_flashcards,
    execute_generate_workflow
)
from agent.context_manager import ConversationContext

logger = get_logger(__name__)

async def process_agent_message(
    user_message: str,
    context: ConversationContext,
    user_profile: Optional[Dict[str, Any]] = None,
    pdf_bytes: Optional[bytes] = None,
    pdf_filename: Optional[str] = None
) -> Dict[str, Any]:
    """
    Process user message through agent orchestrator
    
    Args:
        user_message: User's message/query
        context: Conversation context
        user_profile: User profile for personalization
        pdf_bytes: Optional PDF file bytes
        pdf_filename: Optional PDF filename
        
    Returns:
        Agent response with tool results
    """
    logger.info("=" * 80)
    logger.info(f"[AGENT] Processing message: {user_message[:100]}...")
    
    # Add user message to context
    context.add_message("user", user_message)
    
    # Build system prompt with context
    system_prompt = build_system_prompt(context, user_profile)
    
    # Build conversation history
    conversation = context.get_conversation_history()
    
    # Prepare messages for Gemini
    messages = []
    for msg in conversation:
        messages.append({
            "role": msg["role"],
            "parts": [{"text": msg["content"]}]
        })
    
    # Add current user message
    messages.append({
        "role": "user",
        "parts": [{"text": user_message}]
    })
    
    try:
        # Call Gemini with function calling
        from config import GEMINI_API_KEYS, GEMINI_MODEL_NAME
        import google.genai as genai
        
        client = genai.Client(api_key=GEMINI_API_KEYS[0])
        
        # Convert tools to Gemini function calling format
        # Gemini expects tools in a specific format
        tools_config = {
            "function_declarations": AGENT_TOOLS
        }
        
        logger.info(f"[AGENT] Calling Gemini with {len(AGENT_TOOLS)} tools available")
        
        # Build content with system instruction
        full_prompt = f"{system_prompt}\n\nConversation:\n"
        for msg in messages:
            full_prompt += f"{msg['role']}: {msg['parts'][0]['text']}\n"
        
        # Generate response with function calling
        try:
            response = client.models.generate_content(
                model=GEMINI_MODEL_NAME,
                contents=full_prompt,
                tools=[tools_config]
            )
        except Exception as e:
            # Fallback: try without tools first, then add function calling
            logger.warning(f"[AGENT] Direct function calling failed, using prompt-based approach: {e}")
            # Use a prompt that instructs Gemini to call functions
            function_calling_prompt = build_function_calling_prompt(system_prompt, messages, user_message)
            response = client.models.generate_content(
                model=GEMINI_MODEL_NAME,
                contents=function_calling_prompt
            )
        
        # Parse response to check for function calls or extract intent
        response_text = extract_text_from_response(response)
        
        # Check for function calls in response
        function_calls = []
        if hasattr(response, 'candidates') and response.candidates:
            candidate = response.candidates[0]
            if hasattr(candidate, 'content') and candidate.content:
                if hasattr(candidate.content, 'parts'):
                    for part in candidate.content.parts:
                        if hasattr(part, 'function_call'):
                            func_call = part.function_call
                            # Extract function name properly
                            func_name = ""
                            if hasattr(func_call, 'name'):
                                func_name = func_call.name
                            elif hasattr(func_call, 'function_name'):
                                func_name = func_call.function_name
                            elif isinstance(func_call, dict):
                                func_name = func_call.get('name', '')
                            
                            # Extract args properly
                            func_args = {}
                            if hasattr(func_call, 'args'):
                                if isinstance(func_call.args, dict):
                                    func_args = func_call.args
                                elif hasattr(func_call.args, 'to_dict'):
                                    func_args = func_call.args.to_dict()
                            
                            if func_name:  # Only add if we have a valid name
                                function_calls.append({
                                    "name": func_name,
                                    "args": func_args
                                })
        
        # If no function calls detected, parse intent from response or user message
        if not function_calls:
            logger.info("[AGENT] No function calls detected, parsing intent from response/user message")
            # Try to parse JSON from response first
            tool_intent = parse_json_tool_intent(response_text)
            if not tool_intent:
                # Fallback to parsing from user message directly
                logger.info("[AGENT] JSON parsing failed, using direct intent parsing from user message")
                tool_intent = parse_tool_intent(response_text, user_message)
            if tool_intent and tool_intent.get("name"):
                logger.info(f"[AGENT] Parsed tool intent: {tool_intent.get('name')}")
                function_calls = [tool_intent]
            else:
                logger.warning("[AGENT] Could not parse tool intent, will respond without tools")
        
        # If function calls, execute them
        if function_calls:
            logger.info(f"[AGENT] {len(function_calls)} function call(s) detected")
            tool_results = []
            
            for func_call in function_calls:
                if isinstance(func_call, dict):
                    tool_name = func_call.get("name")
                    tool_args = func_call.get("args", {})
                else:
                    tool_name = func_call.name if hasattr(func_call, 'name') else func_call.get("name")
                    if hasattr(func_call, 'args'):
                        if isinstance(func_call.args, dict):
                            tool_args = func_call.args
                        elif hasattr(func_call.args, 'to_dict'):
                            tool_args = func_call.args.to_dict()
                        else:
                            tool_args = {}
                    else:
                        tool_args = func_call.get("args", {})
                
                # Validate tool name
                if not tool_name or not tool_name.strip():
                    logger.error(f"[AGENT] Empty tool name detected. Skipping execution.")
                    tool_results.append({
                        "tool": "unknown",
                        "error": "Tool name is empty"
                    })
                    continue
                
                logger.info(f"[AGENT] Executing tool: {tool_name} with args: {list(tool_args.keys())}")
                
                # Execute tool
                try:
                    result = await execute_tool(tool_name, tool_args, context, user_profile, pdf_bytes, pdf_filename)
                    tool_results.append({
                        "tool": tool_name,
                        "result": result
                    })
                    
                    # Store in context
                    context.store_tool_result(tool_name, result)
                    
                except Exception as e:
                    logger.error(f"[AGENT] Tool execution error: {str(e)}")
                    tool_results.append({
                        "tool": tool_name,
                        "error": str(e)
                    })
            
            # Get final response from Gemini with tool results
            tool_results_text = format_tool_results(tool_results)
            follow_up_prompt = f"{system_prompt}\n\nTool execution completed:\n{tool_results_text}\n\nUser's original request: {user_message}\n\nProvide a helpful, comprehensive response to the user based on these tool results. Include the results naturally in your response."
            
            # Get final response
            final_response = client.models.generate_content(
                model=GEMINI_MODEL_NAME,
                contents=follow_up_prompt
            )
            
            assistant_message = extract_text_from_response(final_response)
            
        else:
            # No function calls, direct response
            assistant_message = extract_text_from_response(response)
            tool_results = []
        
        # Add assistant message to context
        context.add_message("assistant", assistant_message)
        
        logger.info(f"[AGENT] Response generated: {len(assistant_message)} characters")
        logger.info("=" * 80)
        
        return {
            "message": assistant_message,
            "tool_results": tool_results,
            "context_updated": True
        }
        
    except Exception as e:
        logger.error(f"[AGENT ERROR] {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Agent processing failed: {str(e)}")


async def execute_tool(
    tool_name: str,
    tool_args: Dict[str, Any],
    context: ConversationContext,
    user_profile: Optional[Dict[str, Any]],
    pdf_bytes: Optional[bytes],
    pdf_filename: Optional[str]
) -> Any:
    """Execute a tool based on name and arguments"""
    
    if tool_name == "explain_content":
        # Get content from args or context
        text = tool_args.get("text")
        url = tool_args.get("url")
        complexity = tool_args.get("complexity", "medium")
        
        # If text is provided but it's a topic request (not actual content), use it as-is
        # The explainer service will handle generating content about the topic
        if text and not url and not pdf_bytes:
            # Check if text looks like a topic request rather than actual content
            if len(text) < 200 and not any(char in text for char in ['.', '!', '?', '\n']):
                logger.info(f"[AGENT] Treating text as topic request: {text[:50]}...")
        
        # If no content provided, check context
        if not text and not url and not pdf_bytes:
            content = context.get_content_for_tool()
            if content:
                text = content
            else:
                raise HTTPException(status_code=400, detail="No content provided. Please provide text, URL, or upload a PDF.")
        
        return await execute_explain_content(
            text=text,
            url=url,
            pdf_bytes=pdf_bytes,
            pdf_filename=pdf_filename,
            complexity=complexity,
            user_profile=user_profile
        )
    
    elif tool_name == "generate_quiz":
        content = tool_args.get("content")
        if not content:
            # Try to get from context
            content = context.get_content_for_tool()
            if not content:
                raise HTTPException(status_code=400, detail="No content available. Please explain content first.")
        
        num_questions = tool_args.get("num_questions", 10)
        difficulty = tool_args.get("difficulty", "medium")
        
        return await execute_generate_quiz(
            content=content,
            num_questions=num_questions,
            difficulty=difficulty,
            user_profile=user_profile
        )
    
    elif tool_name == "generate_flashcards":
        content = tool_args.get("content")
        if not content:
            # Try to get from context
            content = context.get_content_for_tool()
            if not content:
                raise HTTPException(status_code=400, detail="No content available. Please explain content first.")
        
        num_cards = tool_args.get("num_cards", 10)
        words_per_card = tool_args.get("words_per_card", 35)
        
        return await execute_generate_flashcards(
            content=content,
            num_cards=num_cards,
            words_per_card=words_per_card,
            user_profile=user_profile
        )
    
    elif tool_name == "generate_workflow":
        content = tool_args.get("content")
        if not content:
            # Try to get from context
            content = context.get_content_for_tool()
            if not content:
                raise HTTPException(status_code=400, detail="No content available. Please explain content first.")
        
        return await execute_generate_workflow(
            content=content,
            user_profile=user_profile
        )
    
    else:
        raise HTTPException(status_code=400, detail=f"Unknown tool: {tool_name}")


def build_system_prompt(context: ConversationContext, user_profile: Optional[Dict[str, Any]]) -> str:
    """Build system prompt for the agent"""
    prompt = """You are an intelligent AI tutor agent that helps students learn by using various educational tools.

AVAILABLE TOOLS:
1. explain_content - Explain content from URL, PDF, or text
2. generate_quiz - Generate quiz questions from content
3. generate_flashcards - Generate flashcards from content
4. generate_workflow - Generate workflow diagrams from content

INSTRUCTIONS:
- When user provides content (URL/PDF/text), ALWAYS explain it first using explain_content
- After explaining, you can generate quizzes, flashcards, or workflows using the explained content
- Extract parameters from user queries (e.g., "10 questions" → num_questions=10)
- Use context from previous tool executions - if content was explained, use it for subsequent tools
- Be helpful, clear, and educational in your responses
- If user asks for multiple things, execute tools in logical order (explain → quiz/flashcards/workflow)
"""
    
    if user_profile:
        profile_parts = []
        if user_profile.get("learner_type"):
            profile_parts.append(f"Learner Type: {user_profile['learner_type']}")
        if user_profile.get("age_group"):
            profile_parts.append(f"Age Group: {user_profile['age_group']}")
        if user_profile.get("preferred_learning_style"):
            profile_parts.append(f"Learning Style: {user_profile['preferred_learning_style']}")
        
        if profile_parts:
            prompt += f"\n\nSTUDENT PROFILE:\n" + "\n".join(profile_parts)
            prompt += "\n\nAdapt your responses to match this student's profile."
    
    # Add context information
    if context.current_content:
        prompt += f"\n\nCURRENT CONTEXT: Content is available from previous explanation."
    
    return prompt


def format_tool_results(tool_results: List[Dict[str, Any]]) -> str:
    """Format tool results for Gemini"""
    formatted = []
    for tr in tool_results:
        tool_name = tr.get("tool", "unknown")
        if "error" in tr:
            formatted.append(f"{tool_name}: Error - {tr['error']}")
        else:
            result = tr.get("result", {})
            if tool_name == "explain_content":
                formatted.append(f"{tool_name}: Explanation generated successfully. Title: {result.get('title', 'N/A')}")
            elif tool_name == "generate_quiz":
                formatted.append(f"{tool_name}: Generated {result.get('num_questions', 0)} quiz questions")
            elif tool_name == "generate_flashcards":
                formatted.append(f"{tool_name}: Generated {result.get('num_cards', 0)} flashcards")
            elif tool_name == "generate_workflow":
                formatted.append(f"{tool_name}: Workflow diagram generated successfully")
    
    return "\n".join(formatted)


def extract_text_from_response(response) -> str:
    """Extract text from Gemini response"""
    try:
        if hasattr(response, 'text'):
            return response.text
        elif hasattr(response, 'candidates') and response.candidates:
            candidate = response.candidates[0]
            if hasattr(candidate, 'content'):
                if hasattr(candidate.content, 'parts'):
                    text_parts = []
                    for part in candidate.content.parts:
                        if hasattr(part, 'text'):
                            text_parts.append(part.text)
                    return " ".join(text_parts)
                elif hasattr(candidate.content, 'text'):
                    return candidate.content.text
        return str(response)
    except Exception as e:
        logger.error(f"[AGENT] Error extracting text: {str(e)}")
        return "I apologize, but I encountered an error processing the response."


def build_function_calling_prompt(system_prompt: str, messages: List, user_message: str) -> str:
    """Build a prompt that instructs Gemini to use function calling"""
    prompt = f"""{system_prompt}

AVAILABLE FUNCTIONS:
1. explain_content(text, url, complexity) - Explain content
2. generate_quiz(content, num_questions, difficulty) - Generate quiz
3. generate_flashcards(content, num_cards, words_per_card) - Generate flashcards  
4. generate_workflow(content) - Generate workflow

INSTRUCTIONS:
Analyze the user's message and determine which function(s) to call. Return your response in JSON format:
{{
    "function_calls": [
        {{
            "name": "function_name",
            "args": {{"param": "value"}}
        }}
    ],
    "reasoning": "Why you're calling this function"
}}

If no function is needed, return: {{"function_calls": [], "reasoning": "..."}}

User message: {user_message}
"""
    return prompt


def parse_json_tool_intent(response_text: str) -> Optional[Dict]:
    """Parse tool intent from JSON response"""
    import re
    import json
    
    # Try to parse JSON from response
    try:
        # Look for JSON in response (more flexible pattern)
        json_patterns = [
            r'\{[^{}]*"function_calls"[^{}]*\}',
            r'\{.*?"function_calls".*?\}',
            r'```json\s*(\{.*?\})\s*```',
            r'```\s*(\{.*?\})\s*```'
        ]
        
        for pattern in json_patterns:
            match = re.search(pattern, response_text, re.DOTALL)
            if match:
                json_str = match.group(1) if match.groups() else match.group(0)
                try:
                    parsed = json.loads(json_str)
                    if parsed.get("function_calls") and len(parsed["function_calls"]) > 0:
                        func_call = parsed["function_calls"][0]
                        if func_call.get("name"):
                            logger.info(f"[AGENT] Parsed tool intent from JSON: {func_call.get('name')}")
                            return func_call
                except json.JSONDecodeError:
                    continue
    except Exception as e:
        logger.debug(f"[AGENT] JSON parsing failed: {e}")
    
    return None


def parse_tool_intent(response_text: str, user_message: str) -> Optional[Dict]:
    """Parse tool intent from response or user message"""
    # First try JSON parsing
    json_intent = parse_json_tool_intent(response_text)
    if json_intent:
        return json_intent
    
    # Fallback: parse from user message directly
    user_lower = user_message.lower()
    
    # Check for explain intent (more comprehensive)
    explain_keywords = ["explain", "summarize", "understand", "what is", "tell me about", "describe", "teach me", "help me understand"]
    if any(keyword in user_lower for keyword in explain_keywords):
        if "http" in user_message or "www." in user_message:
            url = extract_url(user_message)
            if url:
                logger.info(f"[AGENT] Detected URL in explain request: {url}")
                return {
                    "name": "explain_content",
                    "args": {"url": url}
                }
        # For text-based explain requests, we need content
        # If it's just "explain X topic", we should generate content about that topic first
        logger.info(f"[AGENT] Detected explain intent for text: {user_message[:50]}...")
        return {
            "name": "explain_content",
            "args": {"text": user_message, "complexity": "medium"}
        }
    
    # Check for quiz intent
    if any(word in user_lower for word in ["quiz", "questions", "test", "assessment", "exam"]):
        num_questions = extract_number(user_message, default=10)
        difficulty = "medium"
        if "easy" in user_lower or "simple" in user_lower:
            difficulty = "easy"
        elif "hard" in user_lower or "difficult" in user_lower:
            difficulty = "hard"
        
        return {
            "name": "generate_quiz",
            "args": {
                "num_questions": num_questions,
                "difficulty": difficulty
            }
        }
    
    # Check for flashcard intent
    if any(word in user_lower for word in ["flashcard", "study card", "revision card"]):
        num_cards = extract_number(user_message, default=10)
        return {
            "name": "generate_flashcards",
            "args": {
                "num_cards": num_cards,
                "words_per_card": 35
            }
        }
    
    # Check for workflow intent
    if any(word in user_lower for word in ["workflow", "diagram", "flowchart", "process"]):
        return {
            "name": "generate_workflow",
            "args": {}
        }
    
    return None


def extract_url(text: str) -> Optional[str]:
    """Extract URL from text"""
    import re
    url_pattern = r'https?://[^\s]+|www\.[^\s]+'
    match = re.search(url_pattern, text)
    return match.group(0) if match else None


def extract_number(text: str, default: int = 10) -> int:
    """Extract number from text"""
    import re
    numbers = re.findall(r'\d+', text)
    if numbers:
        num = int(numbers[0])
        return min(max(num, 5), 30)  # Clamp between 5-30
    return default


