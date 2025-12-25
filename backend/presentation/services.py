"""
Business logic services for presentation generation
"""
import json
import re
from typing import List, Dict, Any
from fastapi import HTTPException
from logger import get_logger
from core.gemini_client import generate_with_gemini, parse_json_response
from presentation.prompts import get_outline_prompt, get_presentation_prompt

logger = get_logger(__name__)


def parse_outline_response(response_text: str) -> Dict[str, Any]:
    """
    Parse outline response to extract title and outline items
    
    Args:
        response_text: Raw response from AI
        
    Returns:
        Dictionary with title and outline list
    """
    logger.info("[PRESENTATION OUTLINE] Parsing outline response")
    
    # Extract title from XML tags
    title_match = re.search(r'<TITLE>(.*?)</TITLE>', response_text, re.DOTALL)
    if not title_match:
        logger.warning("[PRESENTATION OUTLINE] No title found in XML tags, extracting from content")
        title = "Untitled Presentation"
    else:
        title = title_match.group(1).strip()
    
    # Remove title XML tags from text
    outline_text = re.sub(r'<TITLE>.*?</TITLE>', '', response_text, flags=re.DOTALL).strip()
    
    # Split by markdown headers (# Topic)
    outline_items = []
    current_topic = None
    current_bullets = []
    
    for line in outline_text.split('\n'):
        line = line.strip()
        if not line:
            continue
            
        # Check if it's a header
        if line.startswith('# '):
            # Save previous topic if exists
            if current_topic:
                topic_content = f"{current_topic}\n" + "\n".join(current_bullets)
                outline_items.append(topic_content)
            
            # Start new topic
            current_topic = line
            current_bullets = []
        elif line.startswith('- '):
            current_bullets.append(line)
    
    # Add last topic
    if current_topic:
        topic_content = f"{current_topic}\n" + "\n".join(current_bullets)
        outline_items.append(topic_content)
    
    logger.info(f"[PRESENTATION OUTLINE] Extracted title: {title}")
    logger.info(f"[PRESENTATION OUTLINE] Extracted {len(outline_items)} outline items")
    
    return {
        "title": title,
        "outline": outline_items
    }


def generate_outline(
    topic: str,
    num_slides: int,
    language: str = "en-US"
) -> Dict[str, Any]:
    """
    Generate presentation outline from topic
    
    Args:
        topic: Presentation topic
        num_slides: Number of slides to generate
        language: Language code
        
    Returns:
        Dictionary with title and outline
    """
    logger.info("=" * 80)
    logger.info(f"[PRESENTATION OUTLINE] Starting outline generation")
    logger.info(f"[PRESENTATION OUTLINE] Topic: {topic}")
    logger.info(f"[PRESENTATION OUTLINE] Number of slides: {num_slides}")
    logger.info(f"[PRESENTATION OUTLINE] Language: {language}")
    
    # Build prompt
    prompt = get_outline_prompt(topic, num_slides, language)
    logger.info(f"[PRESENTATION OUTLINE] Prompt length: {len(prompt)} characters")
    
    try:
        # Generate outline using Gemini
        response_text = generate_with_gemini(prompt, context="PRESENTATION OUTLINE")
        
        logger.info(f"[PRESENTATION OUTLINE] Response length: {len(response_text)} characters")
        
        # Parse the outline response
        result = parse_outline_response(response_text)
        
        logger.info(f"[PRESENTATION OUTLINE] Outline generation completed successfully")
        logger.info("=" * 80)
        
        return {
            "success": True,
            "title": result["title"],
            "outline": result["outline"]
        }
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"[PRESENTATION OUTLINE ERROR] {error_msg}")
        logger.error("=" * 80)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate outline: {error_msg}"
        )


def generate_presentation(
    title: str,
    prompt: str,
    outline: List[str],
    language: str = "en-US",
    tone: str = "professional",
    theme: str = "default"
) -> Dict[str, Any]:
    """
    Generate full presentation with slides
    
    Args:
        title: Presentation title
        prompt: Original user prompt
        outline: List of outline topics
        language: Language code
        tone: Presentation tone
        theme: Visual theme
        
    Returns:
        Dictionary with presentation data
    """
    logger.info("=" * 80)
    logger.info(f"[PRESENTATION GENERATE] Starting presentation generation")
    logger.info(f"[PRESENTATION GENERATE] Title: {title}")
    logger.info(f"[PRESENTATION GENERATE] Number of outline items: {len(outline)}")
    logger.info(f"[PRESENTATION GENERATE] Language: {language}")
    logger.info(f"[PRESENTATION GENERATE] Tone: {tone}")
    logger.info(f"[PRESENTATION GENERATE] Theme: {theme}")
    
    # Build prompt
    presentation_prompt = get_presentation_prompt(title, prompt, outline, language, tone)
    logger.info(f"[PRESENTATION GENERATE] Prompt length: {len(presentation_prompt)} characters")
    
    try:
        # Generate presentation using Gemini
        response_text = generate_with_gemini(presentation_prompt, context="PRESENTATION GENERATE")
        
        logger.info(f"[PRESENTATION GENERATE] Response length: {len(response_text)} characters")
        
        # Parse JSON response
        slides_data = parse_json_response(response_text, context="PRESENTATION GENERATE")
        
        logger.info(f"[PRESENTATION GENERATE] Number of slides generated: {len(slides_data)}")
        
        # Log each slide
        for idx, slide in enumerate(slides_data):
            layout = slide.get('layout', 'N/A')
            section_layout = slide.get('section_layout', 'N/A')
            logger.info(f"[PRESENTATION GENERATE] Slide {idx + 1}: Layout={layout}, Position={section_layout}")
        
        logger.info(f"[PRESENTATION GENERATE] Presentation generation completed successfully")
        logger.info("=" * 80)
        
        return {
            "success": True,
            "title": title,
            "slides": slides_data,
            "theme": theme
        }
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"[PRESENTATION GENERATE ERROR] {error_msg}")
        logger.error("=" * 80)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate presentation: {error_msg}"
        )
