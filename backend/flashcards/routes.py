"""
API routes for flashcard operations
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from datetime import datetime
from logger import get_logger
from flashcards.services import generate_flashcards
from core.pdf_extractor import extract_text_from_pdf
from core.url_extractor import extract_text_from_url
from database import db, get_next_sequence
from auth.routes import get_current_user

logger = get_logger(__name__)

router = APIRouter()

class SaveFlashcardSetRequest(BaseModel):
    flashcards: List[Dict[str, Any]]
    original_content: str
    content_source: str
    num_cards: int
    words_per_card: int


@router.post("/generate")
async def generate_flashcard_set(
    text: Optional[str] = Form(None),
    url: Optional[str] = Form(None),
    pdf: Optional[UploadFile] = File(None),
    num_cards: int = Form(10),
    words_per_card: int = Form(35)
):
    """
    Generate flashcards from text, URL, or PDF with word limits
    """
    logger.info("=" * 80)
    logger.info(f"[FLASHCARD ROUTE] POST /generate endpoint called")
    logger.info(f"[FLASHCARD ROUTE] Parameters received:")
    logger.info(f"[FLASHCARD ROUTE]   - num_cards: {num_cards}")
    logger.info(f"[FLASHCARD ROUTE]   - words_per_card: {words_per_card}")
    logger.info(f"[FLASHCARD ROUTE]   - text provided: {'Yes' if text else 'No'} ({len(text) if text else 0} chars)")
    logger.info(f"[FLASHCARD ROUTE]   - url provided: {'Yes' if url else 'No'} ({url if url else 'N/A'})")
    logger.info(f"[FLASHCARD ROUTE]   - pdf provided: {'Yes' if pdf else 'No'} ({pdf.filename if pdf else 'N/A'})")
    
    try:
        content = ""
        source_type = None
        
        # Extract content based on source type
        if pdf:
            logger.info(f"[FLASHCARD ROUTE] Processing PDF source")
            source_type = "PDF"
            logger.info(f"[FLASHCARD ROUTE] PDF filename: {pdf.filename}")
            file_content = await pdf.read()
            logger.info(f"[FLASHCARD ROUTE] PDF file read: {len(file_content)} bytes")
            content = extract_text_from_pdf(file_content, pdf.filename)
        elif url:
            logger.info(f"[FLASHCARD ROUTE] Processing URL source")
            source_type = "URL"
            content = extract_text_from_url(url)
        elif text:
            logger.info(f"[FLASHCARD ROUTE] Processing text source")
            source_type = "TEXT"
            content = text
            logger.info(f"[FLASHCARD ROUTE] Text length: {len(content)} characters")
        else:
            logger.error(f"[FLASHCARD ROUTE ERROR] No input source provided")
            logger.info("=" * 80)
            raise HTTPException(status_code=400, detail="Please provide text, PDF, or URL")
        
        logger.info(f"[FLASHCARD ROUTE] Content extracted successfully from {source_type}")
        logger.info(f"[FLASHCARD ROUTE] Content length: {len(content)} characters")
        
        # Generate flashcards
        logger.info(f"[FLASHCARD ROUTE] Calling flashcard generation service")
        flashcards = generate_flashcards(
            content=content,
            num_cards=num_cards,
            words_per_card=words_per_card,
            source_type=source_type
        )
        
        logger.info(f"[FLASHCARD ROUTE] Flashcards generated successfully")
        logger.info(f"[FLASHCARD ROUTE] Returning {len(flashcards)} flashcards")
        logger.info(f"[FLASHCARD ROUTE] Also returning extracted content (length: {len(content)} chars)")
        logger.info("=" * 80)
        return {
            "flashcards": flashcards,
            "original_content": content,
            "content_source": source_type.lower()
        }
        
    except HTTPException as he:
        logger.error(f"[FLASHCARD ROUTE ERROR] HTTPException: {he.status_code} - {he.detail}")
        logger.info("=" * 80)
        raise
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        logger.error("=" * 80)
        logger.error(f"[FLASHCARD ROUTE ERROR] Unexpected error: {error_type} - {error_msg}")
        logger.info("=" * 80)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate flashcards: {error_msg[:200] if len(error_msg) > 200 else error_msg}"
        )


@router.post("/save")
async def save_flashcard_set(
    request: SaveFlashcardSetRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Save flashcard set to MongoDB with detailed logging
    """
    logger.info("=" * 80)
    logger.info(f"[SAVE FLASHCARD ROUTE] POST /save endpoint called")
    logger.info(f"[SAVE FLASHCARD ROUTE] User: {current_user.get('email')} (user_id: {current_user.get('user_id')})")
    logger.info(f"[SAVE FLASHCARD ROUTE] Flashcard data received:")
    logger.info(f"[SAVE FLASHCARD ROUTE]   - Total cards: {request.num_cards}")
    logger.info(f"[SAVE FLASHCARD ROUTE]   - Words per card: {request.words_per_card}")
    logger.info(f"[SAVE FLASHCARD ROUTE]   - Content source: {request.content_source}")
    
    try:
        # Generate flashcard_id
        flashcard_id = get_next_sequence("flashcards")
        logger.info(f"[SAVE FLASHCARD ROUTE] Generated flashcard_id: {flashcard_id}")
        
        # Prepare flashcard document
        flashcard_document = {
            "flashcard_id": flashcard_id,
            "user_id": current_user.get("user_id"),
            "user_email": current_user.get("email"),
            "flashcards": request.flashcards,
            "total_cards": len(request.flashcards),
            "num_cards_requested": request.num_cards,
            "words_per_card": request.words_per_card,
            "original_content": request.original_content[:5000],  # Store first 5000 chars
            "content_source": request.content_source,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        logger.info(f"[SAVE FLASHCARD ROUTE] Flashcard document prepared")
        logger.info(f"[SAVE FLASHCARD ROUTE] Inserting flashcard set into MongoDB collection 'flashcards'")
        
        # Insert into flashcards collection
        result = db["flashcards"].insert_one(flashcard_document)
        logger.info(f"[SAVE FLASHCARD ROUTE] Flashcard set inserted successfully with _id: {result.inserted_id}")
        logger.info(f"[SAVE FLASHCARD ROUTE] Flashcard set saved successfully")
        logger.info("=" * 80)
        
        return {
            "success": True,
            "flashcard_id": flashcard_id,
            "message": "Flashcard set saved successfully"
        }
        
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        logger.error("=" * 80)
        logger.error(f"[SAVE FLASHCARD ROUTE ERROR] Failed to save flashcard set")
        logger.error(f"[SAVE FLASHCARD ROUTE ERROR] Error type: {error_type}")
        logger.error(f"[SAVE FLASHCARD ROUTE ERROR] Error message: {error_msg}")
        logger.info("=" * 80)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save flashcard set: {error_msg[:200] if len(error_msg) > 200 else error_msg}"
        )


@router.get("/history")
async def get_flashcard_history(current_user: dict = Depends(get_current_user)):
    """
    Get flashcard history for the current user with detailed logging
    """
    logger.info("=" * 80)
    logger.info(f"[FLASHCARD HISTORY ROUTE] GET /history endpoint called")
    logger.info(f"[FLASHCARD HISTORY ROUTE] User: {current_user.get('email')} (user_id: {current_user.get('user_id')})")
    
    try:
        user_id = current_user.get("user_id")
        logger.info(f"[FLASHCARD HISTORY ROUTE] Querying flashcards for user_id: {user_id}")
        
        # Find all flashcard sets for this user, sorted by most recent first
        flashcard_sets = list(db["flashcards"].find(
            {"user_id": user_id},
            {"original_content": 0, "flashcards": 0}  # Exclude content to reduce payload
        ).sort("created_at", -1))
        
        logger.info(f"[FLASHCARD HISTORY ROUTE] Found {len(flashcard_sets)} flashcard sets for user")
        
        # Convert ObjectId to string for JSON serialization
        for fset in flashcard_sets:
            fset["_id"] = str(fset["_id"])
            if "created_at" in fset:
                fset["created_at"] = fset["created_at"].isoformat() if isinstance(fset["created_at"], datetime) else str(fset["created_at"])
            if "updated_at" in fset:
                fset["updated_at"] = fset["updated_at"].isoformat() if isinstance(fset["updated_at"], datetime) else str(fset["updated_at"])
        
        logger.info(f"[FLASHCARD HISTORY ROUTE] Returning {len(flashcard_sets)} flashcard sets")
        logger.info("=" * 80)
        
        return {
            "success": True,
            "flashcard_sets": flashcard_sets,
            "count": len(flashcard_sets)
        }
        
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        logger.error("=" * 80)
        logger.error(f"[FLASHCARD HISTORY ROUTE ERROR] Failed to retrieve flashcard history")
        logger.error(f"[FLASHCARD HISTORY ROUTE ERROR] Error type: {error_type}")
        logger.error(f"[FLASHCARD HISTORY ROUTE ERROR] Error message: {error_msg}")
        logger.info("=" * 80)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve flashcard history: {error_msg[:200] if len(error_msg) > 200 else error_msg}"
        )


@router.get("/history/{flashcard_id}")
async def get_flashcard_set_by_id(flashcard_id: int, current_user: dict = Depends(get_current_user)):
    """
    Get a specific flashcard set by ID for the current user with detailed logging
    """
    logger.info("=" * 80)
    logger.info(f"[FLASHCARD BY ID ROUTE] GET /history/{flashcard_id} endpoint called")
    logger.info(f"[FLASHCARD BY ID ROUTE] User: {current_user.get('email')} (user_id: {current_user.get('user_id')})")
    logger.info(f"[FLASHCARD BY ID ROUTE] Requested flashcard_id: {flashcard_id}")
    
    try:
        user_id = current_user.get("user_id")
        logger.info(f"[FLASHCARD BY ID ROUTE] Querying flashcard set with flashcard_id: {flashcard_id} for user_id: {user_id}")
        
        # Find the specific flashcard set
        flashcard_set = db["flashcards"].find_one({
            "flashcard_id": flashcard_id,
            "user_id": user_id
        })
        
        if not flashcard_set:
            logger.warning(f"[FLASHCARD BY ID ROUTE] Flashcard set not found: flashcard_id={flashcard_id}, user_id={user_id}")
            logger.info("=" * 80)
            raise HTTPException(status_code=404, detail="Flashcard set not found")
        
        logger.info(f"[FLASHCARD BY ID ROUTE] Flashcard set found successfully")
        
        # Convert ObjectId to string
        flashcard_set["_id"] = str(flashcard_set["_id"])
        if "created_at" in flashcard_set:
            flashcard_set["created_at"] = flashcard_set["created_at"].isoformat() if isinstance(flashcard_set["created_at"], datetime) else str(flashcard_set["created_at"])
        if "updated_at" in flashcard_set:
            flashcard_set["updated_at"] = flashcard_set["updated_at"].isoformat() if isinstance(flashcard_set["updated_at"], datetime) else str(flashcard_set["updated_at"])
        
        logger.info(f"[FLASHCARD BY ID ROUTE] Returning flashcard set with {flashcard_set.get('total_cards', 0)} cards")
        logger.info("=" * 80)
        
        return {
            "success": True,
            "flashcard_set": flashcard_set
        }
        
    except HTTPException:
        raise
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        logger.error("=" * 80)
        logger.error(f"[FLASHCARD BY ID ROUTE ERROR] Failed to retrieve flashcard set")
        logger.error(f"[FLASHCARD BY ID ROUTE ERROR] Error type: {error_type}")
        logger.error(f"[FLASHCARD BY ID ROUTE ERROR] Error message: {error_msg}")
        logger.info("=" * 80)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve flashcard set: {error_msg[:200] if len(error_msg) > 200 else error_msg}"
        )
