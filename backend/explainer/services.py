"""
Business logic for content explanation
"""
import json
import re
from typing import Dict, Any, Optional
from fastapi import HTTPException
from logger import get_logger
from core.gemini_client import generate_with_gemini
from core.validators import validate_content
from core.prompts import get_explainer_prompt
from core.helpers import truncate_content

logger = get_logger(__name__)


def generate_explanation(
    content: str,
    complexity: str,
    source_type: str,
    user_profile: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Generate detailed explanation of content using AI with rich structured output
    
    Args:
        content: Content to explain
        complexity: Complexity level (simple, medium, advanced)
        source_type: Source type (TEXT, URL, PDF)
        
    Returns:
        Explanation data as dictionary
        
    Raises:
        HTTPException: If explanation generation fails
    """
    logger.info("=" * 80)
    logger.info(f"[EXPLAINER] Starting explanation generation")
    logger.info(f"[EXPLAINER] Source type: {source_type}")
    logger.info(f"[EXPLAINER] Complexity: {complexity}")
    logger.info(f"[EXPLAINER] Content length: {len(content)} characters")
    
    # Validate content
    validate_content(content, min_length=50)
    
    # Truncate content if too long
    content_to_use = truncate_content(content, max_length=15000)
    
    # Build prompt
    logger.info(f"[EXPLAINER] Building prompt for Gemini AI")
    prompt = get_explainer_prompt(content_to_use, complexity, user_profile)
    
    logger.info(f"[EXPLAINER] Prompt length: {len(prompt)} characters")
    logger.info(f"[EXPLAINER] Sending request to Gemini AI")
    
    try:
        # Generate explanation using Gemini
        explanation = generate_with_gemini(prompt, context="EXPLAINER")
        
        logger.info(f"[EXPLAINER] Explanation generated: {len(explanation)} characters")
        
        # Parse JSON response
        try:
            # Clean the response
            explanation = explanation.strip()
            if explanation.startswith("```json"):
                explanation = explanation[7:]
            if explanation.startswith("```"):
                explanation = explanation[3:]
            if explanation.endswith("```"):
                explanation = explanation[:-3]
            explanation = explanation.strip()
            
            # Fix common JSON issues: replace control characters
            import re
            # Replace unescaped newlines in strings
            explanation = re.sub(r'(?<!\\)\n(?=\s*"[^"]*":)', ' ', explanation)
            # Replace unescaped tabs
            explanation = explanation.replace('\t', ' ')
            # Remove other control characters
            explanation = re.sub(r'[\x00-\x1f\x7f-\x9f]', ' ', explanation)
            
            explanation_data = json.loads(explanation)
            logger.info(f"[EXPLAINER] Successfully parsed JSON response")
        except json.JSONDecodeError as e:
            logger.error(f"[EXPLAINER ERROR] Failed to parse JSON: {e}")
            logger.error(f"[EXPLAINER ERROR] Response: {explanation[:500]}")
            
            # Try to fix and parse again
            try:
                # More aggressive cleaning
                import json as json_module
                explanation = explanation.replace('\n', ' ').replace('\r', ' ')
                explanation = re.sub(r'\s+', ' ', explanation)
                explanation_data = json_module.loads(explanation)
                logger.info(f"[EXPLAINER] Successfully parsed JSON after aggressive cleaning")
            except:
                raise HTTPException(status_code=500, detail="Failed to parse AI response")
        
        logger.info(f"[EXPLAINER] Explanation completed successfully")
        logger.info("=" * 80)
        
        return explanation_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("=" * 80)
        logger.error(f"[EXPLAINER ERROR] Unexpected error: {str(e)}")
        logger.error("=" * 80)
        raise HTTPException(status_code=500, detail=f"Explanation generation failed: {str(e)}")


def generate_chat_response(
    explainer_content: str,
    chat_history: list,
    question: str,
    user_profile: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Generate contextual chat response based on explainer content
    
    Args:
        explainer_content: Full explainer content as JSON string
        chat_history: Previous chat messages
        question: User's question
        user_profile: User profile for personalized responses
        
    Returns:
        Chat response with answer and relevant section
    """
    logger.info(f"[EXPLAINER CHAT] Generating response for question: {question[:100]}")
    logger.info(f"[EXPLAINER CHAT] Chat history length: {len(chat_history)} messages")
    
    # Parse explainer content to extract structured information
    try:
        explainer_data = json.loads(explainer_content) if isinstance(explainer_content, str) else explainer_content
        # Extract key information from explainer
        title = explainer_data.get("title", "Content")
        summary = explainer_data.get("summary", "")
        sections = explainer_data.get("sections", [])
        concepts = explainer_data.get("concepts", [])
        
        # Build comprehensive content context
        content_context = f"Title: {title}\nSummary: {summary}\n\n"
        
        # Add sections
        if sections:
            content_context += "Sections:\n"
            for section in sections[:10]:  # Limit to first 10 sections
                heading = section.get("heading", "")
                content_text = section.get("content", "")[:500]  # Limit content length
                key_points = section.get("key_points", [])
                content_context += f"- {heading}: {content_text}\n"
                if key_points:
                    content_context += f"  Key points: {', '.join(key_points[:3])}\n"
        
        # Add concepts
        if concepts:
            content_context += "\nKey Concepts:\n"
            for concept in concepts[:10]:  # Limit to first 10 concepts
                term = concept.get("term", "")
                definition = concept.get("definition", "")
                content_context += f"- {term}: {definition}\n"
        
        # Limit total content context to avoid token limits
        content_context = content_context[:8000]
        
    except (json.JSONDecodeError, TypeError, AttributeError) as e:
        logger.warning(f"[EXPLAINER CHAT] Could not parse explainer content as JSON, using raw string: {e}")
        # Fallback: use raw string, but limit length
        content_context = explainer_content[:8000] if isinstance(explainer_content, str) else str(explainer_content)[:8000]
    
    # Build chat history context (all messages for full context)
    history_text = ""
    if chat_history:
        history_text = "\n".join([
            f"{msg.get('role', 'user').upper()}: {msg.get('content', '')}"
            for msg in chat_history  # Use all chat history for context
        ])
        history_text = history_text[:3000]  # Limit history length
    
    # Build personalized context from user profile
    profile_context = ""
    if user_profile:
        profile_parts = []
        if user_profile.get("learner_type"):
            profile_parts.append(f"Learner Type: {user_profile['learner_type']}")
        if user_profile.get("age_group"):
            profile_parts.append(f"Age Group: {user_profile['age_group']}")
        if user_profile.get("preferred_learning_style"):
            profile_parts.append(f"Learning Style: {user_profile['preferred_learning_style']}")
        if user_profile.get("education_level"):
            profile_parts.append(f"Education Level: {user_profile['education_level']}")
        if user_profile.get("learning_goals"):
            profile_parts.append(f"Learning Goals: {', '.join(user_profile['learning_goals'])}")
        if user_profile.get("interests"):
            profile_parts.append(f"Interests: {', '.join(user_profile['interests'])}")
        
        if profile_parts:
            profile_context = f"""
STUDENT PROFILE:
{chr(10).join(profile_parts)}

Adapt your explanation style to match this student's profile. Use appropriate language complexity, examples relevant to their interests, and teaching methods that align with their learning style."""
    
    prompt = f"""You are a helpful AI tutor answering questions about educational content. You have access to the full explained content and the complete chat history.

{profile_context}

EXPLAINED CONTENT (Full Context):
{content_context}

CHAT HISTORY (Complete Conversation):
{history_text if history_text else "No previous conversation."}

CURRENT STUDENT QUESTION:
{question}

INSTRUCTIONS:
1. Provide a clear, detailed answer based on the explained content above
2. Reference specific sections or concepts from the explained content when relevant
3. Use the chat history to understand the conversation context
4. If the question is outside the scope of the content, politely guide the student back to the topic
5. {profile_context and "Tailor your response to the student's learning style, age group, and interests. Use examples and analogies that resonate with their profile." or "Provide a clear, educational response."}

IMPORTANT: You MUST return ONLY valid JSON. No markdown, no code blocks, no additional text.

Return your response in this exact JSON format:
{{
    "answer": "Your detailed answer here. Be comprehensive and reference the explained content.",
    "relevant_section": "Which section/concept this relates to (if applicable, otherwise null)"
}}

Return ONLY the JSON object, nothing else."""
    
    try:
        logger.info(f"[EXPLAINER CHAT] Sending request to Gemini AI")
        response = generate_with_gemini(prompt, context="EXPLAINER_CHAT")
        
        if not response or not response.strip():
            logger.error(f"[EXPLAINER CHAT ERROR] Empty response from Gemini")
            raise HTTPException(status_code=500, detail="Received empty response from AI")
        
        logger.info(f"[EXPLAINER CHAT] Raw response length: {len(response)} characters")
        logger.info(f"[EXPLAINER CHAT] Raw response preview: {response[:200]}")
        
        # Clean and parse JSON
        response_clean = response.strip()
        
        # Remove markdown code blocks
        if response_clean.startswith("```json"):
            response_clean = response_clean[7:].strip()
        elif response_clean.startswith("```"):
            response_clean = response_clean[3:].strip()
        
        if response_clean.endswith("```"):
            response_clean = response_clean[:-3].strip()
        
        # Try to find JSON object if there's extra text
        json_start = response_clean.find("{")
        json_end = response_clean.rfind("}") + 1
        
        if json_start != -1 and json_end > json_start:
            response_clean = response_clean[json_start:json_end]
        
        response_clean = response_clean.strip()
        
        if not response_clean:
            logger.error(f"[EXPLAINER CHAT ERROR] No JSON found in response")
            raise HTTPException(status_code=500, detail="No valid JSON found in AI response")
        
        # Parse JSON
        try:
            chat_data = json.loads(response_clean)
            logger.info(f"[EXPLAINER CHAT] Successfully parsed JSON response")
            
            # Validate response structure
            if "answer" not in chat_data:
                logger.warning(f"[EXPLAINER CHAT] Missing 'answer' field, creating default")
                chat_data["answer"] = response_clean  # Fallback to raw response
            
            if "relevant_section" not in chat_data:
                chat_data["relevant_section"] = None
            
            logger.info(f"[EXPLAINER CHAT] Response generated successfully")
            return chat_data
            
        except json.JSONDecodeError as json_err:
            logger.error(f"[EXPLAINER CHAT ERROR] JSON decode error: {json_err}")
            logger.error(f"[EXPLAINER CHAT ERROR] Response that failed to parse: {response_clean[:500]}")
            # Fallback: return the response as plain text
            return {
                "answer": response_clean if response_clean else "I apologize, but I'm having trouble processing that. Could you please rephrase your question?",
                "relevant_section": None
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[EXPLAINER CHAT ERROR] Unexpected error: {type(e).__name__} - {str(e)}")
        logger.error(f"[EXPLAINER CHAT ERROR] Full traceback:", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Chat response failed: {str(e)}")


def extract_examples(explanation: str) -> list:
    """
    Extract examples from explanation
    
    Args:
        explanation: Generated explanation text
        
    Returns:
        List of examples
    """
    examples = []
    lines = explanation.split('\n')
    
    for i, line in enumerate(lines):
        lower_line = line.lower()
        # Look for lines mentioning examples
        if 'example' in lower_line or 'for instance' in lower_line:
            # Get the next few lines as the example
            example_text = line
            if i + 1 < len(lines):
                example_text += '\n' + lines[i + 1]
            examples.append(example_text[:300])  # Limit length
    
    return examples[:3]  # Return top 3 examples
