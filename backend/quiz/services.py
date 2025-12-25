"""
Business logic services for quiz operations
"""
import json
from typing import List, Dict, Any, Optional
from fastapi import HTTPException
from logger import get_logger
from core.gemini_client import generate_with_gemini, parse_json_response
from core.validators import validate_content
from core.prompts import get_quiz_prompt, get_analysis_prompt
from core.helpers import truncate_content

logger = get_logger(__name__)

def generate_quiz_from_content(
    content: str,
    num_questions: int,
    difficulty: str,
    source_type: str
) -> List[Dict[str, Any]]:
    """
    Generate quiz questions from content using Gemini AI with detailed logging
    
    Args:
        content: Source content to generate questions from
        num_questions: Number of questions to generate
        difficulty: Difficulty level (Easy, Medium, Hard)
        source_type: Type of source (TEXT, URL, PDF)
        
    Returns:
        List of quiz questions as dictionaries
        
    Raises:
        HTTPException: If quiz generation fails
    """
    logger.info("=" * 80)
    logger.info(f"[QUIZ GENERATE] Starting quiz generation from {source_type}")
    logger.info(f"[QUIZ GENERATE] Number of questions requested: {num_questions}")
    logger.info(f"[QUIZ GENERATE] Difficulty level: {difficulty}")
    logger.info(f"[QUIZ GENERATE] Content length: {len(content)} characters")
    logger.info(f"[QUIZ GENERATE] Content preview: {content[:200]}...")
    
    # Validate content
    validate_content(content, min_length=50)
    
    # Truncate content if too long
    content_to_use = truncate_content(content, max_length=15000)
    if len(content) > 15000:
        logger.info(f"[QUIZ GENERATE] Content truncated from {len(content)} to 15000 characters")
    
    # Build prompt
    logger.info(f"[QUIZ GENERATE] Building prompt for Gemini AI")
    prompt = get_quiz_prompt(content_to_use, num_questions, difficulty)
    
    logger.info(f"[QUIZ GENERATE] Prompt length: {len(prompt)} characters")
    logger.info(f"[QUIZ GENERATE] Sending request to Gemini AI")
    
    try:
        # Generate content using Gemini
        response_text = generate_with_gemini(prompt, context="QUIZ GENERATE")
        
        logger.info(f"[QUIZ GENERATE] Response text length: {len(response_text)} characters")
        logger.info(f"[QUIZ GENERATE] Response preview: {response_text[:200]}...")
        
        # Parse JSON
        logger.info(f"[QUIZ GENERATE] Parsing JSON response")
        quiz_data = parse_json_response(response_text, context="QUIZ GENERATE")
        
        logger.info(f"[QUIZ GENERATE] JSON parsed successfully")
        logger.info(f"[QUIZ GENERATE] Number of questions generated: {len(quiz_data)}")
        
        # Log each question
        for idx, q in enumerate(quiz_data):
            question_id = q.get('id', idx + 1)
            question_text = q.get('question', 'N/A')
            options_count = len(q.get('options', []))
            correct_answer = q.get('correct_answer', 'N/A')
            logger.info(f"[QUIZ GENERATE] Q{question_id}: {question_text[:80]}... ({options_count} options, correct: {correct_answer})")
        
        logger.info(f"[QUIZ GENERATE] Quiz generation completed successfully")
        logger.info("=" * 80)
        return quiz_data
        
    except HTTPException:
        # Re-raise HTTP exceptions from core utilities
        raise
    except Exception as e:
        logger.error("=" * 80)
        logger.error(f"[QUIZ GENERATE ERROR] Unexpected error: {str(e)}")
        logger.error("=" * 80)
        raise HTTPException(status_code=500, detail=f"Quiz generation failed: {str(e)}")

def generate_analysis(
    original_content: str,
    content_source: str,
    correct_answers: List[Dict[str, Any]],
    wrong_answers: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Generate analysis of quiz performance using Gemini AI with detailed logging
    
    Args:
        original_content: Original content that was used to generate the quiz
        content_source: Source type (text, url, pdf)
        correct_answers: List of questions answered correctly
        wrong_answers: List of questions answered incorrectly
        
    Returns:
        Analysis data as dictionary
        
    Raises:
        HTTPException: If analysis generation fails
    """
    logger.info("=" * 80)
    logger.info(f"[ANALYSIS GENERATE] Starting analysis generation")
    logger.info(f"[ANALYSIS GENERATE] Content source: {content_source}")
    logger.info(f"[ANALYSIS GENERATE] Correct answers: {len(correct_answers)}")
    logger.info(f"[ANALYSIS GENERATE] Wrong answers: {len(wrong_answers)}")
    
    # Truncate content if too long
    content_to_use = truncate_content(original_content, max_length=3000)
    
    # Build prompt
    logger.info(f"[ANALYSIS GENERATE] Building prompt for Gemini AI")
    prompt = get_analysis_prompt(content_to_use, correct_answers, wrong_answers)
    
    logger.info(f"[ANALYSIS GENERATE] Prompt length: {len(prompt)} characters")
    logger.info(f"[ANALYSIS GENERATE] Sending request to Gemini AI")
    
    try:
        # Generate content using Gemini
        response_text = generate_with_gemini(prompt, context="ANALYSIS GENERATE")
        
        logger.info(f"[ANALYSIS GENERATE] Response text length: {len(response_text)} characters")
        logger.info(f"[ANALYSIS GENERATE] Response preview: {response_text[:200]}...")
        
        # Parse JSON
        logger.info(f"[ANALYSIS GENERATE] Parsing JSON response")
        analysis_data = parse_json_response(response_text, context="ANALYSIS GENERATE")
        
        logger.info(f"[ANALYSIS GENERATE] JSON parsed successfully")
        logger.info(f"[ANALYSIS GENERATE] Analysis keys: {list(analysis_data.keys())}")
        logger.info(f"[ANALYSIS GENERATE] Topics to improve count: {len(analysis_data.get('topics_to_improve', []))}")
        logger.info(f"[ANALYSIS GENERATE] Strengths count: {len(analysis_data.get('strengths', []))}")
        logger.info(f"[ANALYSIS GENERATE] Recommendations count: {len(analysis_data.get('recommendations', []))}")
        logger.info(f"[ANALYSIS GENERATE] Analysis generation completed successfully")
        logger.info("=" * 80)
        return analysis_data
        
    except HTTPException:
        # Re-raise HTTP exceptions from core utilities
        raise
    except Exception as e:
        logger.error("=" * 80)
        logger.error(f"[ANALYSIS GENERATE ERROR] Unexpected error: {str(e)}")
        logger.error("=" * 80)
        raise HTTPException(status_code=500, detail=f"Analysis generation failed: {str(e)}")
