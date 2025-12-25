"""
API routes for presentation generation
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import Dict, Any, List
from datetime import datetime
from logger import get_logger
from database import db, get_next_sequence
from auth.routes import get_current_user
from presentation.schemas import (
    OutlineRequest,
    OutlineResponse,
    PresentationRequest,
    PresentationResponse
)
from presentation.services import generate_outline, generate_presentation
from presentation.pptx_generator import create_pptx
from pydantic import BaseModel

logger = get_logger(__name__)

router = APIRouter(prefix="/presentation", tags=["Presentation"])


@router.post("/outline", response_model=OutlineResponse)
async def create_outline(request: OutlineRequest) -> Dict[str, Any]:
    """
    Generate presentation outline from a topic
    
    Args:
        request: OutlineRequest with topic, num_slides, and language
        
    Returns:
        OutlineResponse with title and outline items
    """
    logger.info("=" * 80)
    logger.info(f"[PRESENTATION API] Received outline request")
    logger.info(f"[PRESENTATION API] Topic: {request.prompt}")
    logger.info(f"[PRESENTATION API] Num Slides: {request.num_slides}")
    logger.info(f"[PRESENTATION API] Language: {request.language}")
    
    try:
        result = generate_outline(
            topic=request.prompt,
            num_slides=request.num_slides,
            language=request.language
        )
        
        logger.info(f"[PRESENTATION API] Successfully generated outline")
        logger.info("=" * 80)
        
        return result
        
    except HTTPException as e:
        logger.error(f"[PRESENTATION API ERROR] HTTPException: {e.detail}")
        logger.error("=" * 80)
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error(f"[PRESENTATION API ERROR] Unexpected error: {error_msg}")
        logger.error("=" * 80)
        raise HTTPException(status_code=500, detail=f"Internal server error: {error_msg}")


@router.post("/generate", response_model=PresentationResponse)
async def create_presentation(
    request: PresentationRequest,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Generate full presentation with slides and save to MongoDB
    
    Args:
        request: PresentationRequest with title, prompt, outline, etc.
        
    Returns:
        PresentationResponse with slides data
    """
    logger.info("=" * 80)
    logger.info(f"[PRESENTATION API] Received presentation generation request")
    logger.info(f"[PRESENTATION API] User: {current_user.get('email')} (user_id: {current_user.get('user_id')})")
    logger.info(f"[PRESENTATION API] Title: {request.title}")
    logger.info(f"[PRESENTATION API] Outline items: {len(request.outline)}")
    logger.info(f"[PRESENTATION API] Language: {request.language}")
    logger.info(f"[PRESENTATION API] Tone: {request.tone}")
    logger.info(f"[PRESENTATION API] Theme: {request.theme}")
    
    try:
        result = generate_presentation(
            title=request.title,
            prompt=request.prompt,
            outline=request.outline,
            language=request.language,
            tone=request.tone,
            theme=request.theme
        )
        
        # Save to MongoDB
        try:
            ppt_id = get_next_sequence("presentations")
            logger.info(f"[PRESENTATION API] Generated ppt_id: {ppt_id}")
            
            ppt_document = {
                "ppt_id": ppt_id,
                "user_id": current_user.get("user_id"),
                "user_email": current_user.get("email"),
                "title": request.title,
                "topic": request.prompt[:1000],  # Store first 1000 chars
                "slides": result["slides"],
                "num_slides": len(result["slides"]),
                "language": request.language,
                "tone": request.tone,
                "theme": request.theme,
                "outline": request.outline,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            db_result = db["presentations"].insert_one(ppt_document)
            logger.info(f"[PRESENTATION API] Saved to MongoDB with _id: {db_result.inserted_id}")
            
            # Add ppt_id to response
            result["ppt_id"] = ppt_id
            
        except Exception as db_error:
            logger.error(f"[PRESENTATION API WARNING] Failed to save to MongoDB: {str(db_error)}")
            # Continue even if DB save fails
        
        logger.info(f"[PRESENTATION API] Successfully generated presentation")
        logger.info("=" * 80)
        
        return result
        
    except HTTPException as e:
        logger.error(f"[PRESENTATION API ERROR] HTTPException: {e.detail}")
        logger.error("=" * 80)
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error(f"[PRESENTATION API ERROR] Unexpected error: {error_msg}")
        logger.error("=" * 80)
        raise HTTPException(status_code=500, detail=f"Internal server error: {error_msg}")


class DownloadRequest(BaseModel):
    title: str
    slides: List[Dict[str, Any]]
    theme: str = "default"
    font: str = "Inter"


@router.post("/download")
async def download_presentation(request: DownloadRequest):
    """
    Download presentation as PPTX file
    
    Args:
        request: DownloadRequest with title, slides, and theme
        
    Returns:
        StreamingResponse with PPTX file
    """
    logger.info("=" * 80)
    logger.info(f"[PRESENTATION API] Received download request")
    logger.info(f"[PRESENTATION API] Title: {request.title}")
    logger.info(f"[PRESENTATION API] Slides: {len(request.slides)}")
    logger.info(f"[PRESENTATION API] Theme: {request.theme}")
    logger.info(f"[PRESENTATION API] Font: {request.font}")
    
    try:
        pptx_file = create_pptx(
            title=request.title,
            slides=request.slides,
            theme=request.theme,
            font=request.font
        )
        
        filename = f"{request.title.replace(' ', '_')}.pptx"
        
        logger.info(f"[PRESENTATION API] Successfully generated PPTX: {filename}")
        logger.info("=" * 80)
        
        return StreamingResponse(
            pptx_file,
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"[PRESENTATION API ERROR] Download failed: {error_msg}")
        logger.error("=" * 80)
        raise HTTPException(status_code=500, detail=f"Failed to generate PPTX: {error_msg}")


@router.get("/history")
async def get_presentation_history(current_user: dict = Depends(get_current_user)):
    """
    Get presentation history for the current user
    """
    logger.info("=" * 80)
    logger.info(f"[PRESENTATION HISTORY] GET /history endpoint called")
    logger.info(f"[PRESENTATION HISTORY] User: {current_user.get('email')} (user_id: {current_user.get('user_id')})")
    
    try:
        user_id = current_user.get("user_id")
        logger.info(f"[PRESENTATION HISTORY] Querying presentations for user_id: {user_id}")
        
        # Find all presentations for this user, sorted by most recent first
        presentations = list(db["presentations"].find(
            {"user_id": user_id}
        ).sort("created_at", -1))
        
        logger.info(f"[PRESENTATION HISTORY] Found {len(presentations)} presentations for user")
        
        # Convert ObjectId to string for JSON serialization
        for ppt in presentations:
            ppt["_id"] = str(ppt["_id"])
            if "created_at" in ppt:
                ppt["created_at"] = ppt["created_at"].isoformat() if isinstance(ppt["created_at"], datetime) else str(ppt["created_at"])
            if "updated_at" in ppt:
                ppt["updated_at"] = ppt["updated_at"].isoformat() if isinstance(ppt["updated_at"], datetime) else str(ppt["updated_at"])
        
        logger.info(f"[PRESENTATION HISTORY] Returning {len(presentations)} presentations")
        logger.info("=" * 80)
        
        return {
            "success": True,
            "presentations": presentations,
            "count": len(presentations)
        }
        
    except Exception as e:
        error_msg = str(e)
        logger.error("=" * 80)
        logger.error(f"[PRESENTATION HISTORY ERROR] Failed to retrieve history")
        logger.error(f"[PRESENTATION HISTORY ERROR] Error: {error_msg}")
        logger.error("=" * 80)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve presentation history: {error_msg}"
        )


@router.get("/history/{ppt_id}")
async def get_presentation_by_id(
    ppt_id: int,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific presentation by ID
    """
    logger.info("=" * 80)
    logger.info(f"[PRESENTATION BY ID] GET /history/{ppt_id} endpoint called")
    logger.info(f"[PRESENTATION BY ID] User: {current_user.get('email')}")
    
    try:
        user_id = current_user.get("user_id")
        
        # Find presentation by ppt_id and user_id
        presentation = db["presentations"].find_one({
            "ppt_id": ppt_id,
            "user_id": user_id
        })
        
        if not presentation:
            logger.error(f"[PRESENTATION BY ID] Presentation {ppt_id} not found for user")
            logger.error("=" * 80)
            raise HTTPException(status_code=404, detail="Presentation not found")
        
        # Convert ObjectId to string
        presentation["_id"] = str(presentation["_id"])
        if "created_at" in presentation:
            presentation["created_at"] = presentation["created_at"].isoformat() if isinstance(presentation["created_at"], datetime) else str(presentation["created_at"])
        if "updated_at" in presentation:
            presentation["updated_at"] = presentation["updated_at"].isoformat() if isinstance(presentation["updated_at"], datetime) else str(presentation["updated_at"])
        
        logger.info(f"[PRESENTATION BY ID] Found presentation {ppt_id}")
        logger.info("=" * 80)
        
        return {
            "success": True,
            "presentation": presentation
        }
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error("=" * 80)
        logger.error(f"[PRESENTATION BY ID ERROR] Error: {error_msg}")
        logger.error("=" * 80)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve presentation: {error_msg}"
        )
