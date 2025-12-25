"""
Business logic for content explanation
"""
import json
import re
from typing import Dict, Any
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
    source_type: str
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
    prompt = get_explainer_prompt(content_to_use, complexity)
    
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
    question: str
) -> Dict[str, Any]:
    """
    Generate contextual chat response based on explainer content
    
    Args:
        explainer_content: Full explainer content as JSON string
        chat_history: Previous chat messages
        question: User's question
        
    Returns:
        Chat response with answer and relevant section
    """
    logger.info(f"[EXPLAINER CHAT] Generating response for question: {question[:100]}")
    
    # Build chat history context
    history_text = "\n".join([
        f"{msg['role'].upper()}: {msg['content']}"
        for msg in chat_history[-5:]  # Last 5 messages for context
    ])
    
    prompt = f"""
You are a helpful AI tutor answering questions about educational content.

EXPLAINED CONTENT:
{explainer_content[:5000]}

CHAT HISTORY:
{history_text}

STUDENT QUESTION:
{question}

Provide a clear, helpful answer based on the explained content. If the question is outside the scope
of the content, politely guide the student back to the topic.

Return your response in JSON format:
{{
    "answer": "Your detailed answer here",
    "relevant_section": "Which section/concept this relates to (if applicable)"
}}

Return ONLY valid JSON."""
    
    try:
        response = generate_with_gemini(prompt, context="EXPLAINER_CHAT")
        
        # Parse JSON
        response = response.strip()
        if response.startswith("```json"):
            response = response[7:]
        if response.startswith("```"):
            response = response[3:]
        if response.endswith("```"):
            response = response[:-3]
        response = response.strip()
        
        chat_data = json.loads(response)
        logger.info(f"[EXPLAINER CHAT] Response generated successfully")
        
        return chat_data
        
    except Exception as e:
        logger.error(f"[EXPLAINER CHAT ERROR] {str(e)}")
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
