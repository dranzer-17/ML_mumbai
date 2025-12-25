"""
Video transcription service logic
Handles transcript formatting with conditional formatting based on length
"""
from logger import get_logger
from core.video_transcriber import get_youtube_transcript, transcribe_local_video
from core.gemini_client import generate_with_gemini

logger = get_logger(__name__)

# Threshold for formatting (characters)
FORMATTING_THRESHOLD = 12000  # Only format if transcript is longer than 12000 chars

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


def format_transcript_if_needed(raw_transcript: str, context: str = "VIDEO") -> str:
    """
    Format transcript only if it's longer than the threshold
    
    Args:
        raw_transcript: The raw transcript text
        context: Context for logging
        
    Returns:
        Formatted transcript if long enough, otherwise cleaned simple paragraph
    """
    transcript_length = len(raw_transcript)
    logger.info(f"[{context}] Transcript length: {transcript_length} characters")
    
    if transcript_length <= FORMATTING_THRESHOLD:
        logger.info(f"[{context}] Transcript is short ({transcript_length} chars), cleaning and returning as simple paragraph")
        # Clean up the transcript - remove timestamps and format as simple paragraph
        import re
        # Remove timestamp patterns like [0.16s], [2.399s], etc.
        cleaned = re.sub(r'\[\d+\.?\d*s\]\s*', '', raw_transcript)
        # Remove HTML entities
        cleaned = cleaned.replace('&#39;', "'").replace('&quot;', '"').replace('&amp;', '&')
        # Remove extra whitespace and join into continuous text
        cleaned = ' '.join(cleaned.split())
        return cleaned
    
    logger.info(f"[{context}] Transcript is long ({transcript_length} chars), formatting with Gemini")
    formatting_prompt = f"{FORMATTER_PROMPT}\n\n---\n\nRAW TRANSCRIPT:\n\n{raw_transcript}"
    
    try:
        formatted_transcript = generate_with_gemini(
            prompt=formatting_prompt,
            context=context
        )
        logger.info(f"[{context}] Transcript formatted successfully")
        return formatted_transcript
    except Exception as e:
        logger.error(f"[{context}] Formatting failed: {str(e)}, returning cleaned transcript")
        # Clean up even on error
        import re
        cleaned = re.sub(r'\[\d+\.?\d*s\]\s*', '', raw_transcript)
        cleaned = cleaned.replace('&#39;', "'").replace('&quot;', '"').replace('&amp;', '&')
        cleaned = ' '.join(cleaned.split())
        return cleaned


def process_youtube_transcript(video_url: str) -> dict:
    """
    Process YouTube video transcript
    
    Args:
        video_url: YouTube video URL
        
    Returns:
        dict with success, transcript, video_id, and optional error
    """
    try:
        logger.info(f"[YOUTUBE] Processing video: {video_url}")
        
        # Get raw transcript
        raw_transcript = get_youtube_transcript(video_url)
        
        if raw_transcript.startswith("ERROR:"):
            logger.error(f"[YOUTUBE] Failed to get transcript: {raw_transcript}")
            return {
                "success": False,
                "error": raw_transcript,
                "transcript": "",
                "video_id": ""
            }
        
        # Format if needed
        final_transcript = format_transcript_if_needed(raw_transcript, "YOUTUBE")
        
        # Extract video ID
        import re
        match = re.search(r'(?:v=|\/)([0-9A-Za-z_-]{11})', video_url)
        video_id = match.group(1) if match else ""
        
        logger.info(f"[YOUTUBE] Processing completed successfully")
        
        return {
            "success": True,
            "transcript": final_transcript,
            "video_id": video_id,
            "error": ""
        }
        
    except Exception as e:
        logger.error(f"[YOUTUBE] Processing failed: {str(e)}")
        return {
            "success": False,
            "error": f"Failed to process video: {str(e)}",
            "transcript": "",
            "video_id": ""
        }


def process_video_upload(video_file_path: str) -> dict:
    """
    Process uploaded video file transcript
    
    Args:
        video_file_path: Path to video file
        
    Returns:
        dict with success, transcript, and optional error
    """
    try:
        logger.info(f"[UPLOAD] Processing video file: {video_file_path}")
        
        # Transcribe with ElevenLabs
        raw_transcript = transcribe_local_video(video_file_path)
        
        if raw_transcript.startswith("ERROR:"):
            logger.error(f"[UPLOAD] Failed to transcribe: {raw_transcript}")
            return {
                "success": False,
                "error": raw_transcript,
                "transcript": "",
                "video_id": ""
            }
        
        # Format if needed
        final_transcript = format_transcript_if_needed(raw_transcript, "UPLOAD")
        
        logger.info(f"[UPLOAD] Processing completed successfully")
        
        return {
            "success": True,
            "transcript": final_transcript,
            "video_id": "",
            "error": ""
        }
        
    except Exception as e:
        logger.error(f"[UPLOAD] Processing failed: {str(e)}")
        return {
            "success": False,
            "error": f"Failed to process video: {str(e)}",
            "transcript": "",
            "video_id": ""
        }
