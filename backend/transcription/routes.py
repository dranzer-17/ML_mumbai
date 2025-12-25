"""
Video Transcription Routes
API endpoints for video transcription
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
import os
import tempfile
from logger import get_logger
from transcription.schemas import TranscriptionResponse
from transcription.services import transcribe_video

logger = get_logger(__name__)
router = APIRouter(prefix="/api/transcription", tags=["transcription"])


@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_video_endpoint(
    source_type: str = Form(...),
    url: str = Form(None),
    video: UploadFile = File(None)
):
    """
    Transcribe video from YouTube URL or uploaded video file
    
    Args:
        source_type: "url" or "video"
        url: YouTube URL (required if source_type is "url")
        video: Video file (required if source_type is "video")
    """
    try:
        logger.info(f"Transcription request received - source_type: {source_type}")
        
        video_file_path = None
        
        if source_type == "url":
            if not url:
                raise HTTPException(status_code=400, detail="URL is required for URL source type")
            
            result = await transcribe_video(
                source_type="url",
                url=url
            )
            
        elif source_type == "video":
            if not video:
                raise HTTPException(status_code=400, detail="Video file is required for video source type")
            
            # Save uploaded video to temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_file:
                content = await video.read()
                temp_file.write(content)
                video_file_path = temp_file.name
            
            logger.info(f"Video saved to temporary file: {video_file_path}")
            
            result = await transcribe_video(
                source_type="video",
                video_file_path=video_file_path
            )
            
            # Clean up temporary file
            try:
                os.unlink(video_file_path)
                logger.info("Temporary video file deleted")
            except Exception as e:
                logger.warning(f"Failed to delete temporary file: {e}")
        else:
            raise HTTPException(status_code=400, detail="Invalid source type. Must be 'url' or 'video'")
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result.get("error", "Transcription failed"))
        
        return TranscriptionResponse(
            success=True,
            formatted_transcript=result["formatted_transcript"],
            video_source=result.get("video_source")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in transcribe endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
