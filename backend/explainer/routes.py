"""
API routes for explainer operations
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Body, Depends
from typing import Optional
from logger import get_logger
from explainer.services import generate_explanation, generate_chat_response
from explainer.schemas import ExplainerChatRequest, ExplainerChatResponse
from core.pdf_extractor import extract_text_from_pdf
from core.url_extractor import extract_text_from_url
from auth.routes import get_current_user
from database import db

logger = get_logger(__name__)

router = APIRouter()


@router.post("/generate")
async def generate_explainer(
    text: Optional[str] = Form(None),
    url: Optional[str] = Form(None),
    pdf: Optional[UploadFile] = File(None),
    complexity: str = Form("medium"),
    current_user: dict = Depends(get_current_user)
):
    """
    Generate detailed explanation from text, URL, or PDF
    """
    logger.info("=" * 80)
    logger.info(f"[EXPLAINER ROUTE] POST /generate endpoint called")
    logger.info(f"[EXPLAINER ROUTE] Parameters received:")
    logger.info(f"[EXPLAINER ROUTE]   - complexity: {complexity}")
    logger.info(f"[EXPLAINER ROUTE]   - text provided: {'Yes' if text else 'No'}")
    logger.info(f"[EXPLAINER ROUTE]   - url provided: {'Yes' if url else 'No'}")
    logger.info(f"[EXPLAINER ROUTE]   - pdf provided: {'Yes' if pdf else 'No'}")
    
    try:
        content = ""
        source_type = None
        
        # Extract content based on source type
        if pdf:
            logger.info(f"[EXPLAINER ROUTE] Processing PDF source")
            source_type = "PDF"
            file_content = await pdf.read()
            content = extract_text_from_pdf(file_content, pdf.filename)
        elif url:
            logger.info(f"[EXPLAINER ROUTE] Processing URL source")
            source_type = "URL"
            content = extract_text_from_url(url)
        elif text:
            logger.info(f"[EXPLAINER ROUTE] Processing text source")
            source_type = "TEXT"
            content = text
        else:
            logger.error(f"[EXPLAINER ROUTE ERROR] No input source provided")
            logger.info("=" * 80)
            raise HTTPException(status_code=400, detail="Please provide text, PDF, or URL")
        
        logger.info(f"[EXPLAINER ROUTE] Content extracted from {source_type}")
        logger.info(f"[EXPLAINER ROUTE] Content length: {len(content)} characters")
        
        # Get user profile for personalized explanation
        user_profile = None
        try:
            user_email = current_user.get("email")
            user_data = db["users"].find_one({"email": user_email})
            if user_data:
                user_profile = {
                    "learner_type": user_data.get("learner_type"),
                    "age_group": user_data.get("age_group"),
                    "preferred_learning_style": user_data.get("preferred_learning_style"),
                    "education_level": user_data.get("education_level"),
                    "learning_goals": user_data.get("learning_goals", []),
                    "interests": user_data.get("interests", [])
                }
                logger.info(f"[EXPLAINER ROUTE] User profile loaded: learner_type={user_profile.get('learner_type')}, age_group={user_profile.get('age_group')}")
        except Exception as e:
            logger.warning(f"[EXPLAINER ROUTE] Could not load user profile: {e}")
        
        # Generate explanation
        logger.info(f"[EXPLAINER ROUTE] Calling explanation service")
        explanation_data = generate_explanation(
            content=content,
            complexity=complexity,
            source_type=source_type,
            user_profile=user_profile
        )
        
        logger.info(f"[EXPLAINER ROUTE] Explanation generated successfully")
        logger.info("=" * 80)
        
        # Add metadata
        explanation_data["original_content"] = content
        explanation_data["content_source"] = source_type.lower()
        
        return explanation_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("=" * 80)
        logger.error(f"[EXPLAINER ROUTE ERROR] Unexpected error: {str(e)}")
        logger.error("=" * 80)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat", response_model=ExplainerChatResponse)
async def explainer_chat(
    request: ExplainerChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Handle chat questions about explained content
    """
    logger.info("=" * 80)
    logger.info(f"[EXPLAINER CHAT ROUTE] POST /chat endpoint called")
    logger.info(f"[EXPLAINER CHAT ROUTE] Question: {request.question[:100]}")
    logger.info(f"[EXPLAINER CHAT ROUTE] Chat history length: {len(request.chat_history)} messages")
    logger.info(f"[EXPLAINER CHAT ROUTE] Explainer content length: {len(request.explainer_content)} characters")
    
    # Get user profile for personalized chat
    user_profile = None
    try:
        user_email = current_user.get("email")
        user_data = db["users"].find_one({"email": user_email})
        if user_data:
            user_profile = {
                "learner_type": user_data.get("learner_type"),
                "age_group": user_data.get("age_group"),
                "preferred_learning_style": user_data.get("preferred_learning_style"),
                "education_level": user_data.get("education_level"),
                "learning_goals": user_data.get("learning_goals", []),
                "interests": user_data.get("interests", [])
            }
            logger.info(f"[EXPLAINER CHAT ROUTE] User profile loaded: learner_type={user_profile.get('learner_type')}, age_group={user_profile.get('age_group')}")
    except Exception as e:
        logger.warning(f"[EXPLAINER CHAT ROUTE] Could not load user profile: {e}")
    
    # Validate request
    if not request.question or not request.question.strip():
        logger.error(f"[EXPLAINER CHAT ROUTE ERROR] Empty question")
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    
    if not request.explainer_content:
        logger.error(f"[EXPLAINER CHAT ROUTE ERROR] Empty explainer content")
        raise HTTPException(status_code=400, detail="Explainer content is required")
    
    try:
        # Convert chat history to dict format
        chat_history = []
        for msg in request.chat_history:
            if isinstance(msg, dict):
                chat_history.append(msg)
            else:
                chat_history.append(msg.dict() if hasattr(msg, 'dict') else {"role": getattr(msg, 'role', 'user'), "content": getattr(msg, 'content', '')})
        
        logger.info(f"[EXPLAINER CHAT ROUTE] Processing chat with {len(chat_history)} history messages")
        
        chat_response = generate_chat_response(
            explainer_content=request.explainer_content,
            chat_history=chat_history,
            question=request.question.strip(),
            user_profile=user_profile
        )
        
        logger.info(f"[EXPLAINER CHAT ROUTE] Chat response generated successfully")
        logger.info(f"[EXPLAINER CHAT ROUTE] Answer length: {len(chat_response.get('answer', ''))} characters")
        logger.info("=" * 80)
        
        return ExplainerChatResponse(**chat_response)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("=" * 80)
        logger.error(f"[EXPLAINER CHAT ROUTE ERROR] {type(e).__name__}: {str(e)}")
        logger.error("=" * 80, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Chat response failed: {str(e)}")
