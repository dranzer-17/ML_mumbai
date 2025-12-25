"""
General helper utilities
"""
from typing import Optional

def truncate_content(content: str, max_length: int = 15000) -> str:
    """
    Truncate content to maximum length
    
    Args:
        content: Content to truncate
        max_length: Maximum length
        
    Returns:
        Truncated content
    """
    if len(content) <= max_length:
        return content
    return content[:max_length]


def format_score(correct: int, total: int) -> dict:
    """
    Format score as percentage
    
    Args:
        correct: Number of correct answers
        total: Total number of questions
        
    Returns:
        Dict with score info
    """
    percentage = (correct / total * 100) if total > 0 else 0
    return {
        "correct": correct,
        "total": total,
        "percentage": round(percentage, 2),
        "grade": get_grade(percentage)
    }


def get_grade(percentage: float) -> str:
    """
    Get letter grade from percentage
    
    Args:
        percentage: Score percentage
        
    Returns:
        Letter grade
    """
    if percentage >= 90:
        return "A"
    elif percentage >= 80:
        return "B"
    elif percentage >= 70:
        return "C"
    elif percentage >= 60:
        return "D"
    else:
        return "F"
