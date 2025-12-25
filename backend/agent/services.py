"""
Tool execution services for the agent
Wraps existing tool services to be called by the agent
"""
from typing import Dict, Any, Optional
from fastapi import HTTPException
from logger import get_logger
from explainer.services import generate_explanation
from quiz.services import generate_quiz_from_content
from flashcards.services import generate_flashcards
from workflow.services import generate_workflow
from core.pdf_extractor import extract_text_from_pdf
from core.url_extractor import extract_text_from_url
from database import db

logger = get_logger(__name__)

async def execute_explain_content(
    text: Optional[str] = None,
    url: Optional[str] = None,
    pdf_bytes: Optional[bytes] = None,
    pdf_filename: Optional[str] = None,
    complexity: str = "medium",
    user_profile: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Execute explain_content tool"""
    logger.info(f"[AGENT TOOL] Executing explain_content: text={bool(text)}, url={bool(url)}, pdf={bool(pdf_bytes)}")
    
    content = ""
    source_type = None
    
    if pdf_bytes:
        source_type = "PDF"
        content = extract_text_from_pdf(pdf_bytes, pdf_filename or "document.pdf")
    elif url:
        source_type = "URL"
        content = extract_text_from_url(url)
    elif text:
        source_type = "TEXT"
        content = text
        
        # If text is too short, it might be a topic request - generate content about it
        if len(content) < 200:
            logger.info(f"[AGENT TOOL] Text is short ({len(content)} chars), might be a topic request. Generating content...")
            # Check if it looks like a topic request (not actual content)
            if not any(char in content for char in ['.', '!', '?', '\n']) and len(content.split()) < 20:
                # This looks like a topic request - generate comprehensive content about it
                from core.gemini_client import generate_with_gemini
                topic_prompt = f"""Generate a comprehensive, detailed explanation about the following topic. Write at least 500 words covering:
- Definition and overview
- Key concepts and components
- How it works
- Applications and examples
- Important details

Topic: {content}

Write the content as if it were an educational article or textbook section. Do not include any markdown formatting, just plain text."""
                
                try:
                    generated_content = generate_with_gemini(topic_prompt, context="AGENT_CONTENT_GEN")
                    if generated_content and len(generated_content) > 200:
                        logger.info(f"[AGENT TOOL] Generated {len(generated_content)} characters of content about the topic")
                        content = generated_content
                    else:
                        logger.warning(f"[AGENT TOOL] Generated content too short, using original text")
                except Exception as e:
                    logger.error(f"[AGENT TOOL] Failed to generate content about topic: {e}")
                    # Continue with original text, will fail validation below
    else:
        raise HTTPException(status_code=400, detail="No content provided (text, url, or pdf required)")
    
    if not content or len(content) < 50:
        raise HTTPException(status_code=400, detail="Content too short. Minimum 50 characters required.")
    
    explanation = generate_explanation(
        content=content,
        complexity=complexity,
        source_type=source_type,
        user_profile=user_profile
    )
    
    # Add metadata
    explanation["original_content"] = content
    explanation["content_source"] = source_type.lower()
    
    logger.info(f"[AGENT TOOL] explain_content completed successfully")
    return explanation

async def execute_generate_quiz(
    content: str,
    num_questions: int = 10,
    difficulty: str = "medium",
    user_profile: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Execute generate_quiz tool"""
    logger.info(f"[AGENT TOOL] Executing generate_quiz: num_questions={num_questions}, difficulty={difficulty}")
    
    if not content or len(content) < 50:
        raise HTTPException(status_code=400, detail="Content too short for quiz generation")
    
    questions = generate_quiz_from_content(
        content=content,
        num_questions=num_questions,
        difficulty=difficulty.capitalize(),
        source_type="TEXT"
    )
    
    result = {
        "quiz": questions,
        "num_questions": len(questions),
        "difficulty": difficulty
    }
    
    logger.info(f"[AGENT TOOL] generate_quiz completed: {len(questions)} questions generated")
    return result

async def execute_generate_flashcards(
    content: str,
    num_cards: int = 10,
    words_per_card: int = 35,
    user_profile: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Execute generate_flashcards tool"""
    logger.info(f"[AGENT TOOL] Executing generate_flashcards: num_cards={num_cards}, words_per_card={words_per_card}")
    
    if not content or len(content) < 50:
        raise HTTPException(status_code=400, detail="Content too short for flashcard generation")
    
    flashcards = generate_flashcards(
        content=content,
        num_cards=num_cards,
        words_per_card=words_per_card,
        source_type="TEXT"
    )
    
    result = {
        "flashcards": flashcards,
        "num_cards": len(flashcards),
        "words_per_card": words_per_card
    }
    
    logger.info(f"[AGENT TOOL] generate_flashcards completed: {len(flashcards)} cards generated")
    return result

async def execute_generate_workflow(
    content: str,
    user_profile: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Execute generate_workflow tool"""
    logger.info(f"[AGENT TOOL] Executing generate_workflow")
    
    if not content or len(content) < 50:
        raise HTTPException(status_code=400, detail="Content too short for workflow generation")
    
    workflow_result = generate_workflow(content)
    
    result = {
        "mermaid_code": workflow_result.get("mermaid_code", ""),
        "original_content": workflow_result.get("original_content", content),
        "content_source": workflow_result.get("content_source", "text")
    }
    
    logger.info(f"[AGENT TOOL] generate_workflow completed")
    return result

