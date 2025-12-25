"""
API routes for explainer operations
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Body
from typing import Optional
from logger import get_logger
from explainer.services import generate_explanation, generate_chat_response
from explainer.schemas import ExplainerChatRequest, ExplainerChatResponse
from core.pdf_extractor import extract_text_from_pdf
from core.url_extractor import extract_text_from_url

logger = get_logger(__name__)

router = APIRouter()


@router.post("/generate")
async def generate_explainer(
    text: Optional[str] = Form(None),
    url: Optional[str] = Form(None),
    pdf: Optional[UploadFile] = File(None),
    complexity: str = Form("medium")
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
        
        # Generate explanation
        logger.info(f"[EXPLAINER ROUTE] Calling explanation service")
        explanation_data = generate_explanation(
            content=content,
            complexity=complexity,
            source_type=source_type
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
async def explainer_chat(request: ExplainerChatRequest):
    """
    Handle chat questions about explained content
    """
    logger.info("=" * 80)
    logger.info(f"[EXPLAINER CHAT ROUTE] POST /chat endpoint called")
    logger.info(f"[EXPLAINER CHAT ROUTE] Question: {request.question[:100]}")
    
    try:
        chat_response = generate_chat_response(
            explainer_content=request.explainer_content,
            chat_history=[msg.dict() for msg in request.chat_history],
            question=request.question
        )
        
        logger.info(f"[EXPLAINER CHAT ROUTE] Chat response generated")
        logger.info("=" * 80)
        
        return ExplainerChatResponse(**chat_response)
        
    except Exception as e:
        logger.error("=" * 80)
        logger.error(f"[EXPLAINER CHAT ROUTE ERROR] {str(e)}")
        logger.error("=" * 80)
        raise HTTPException(status_code=500, detail=str(e))
