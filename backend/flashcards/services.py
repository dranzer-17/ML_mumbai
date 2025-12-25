"""
Business logic for flashcard generation
"""
from typing import List, Dict, Any
from fastapi import HTTPException
from logger import get_logger
from core.gemini_client import generate_with_gemini, parse_json_response
from core.validators import validate_content
from core.prompts import get_flashcard_prompt
from core.helpers import truncate_content

logger = get_logger(__name__)


def count_words(text: str) -> int:
    """
    Count words in a text string
    
    Args:
        text: Text to count words in
        
    Returns:
        Number of words
    """
    return len(text.split())


def validate_flashcard_word_limit(flashcard: Dict[str, Any], max_words: int) -> tuple[bool, str]:
    """
    Validate that flashcard front and back are within word limit
    
    Args:
        flashcard: Flashcard dictionary with 'front' and 'back'
        max_words: Maximum words allowed per side
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    front_words = count_words(flashcard.get('front', ''))
    back_words = count_words(flashcard.get('back', ''))
    
    if front_words > max_words:
        return False, f"Front has {front_words} words (max: {max_words})"
    if back_words > max_words:
        return False, f"Back has {back_words} words (max: {max_words})"
    
    return True, ""


def generate_flashcards(
    content: str,
    num_cards: int,
    words_per_card: int,
    source_type: str
) -> List[Dict[str, Any]]:
    """
    Generate flashcards from content using AI with strict word limits
    
    Args:
        content: Source content
        num_cards: Number of flashcards to generate
        words_per_card: Maximum words per card side
        source_type: Source type (TEXT, URL, PDF)
        
    Returns:
        List of flashcards as dictionaries
        
    Raises:
        HTTPException: If flashcard generation fails
    """
    logger.info("=" * 80)
    logger.info(f"[FLASHCARD] Starting flashcard generation")
    logger.info(f"[FLASHCARD] Source type: {source_type}")
    logger.info(f"[FLASHCARD] Number of cards: {num_cards}")
    logger.info(f"[FLASHCARD] Words per card: {words_per_card}")
    logger.info(f"[FLASHCARD] Content length: {len(content)} characters")
    
    # Validate inputs
    if num_cards < 5 or num_cards > 50:
        logger.error(f"[FLASHCARD ERROR] Invalid num_cards: {num_cards}")
        raise HTTPException(status_code=400, detail="Number of cards must be between 5 and 50")
    
    if words_per_card < 20 or words_per_card > 50:
        logger.error(f"[FLASHCARD ERROR] Invalid words_per_card: {words_per_card}")
        raise HTTPException(status_code=400, detail="Words per card must be between 20 and 50")
    
    # Validate content
    validate_content(content, min_length=100)
    
    # Truncate content if too long
    content_to_use = truncate_content(content, max_length=15000)
    
    # Build prompt
    logger.info(f"[FLASHCARD] Building prompt for Gemini AI")
    prompt = get_flashcard_prompt(content_to_use, num_cards, words_per_card)
    
    logger.info(f"[FLASHCARD] Prompt length: {len(prompt)} characters")
    logger.info(f"[FLASHCARD] Sending request to Gemini AI")
    
    try:
        # Generate flashcards using Gemini
        response_text = generate_with_gemini(prompt, context="FLASHCARD")
        
        logger.info(f"[FLASHCARD] Response text length: {len(response_text)} characters")
        logger.info(f"[FLASHCARD] Response preview: {response_text[:200]}...")
        
        # Parse JSON
        logger.info(f"[FLASHCARD] Parsing JSON response")
        flashcards = parse_json_response(response_text, context="FLASHCARD")
        
        logger.info(f"[FLASHCARD] JSON parsed successfully")
        logger.info(f"[FLASHCARD] Number of flashcards generated: {len(flashcards)}")
        
        # Validate word limits for each flashcard
        valid_flashcards = []
        for idx, card in enumerate(flashcards):
            card_id = card.get('id', idx + 1)
            front = card.get('front', '')
            back = card.get('back', '')
            difficulty = card.get('difficulty', 'medium')
            
            is_valid, error_msg = validate_flashcard_word_limit(card, words_per_card)
            
            front_words = count_words(front)
            back_words = count_words(back)
            
            if is_valid:
                valid_flashcards.append(card)
                logger.info(f"[FLASHCARD] Card {card_id}: ✓ Valid - Front: {front_words}w, Back: {back_words}w, Difficulty: {difficulty}")
                logger.info(f"[FLASHCARD] Card {card_id} Front: {front[:60]}...")
            else:
                logger.warning(f"[FLASHCARD] Card {card_id}: ✗ Invalid - {error_msg}")
        
        if len(valid_flashcards) == 0:
            logger.error(f"[FLASHCARD ERROR] No valid flashcards generated")
            raise HTTPException(status_code=500, detail="Failed to generate valid flashcards within word limits")
        
        logger.info(f"[FLASHCARD] Valid flashcards: {len(valid_flashcards)}/{len(flashcards)}")
        logger.info(f"[FLASHCARD] Flashcard generation completed successfully")
        logger.info("=" * 80)
        return valid_flashcards
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("=" * 80)
        logger.error(f"[FLASHCARD ERROR] Unexpected error: {str(e)}")
        logger.error("=" * 80)
        raise HTTPException(status_code=500, detail=f"Flashcard generation failed: {str(e)}")

