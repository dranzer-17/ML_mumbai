"""
API routes for the Agent Tutor (ADK)
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import Optional
from logger import get_logger
from agent.schemas import AgentChatRequest, AgentChatResponse, ToolResult
from agent.orchestrator import process_agent_message
from agent.context_manager import get_context, clear_context
from auth.routes import get_current_user
from database import db
from core.stt import transcribe_audio_assemblyai

logger = get_logger(__name__)

router = APIRouter(prefix="/agent", tags=["Agent Tutor"])

@router.post("/chat", response_model=AgentChatResponse)
async def agent_chat(
    message: str = Form(...),
    session_id: Optional[str] = Form("default"),
    pdf: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Main chat endpoint for Agent Tutor
    Processes user messages and executes tools as needed
    Automatically detects URLs, text, or PDFs
    """
    logger.info("=" * 80)
    logger.info(f"[AGENT CHAT] POST /chat endpoint called")
    logger.info(f"[AGENT CHAT] Message: {message[:100]}...")
    logger.info(f"[AGENT CHAT] Session ID: {session_id}")
    logger.info(f"[AGENT CHAT] PDF provided: {'Yes' if pdf else 'No'}")
    
    # Get user profile for personalization
    user_profile = None
    try:
        user_email = current_user.get("email")
        user_data = db["users"].find_one({"email": user_email}) if db else None
        if user_data:
            user_profile = {
                "learner_type": user_data.get("learner_type"),
                "age_group": user_data.get("age_group"),
                "preferred_learning_style": user_data.get("preferred_learning_style"),
                "education_level": user_data.get("education_level"),
                "learning_goals": user_data.get("learning_goals", []),
                "interests": user_data.get("interests", [])
            }
            logger.info(f"[AGENT CHAT] User profile loaded")
    except Exception as e:
        logger.warning(f"[AGENT CHAT] Could not load user profile: {e}")
    
    # Validate message
    if not message or not message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    # Get or create context
    user_session_id = f"{current_user.get('email', 'anonymous')}_{session_id}"
    context = get_context(user_session_id)
    
    # Handle PDF if provided
    pdf_bytes = None
    pdf_filename = None
    if pdf:
        pdf_bytes = await pdf.read()
        pdf_filename = pdf.filename
        logger.info(f"[AGENT CHAT] PDF uploaded: {pdf_filename}, size: {len(pdf_bytes)} bytes")
    
    try:
        # Process message through agent
        result = await process_agent_message(
            user_message=message,
            context=context,
            user_profile=user_profile,
            pdf_bytes=pdf_bytes,
            pdf_filename=pdf_filename
        )
        
        # Format tool results
        tool_results = [
            ToolResult(tool=tr["tool"], result=tr.get("result", {}), error=tr.get("error"))
            for tr in result.get("tool_results", [])
        ]
        
        logger.info(f"[AGENT CHAT] Response generated successfully")
        logger.info("=" * 80)
        
        return AgentChatResponse(
            message=result["message"],
            tool_results=tool_results,
            session_id=user_session_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("=" * 80)
        logger.error(f"[AGENT CHAT ERROR] {type(e).__name__}: {str(e)}")
        logger.error("=" * 80, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Agent processing failed: {str(e)}")

@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Transcribe audio using ElevenLabs/AssemblyAI
    """
    logger.info("=" * 80)
    logger.info(f"[AGENT TRANSCRIBE] POST /transcribe endpoint called")
    logger.info(f"[AGENT TRANSCRIBE] Audio file: {audio.filename}, size: {audio.size if hasattr(audio, 'size') else 'unknown'}")
    
    try:
        audio_bytes = await audio.read()
        logger.info(f"[AGENT TRANSCRIBE] Audio read: {len(audio_bytes)} bytes")
        
        # Use ElevenLabs for transcription (falls back to AssemblyAI if needed)
        from core.stt import transcribe_audio_elevenlabs
        transcription_result = transcribe_audio_elevenlabs(audio_bytes)
        
        if transcription_result.get("success"):
            transcript = transcription_result.get("transcript", "")
            logger.info(f"[AGENT TRANSCRIBE] Transcription successful: {len(transcript)} characters")
            logger.info("=" * 80)
            return {"transcript": transcript, "success": True}
        else:
            error_msg = transcription_result.get("error", "Transcription failed")
            logger.error(f"[AGENT TRANSCRIBE ERROR] {error_msg}")
            logger.info("=" * 80)
            raise HTTPException(status_code=500, detail=error_msg)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error("=" * 80)
        logger.error(f"[AGENT TRANSCRIBE ERROR] {type(e).__name__}: {str(e)}")
        logger.error("=" * 80, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

@router.post("/clear")
async def clear_agent_session(
    session_id: Optional[str] = Form("default"),
    current_user: dict = Depends(get_current_user)
):
    """Clear conversation context for a session"""
    user_session_id = f"{current_user.get('email', 'anonymous')}_{session_id}"
    clear_context(user_session_id)
    logger.info(f"[AGENT] Cleared session: {user_session_id}")
    return {"message": "Session cleared", "session_id": user_session_id}
