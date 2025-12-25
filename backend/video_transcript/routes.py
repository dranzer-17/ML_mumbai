"""
Video Transcript Routes
API endpoints for YouTube and video file transcription
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
import os
import tempfile
from logger import get_logger
from video_transcript.schemas import YoutubeRequest, TranscriptResponse
from video_transcript.services import process_youtube_transcript, process_video_upload

logger = get_logger(__name__)
router = APIRouter(prefix="/api/video-transcript", tags=["video-transcript"])


@router.post("/youtube", response_model=TranscriptResponse)
async def transcribe_youtube(request: YoutubeRequest):
    """
    Fetch and format transcript from a YouTube video
    """
    try:
        result = process_youtube_transcript(request.video_url)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return TranscriptResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in YouTube transcription endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to transcribe video: {str(e)}")


@router.post("/upload", response_model=TranscriptResponse)
async def transcribe_upload(file: UploadFile = File(...)):
    """
    Transcribe an uploaded video file
    """
    video_file_path = None
    
    try:
        logger.info(f"Video upload request: {file.filename}")
        
        # Save uploaded video to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_file:
            content = await file.read()
            temp_file.write(content)
            video_file_path = temp_file.name
        
        logger.info(f"Video saved to: {video_file_path}")
        
        # Process the video
        result = process_video_upload(video_file_path)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return TranscriptResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in video upload endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to transcribe video: {str(e)}")
    finally:
        # Clean up temporary file
        if video_file_path:
            try:
                os.unlink(video_file_path)
                logger.info("Temporary video file deleted")
            except Exception as e:
                logger.warning(f"Failed to delete temporary file: {e}")
