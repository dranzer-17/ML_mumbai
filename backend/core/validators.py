"""
Content validation utilities
"""
from fastapi import HTTPException
from logger import get_logger

logger = get_logger(__name__)

def validate_content(content: str, min_length: int = 50) -> None:
    """
    Validate that content meets minimum requirements
    
    Args:
        content: Content to validate
        min_length: Minimum length required
        
    Raises:
        HTTPException: If validation fails
    """
    if not content or not content.strip():
        logger.error("[VALIDATION ERROR] Content is empty")
        raise HTTPException(
            status_code=400,
            detail="Content is empty. Please provide valid content."
        )
    
    if len(content.strip()) < min_length:
        logger.error(f"[VALIDATION ERROR] Content too short: {len(content.strip())} chars (min: {min_length})")
        raise HTTPException(
            status_code=400,
            detail=f"Content too short. Minimum {min_length} characters required."
        )
    
    logger.info(f"[VALIDATION] Content validated: {len(content)} characters")


def validate_difficulty(difficulty: str) -> None:
    """
    Validate difficulty level
    
    Args:
        difficulty: Difficulty level to validate
        
    Raises:
        HTTPException: If validation fails
    """
    valid_difficulties = ["Easy", "Medium", "Hard"]
    if difficulty not in valid_difficulties:
        logger.error(f"[VALIDATION ERROR] Invalid difficulty: {difficulty}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid difficulty. Must be one of: {', '.join(valid_difficulties)}"
        )
    logger.info(f"[VALIDATION] Difficulty validated: {difficulty}")
