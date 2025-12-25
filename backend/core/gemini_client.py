"""
Gemini AI client wrapper for consistent AI interactions with automatic API key switching
"""
import json
import google.genai as genai
from typing import Any, Dict
from fastapi import HTTPException
from logger import get_logger
from config import GEMINI_API_KEYS, GEMINI_MODEL_NAME

logger = get_logger(__name__)

# Track current API key index
current_key_index = 0

def generate_with_gemini(prompt: str, context: str = None, _retry_key_index: int = 0) -> str:
    """
    Generate content using Gemini AI with automatic API key switching
    
    Args:
        prompt: The prompt to send to Gemini
        context: Optional context prefix for logging
        _retry_key_index: Internal parameter for API key retry logic
        
    Returns:
        Generated content as string
        
    Raises:
        HTTPException: If all API keys are exhausted
    """
    global current_key_index
    ctx = context or "GEMINI"
    
    # Use the retry index or current global index
    key_index = _retry_key_index
    api_key = GEMINI_API_KEYS[key_index]
    
    logger.info("=" * 80)
    logger.info(f"[{ctx}] Starting Gemini AI generation")
    logger.info(f"[{ctx}] Using API Key #{key_index + 1} of {len(GEMINI_API_KEYS)}")
    logger.info(f"[{ctx}] Prompt length: {len(prompt)} characters")
    logger.info(f"[{ctx}] Model: {GEMINI_MODEL_NAME}")
    
    # Create client with current API key
    client = genai.Client(api_key=api_key)
    
    try:
        # Try the API call
        logger.info(f"[{ctx}] Attempting API call with client.models.generate_content")
        response = client.models.generate_content(
            model=GEMINI_MODEL_NAME,
            contents=prompt
        )
        logger.info(f"[{ctx}] API call successful with Key #{key_index + 1}")
        
        # Update global index on success
        current_key_index = key_index
        
    except AttributeError:
        # Fallback to alternative API pattern
        logger.info(f"[{ctx}] AttributeError caught, trying alternative API pattern")
        try:
            response = client.generate_content(
                model=GEMINI_MODEL_NAME,
                contents=prompt
            )
            logger.info(f"[{ctx}] Alternative API call successful")
            current_key_index = key_index
        except Exception as e:
            raise e  # Re-raise to outer handler
            
    except Exception as api_error:
        error_str = str(api_error)
        error_type = type(api_error).__name__
        
        # Check if it's a rate limit error (429)
        is_rate_limit = "429" in error_str or "RESOURCE_EXHAUSTED" in error_str
        is_quota_exceeded = "quota" in error_str.lower()
        
        if is_rate_limit or is_quota_exceeded:
            logger.error(f"[{ctx}] API Key #{key_index + 1} rate limit exceeded")
            
            # Try next API key
            next_key_index = key_index + 1
            if next_key_index < len(GEMINI_API_KEYS):
                logger.info(f"[{ctx}] Switching to API Key #{next_key_index + 1}")
                return generate_with_gemini(prompt, context, next_key_index)
            else:
                # All API keys exhausted
                logger.error(f"[{ctx}] All {len(GEMINI_API_KEYS)} API keys exhausted")
                raise HTTPException(
                    status_code=429,
                    detail=f"All {len(GEMINI_API_KEYS)} API keys have reached their quota. Please wait 24 hours or add more API keys."
                )
        else:
            # Non-rate-limit error
            logger.error("=" * 80)
            logger.error(f"[{ctx} ERROR] Gemini API error occurred")
            logger.error(f"[{ctx} ERROR] Error type: {error_type}")
            logger.error(f"[{ctx} ERROR] Error message: {error_str}")
            logger.error("=" * 80)
            raise HTTPException(status_code=500, detail=f"AI generation failed: {error_str}")
    
    # Extract text from response
    try:
        if hasattr(response, 'text'):
            result = response.text
        elif hasattr(response, 'content'):
            result = response.content
        else:
            result = str(response)
        
        logger.info(f"[{ctx}] Response received: {len(result)} characters")
        logger.info(f"[{ctx}] Response preview: {result[:200]}...")
        logger.info("=" * 80)
        return result
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"[{ctx} ERROR] Failed to extract response: {error_msg}")
        logger.error("=" * 80)
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {error_msg}")


def parse_json_response(response: str, context: str = None) -> Any:
    """
    Parse JSON from Gemini response, handling markdown code blocks
    
    Args:
        response: The raw response from Gemini
        context: Optional context for logging
        
    Returns:
        Parsed JSON data
        
    Raises:
        HTTPException: If parsing fails
    """
    ctx = context or "PARSE"
    logger.info(f"[{ctx}] Parsing JSON response")
    
    # Clean response
    cleaned = response.strip()
    
    # Remove markdown code blocks if present
    if cleaned.startswith("```json"):
        logger.info(f"[{ctx}] Removing ```json markdown wrapper")
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        logger.info(f"[{ctx}] Removing ``` markdown wrapper")
        cleaned = cleaned[3:]
    
    if cleaned.endswith("```"):
        logger.info(f"[{ctx}] Removing trailing ```")
        cleaned = cleaned[:-3]
    
    cleaned = cleaned.strip()
    
    try:
        parsed = json.loads(cleaned)
        logger.info(f"[{ctx}] JSON parsed successfully")
        return parsed
    except json.JSONDecodeError as e:
        logger.error(f"[{ctx} ERROR] JSON decode failed: {str(e)}")
        logger.error(f"[{ctx} ERROR] Response preview: {cleaned[:500]}")
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response as JSON: {str(e)}")
