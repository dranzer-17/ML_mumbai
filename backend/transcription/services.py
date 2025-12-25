"""
Video Transcription Service with Gemini Agents
Uses multi-agent workflow for transcription and formatting
"""
import os
import tempfile
from typing import Optional
from logger import get_logger
from core.gemini_client import generate_with_gemini
from core.video_transcriber import get_youtube_transcript, transcribe_local_video

logger = get_logger(__name__)


FORMATTER_PROMPT = """
You are a Transcript Formatter Agent.

Input: RAW video transcript (with timestamps if available).

Your responsibilities:
1. Group transcript into logical segments based on time or topic.
2. For each segment:
   - Title
   - Time range (if available)
   - Concise summary (max 3–5 bullet points)
3. Extract IMPORTANT examples explicitly mentioned in the transcript.

Rules:
- Do NOT add new information
- Do NOT teach or explain concepts
- Do NOT hallucinate
- Only restructure and summarize existing content

STRICT OUTPUT FORMAT:

## Segment 1
**Time:** [time range or N/A]
**Title:** [segment title]

**Summary:**
- [point 1]
- [point 2]
- [point 3]

**Important Examples:**
- [example if any, or "None mentioned"]

---

## Segment 2
[repeat format]
...
"""


async def transcribe_video(
    source_type: str,
    url: Optional[str] = None,
    video_file_path: Optional[str] = None
) -> dict:
    """
    Transcribe video from YouTube URL or local file
    
    Args:
        source_type: "url" or "video"
        url: YouTube URL if source_type is "url"
        video_file_path: Path to local video file if source_type is "video"
        
    Returns:
        dict with success, formatted_transcript, and optional error
    """
    try:
        # Step 1: Get raw transcript
        logger.info(f"Starting transcription for source_type: {source_type}")
        
        if source_type == "url" and url:
            raw_transcript = get_youtube_transcript(url)
            video_source = url
        elif source_type == "video" and video_file_path:
            raw_transcript = transcribe_local_video(video_file_path)
            video_source = "Uploaded Video"
        else:
            return {
                "success": False,
                "error": "Invalid source type or missing required parameters"
            }
        
        # Check for errors in raw transcript
        if raw_transcript.startswith("ERROR:"):
            logger.error(f"Transcription failed: {raw_transcript}")
            return {
                "success": False,
                "error": raw_transcript
            }
        
        logger.info("Raw transcript obtained successfully")
        
        # Step 2: Format transcript using Gemini
        formatting_prompt = f"{FORMATTER_PROMPT}\n\n---\n\nRAW TRANSCRIPT:\n\n{raw_transcript}"
        
        logger.info("Formatting transcript with Gemini")
        formatted_transcript = generate_with_gemini(
            prompt=formatting_prompt,
            context="VIDEO_TRANSCRIPTION"
        )
        
        logger.info("Transcription and formatting completed successfully")
        
        return {
            "success": True,
            "formatted_transcript": formatted_transcript,
            "video_source": video_source
        }
        
    except Exception as e:
        logger.error(f"Error in transcribe_video: {str(e)}")
        return {
            "success": False,
            "error": f"Transcription failed: {str(e)}"
        }
