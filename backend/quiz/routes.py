"""
API routes for quiz operations
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from datetime import datetime
from logger import get_logger
from quiz.services import generate_quiz_from_content, generate_analysis
from core.pdf_extractor import extract_text_from_pdf
from core.url_extractor import extract_text_from_url
from core.validators import validate_content
from database import db, get_next_sequence
from auth.routes import get_current_user

logger = get_logger(__name__)

router = APIRouter()

class AnalysisRequest(BaseModel):
    original_content: str  # Extracted text content
    content_source: str  # "text", "url", or "pdf"
    correct_answers: List[Dict[str, Any]]
    wrong_answers: List[Dict[str, Any]]

class SaveQuizRequest(BaseModel):
    questions: List[Dict[str, Any]]
    user_answers: List[Dict[str, Any]]
    score: int
    total_questions: int
    original_content: str
    content_source: str
    difficulty: str
    analysis: Optional[Dict[str, Any]] = None

@router.post("/generate")
async def generate_quiz(
    text: Optional[str] = Form(None),
    url: Optional[str] = Form(None),
    pdf: Optional[UploadFile] = File(None),
    num_questions: int = Form(...),
    difficulty: str = Form(...)
):
    """
    Generate quiz questions from text, URL, or PDF with detailed logging
    """
    logger.info("=" * 80)
    logger.info(f"[QUIZ ROUTE] POST /generate endpoint called")
    logger.info(f"[QUIZ ROUTE] Parameters received:")
    logger.info(f"[QUIZ ROUTE]   - num_questions: {num_questions}")
    logger.info(f"[QUIZ ROUTE]   - difficulty: {difficulty}")
    logger.info(f"[QUIZ ROUTE]   - text provided: {'Yes' if text else 'No'} ({len(text) if text else 0} chars)")
    logger.info(f"[QUIZ ROUTE]   - url provided: {'Yes' if url else 'No'} ({url if url else 'N/A'})")
    logger.info(f"[QUIZ ROUTE]   - pdf provided: {'Yes' if pdf else 'No'} ({pdf.filename if pdf else 'N/A'})")
    
    try:
        content = ""
        source_type = None
        
        # Extract content based on source type
        if pdf:
            logger.info(f"[QUIZ ROUTE] Processing PDF source")
            source_type = "PDF"
            logger.info(f"[QUIZ ROUTE] PDF filename: {pdf.filename}")
            logger.info(f"[QUIZ ROUTE] PDF content type: {pdf.content_type}")
            file_content = await pdf.read()
            logger.info(f"[QUIZ ROUTE] PDF file read: {len(file_content)} bytes")
            content = extract_text_from_pdf(file_content, pdf.filename)
        elif url:
            logger.info(f"[QUIZ ROUTE] Processing URL source")
            source_type = "URL"
            content = extract_text_from_url(url)
        elif text:
            logger.info(f"[QUIZ ROUTE] Processing text source")
            source_type = "TEXT"
            content = text
            logger.info(f"[QUIZ ROUTE] Text length: {len(content)} characters")
        else:
            logger.error(f"[QUIZ ROUTE ERROR] No input source provided")
            logger.info("=" * 80)
            raise HTTPException(status_code=400, detail="Please provide text, PDF, or URL")
        
        logger.info(f"[QUIZ ROUTE] Content extracted successfully from {source_type}")
        logger.info(f"[QUIZ ROUTE] Content length: {len(content)} characters")
        
        # Generate quiz
        logger.info(f"[QUIZ ROUTE] Calling quiz generation service")
        quiz_data = generate_quiz_from_content(
            content=content,
            num_questions=num_questions,
            difficulty=difficulty,
            source_type=source_type
        )
        
        logger.info(f"[QUIZ ROUTE] Quiz generated successfully")
        logger.info(f"[QUIZ ROUTE] Returning {len(quiz_data)} questions")
        logger.info(f"[QUIZ ROUTE] Also returning extracted content for analysis (length: {len(content)} chars)")
        logger.info("=" * 80)
        return {
            "quiz": quiz_data,
            "extracted_content": content,
            "content_source": source_type.lower()
        }
        
    except HTTPException as he:
        logger.error(f"[QUIZ ROUTE ERROR] HTTPException: {he.status_code} - {he.detail}")
        logger.info("=" * 80)
        raise
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        logger.error("=" * 80)
        logger.error(f"[QUIZ ROUTE ERROR] Unexpected error: {error_type} - {error_msg}")
        logger.info("=" * 80)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate quiz: {error_msg[:200] if len(error_msg) > 200 else error_msg}"
        )

@router.post("/analyze")
async def analyze_quiz_performance(request: AnalysisRequest):
    """
    Analyze quiz performance and provide recommendations with detailed logging
    """
    logger.info("=" * 80)
    logger.info(f"[ANALYSIS ROUTE] POST /analyze endpoint called")
    logger.info(f"[ANALYSIS ROUTE] Parameters received:")
    logger.info(f"[ANALYSIS ROUTE]   - content_source: {request.content_source}")
    logger.info(f"[ANALYSIS ROUTE]   - original_content length: {len(request.original_content)} characters")
    logger.info(f"[ANALYSIS ROUTE]   - correct_answers count: {len(request.correct_answers)}")
    logger.info(f"[ANALYSIS ROUTE]   - wrong_answers count: {len(request.wrong_answers)}")
    
    try:
        # Log correct answers details
        for idx, q in enumerate(request.correct_answers):
            logger.info(f"[ANALYSIS ROUTE] Correct Q{q.get('id', idx+1)}: {q.get('question', 'N/A')[:60]}...")
        
        # Log wrong answers details
        for idx, q in enumerate(request.wrong_answers):
            logger.info(f"[ANALYSIS ROUTE] Wrong Q{q.get('id', idx+1)}: {q.get('question', 'N/A')[:60]}... (User: {q.get('user_answer', 'N/A')})")
        
        logger.info(f"[ANALYSIS ROUTE] Calling analysis generation service")
        analysis_data = generate_analysis(
            original_content=request.original_content,
            content_source=request.content_source,
            correct_answers=request.correct_answers,
            wrong_answers=request.wrong_answers
        )
        
        logger.info(f"[ANALYSIS ROUTE] Analysis generated successfully")
        logger.info(f"[ANALYSIS ROUTE] Returning analysis data")
        logger.info("=" * 80)
        return analysis_data
        
    except HTTPException as he:
        logger.error(f"[ANALYSIS ROUTE ERROR] HTTPException: {he.status_code} - {he.detail}")
        logger.info("=" * 80)
        raise
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        logger.error("=" * 80)
        logger.error(f"[ANALYSIS ROUTE ERROR] Unexpected error: {error_type} - {error_msg}")
        logger.info("=" * 80)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate analysis: {error_msg[:200] if len(error_msg) > 200 else error_msg}"
        )

@router.post("/save")
async def save_quiz(
    request: SaveQuizRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Save quiz results to MongoDB with detailed logging
    """
    logger.info("=" * 80)
    logger.info(f"[SAVE QUIZ ROUTE] POST /save endpoint called")
    logger.info(f"[SAVE QUIZ ROUTE] User: {current_user.get('email')} (user_id: {current_user.get('user_id')})")
    logger.info(f"[SAVE QUIZ ROUTE] Quiz data received:")
    logger.info(f"[SAVE QUIZ ROUTE]   - Total questions: {request.total_questions}")
    logger.info(f"[SAVE QUIZ ROUTE]   - Score: {request.score}")
    logger.info(f"[SAVE QUIZ ROUTE]   - Difficulty: {request.difficulty}")
    logger.info(f"[SAVE QUIZ ROUTE]   - Content source: {request.content_source}")
    logger.info(f"[SAVE QUIZ ROUTE]   - Has analysis: {'Yes' if request.analysis else 'No'}")
    
    try:
        # Generate quiz_id
        quiz_id = get_next_sequence("quizzes")
        logger.info(f"[SAVE QUIZ ROUTE] Generated quiz_id: {quiz_id}")
        
        # Prepare quiz document
        quiz_document = {
            "quiz_id": quiz_id,
            "user_id": current_user.get("user_id"),
            "user_email": current_user.get("email"),
            "questions": request.questions,
            "user_answers": request.user_answers,
            "score": request.score,
            "total_questions": request.total_questions,
            "percentage": round((request.score / request.total_questions) * 100, 2),
            "original_content": request.original_content[:5000],  # Store first 5000 chars
            "content_source": request.content_source,
            "difficulty": request.difficulty,
            "analysis": request.analysis,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        logger.info(f"[SAVE QUIZ ROUTE] Quiz document prepared")
        logger.info(f"[SAVE QUIZ ROUTE] Inserting quiz into MongoDB collection 'quizzes'")
        
        # Insert into quizzes collection
        result = db["quizzes"].insert_one(quiz_document)
        logger.info(f"[SAVE QUIZ ROUTE] Quiz inserted successfully with _id: {result.inserted_id}")
        logger.info(f"[SAVE QUIZ ROUTE] Quiz saved successfully")
        logger.info("=" * 80)
        
        return {
            "success": True,
            "quiz_id": quiz_id,
            "message": "Quiz saved successfully"
        }
        
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        logger.error("=" * 80)
        logger.error(f"[SAVE QUIZ ROUTE ERROR] Failed to save quiz")
        logger.error(f"[SAVE QUIZ ROUTE ERROR] Error type: {error_type}")
        logger.error(f"[SAVE QUIZ ROUTE ERROR] Error message: {error_msg}")
        logger.info("=" * 80)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save quiz: {error_msg[:200] if len(error_msg) > 200 else error_msg}"
        )

@router.get("/history")
async def get_quiz_history(current_user: dict = Depends(get_current_user)):
    """
    Get quiz history for the current user with detailed logging
    """
    logger.info("=" * 80)
    logger.info(f"[QUIZ HISTORY ROUTE] GET /history endpoint called")
    logger.info(f"[QUIZ HISTORY ROUTE] User: {current_user.get('email')} (user_id: {current_user.get('user_id')})")
    
    try:
        user_id = current_user.get("user_id")
        logger.info(f"[QUIZ HISTORY ROUTE] Querying quizzes for user_id: {user_id}")
        
        # Find all quizzes for this user, sorted by most recent first
        quizzes = list(db["quizzes"].find(
            {"user_id": user_id},
            {"original_content": 0}  # Exclude original_content to reduce payload size
        ).sort("created_at", -1))
        
        logger.info(f"[QUIZ HISTORY ROUTE] Found {len(quizzes)} quizzes for user")
        
        # Convert ObjectId to string for JSON serialization and add has_analysis flag
        for quiz in quizzes:
            quiz["_id"] = str(quiz["_id"])
            quiz["has_analysis"] = quiz.get("analysis") is not None and len(quiz.get("analysis", {})) > 0
            if "created_at" in quiz:
                quiz["created_at"] = quiz["created_at"].isoformat() if isinstance(quiz["created_at"], datetime) else str(quiz["created_at"])
            if "updated_at" in quiz:
                quiz["updated_at"] = quiz["updated_at"].isoformat() if isinstance(quiz["updated_at"], datetime) else str(quiz["updated_at"])
        
        logger.info(f"[QUIZ HISTORY ROUTE] Returning {len(quizzes)} quizzes")
        logger.info("=" * 80)
        
        return {
            "success": True,
            "quizzes": quizzes,
            "count": len(quizzes)
        }
        
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        logger.error("=" * 80)
        logger.error(f"[QUIZ HISTORY ROUTE ERROR] Failed to retrieve quiz history")
        logger.error(f"[QUIZ HISTORY ROUTE ERROR] Error type: {error_type}")
        logger.error(f"[QUIZ HISTORY ROUTE ERROR] Error message: {error_msg}")
        logger.info("=" * 80)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve quiz history: {error_msg[:200] if len(error_msg) > 200 else error_msg}"
        )

@router.get("/history/{quiz_id}")
async def get_quiz_by_id(quiz_id: int, current_user: dict = Depends(get_current_user)):
    """
    Get a specific quiz by ID for the current user with detailed logging
    """
    logger.info("=" * 80)
    logger.info(f"[QUIZ BY ID ROUTE] GET /history/{quiz_id} endpoint called")
    logger.info(f"[QUIZ BY ID ROUTE] User: {current_user.get('email')} (user_id: {current_user.get('user_id')})")
    logger.info(f"[QUIZ BY ID ROUTE] Requested quiz_id: {quiz_id}")
    
    try:
        user_id = current_user.get("user_id")
        logger.info(f"[QUIZ BY ID ROUTE] Querying quiz with quiz_id: {quiz_id} for user_id: {user_id}")
        
        # Find the specific quiz
        quiz = db["quizzes"].find_one({
            "quiz_id": quiz_id,
            "user_id": user_id
        })
        
        if not quiz:
            logger.warning(f"[QUIZ BY ID ROUTE] Quiz not found: quiz_id={quiz_id}, user_id={user_id}")
            logger.info("=" * 80)
            raise HTTPException(status_code=404, detail="Quiz not found")
        
        logger.info(f"[QUIZ BY ID ROUTE] Quiz found successfully")
        
        # Convert ObjectId to string
        quiz["_id"] = str(quiz["_id"])
        if "created_at" in quiz:
            quiz["created_at"] = quiz["created_at"].isoformat() if isinstance(quiz["created_at"], datetime) else str(quiz["created_at"])
        if "updated_at" in quiz:
            quiz["updated_at"] = quiz["updated_at"].isoformat() if isinstance(quiz["updated_at"], datetime) else str(quiz["updated_at"])
        
        logger.info(f"[QUIZ BY ID ROUTE] Returning quiz data")
        logger.info("=" * 80)
        
        return {
            "success": True,
            "quiz": quiz
        }
        
    except HTTPException:
        raise
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        logger.error("=" * 80)
        logger.error(f"[QUIZ BY ID ROUTE ERROR] Failed to retrieve quiz")
        logger.error(f"[QUIZ BY ID ROUTE ERROR] Error type: {error_type}")
        logger.error(f"[QUIZ BY ID ROUTE ERROR] Error message: {error_msg}")
        logger.info("=" * 80)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve quiz: {error_msg[:200] if len(error_msg) > 200 else error_msg}"
        )
