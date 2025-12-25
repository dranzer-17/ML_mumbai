"""
Speech-to-Text utilities
Handles audio transcription using AssemblyAI
"""
import os
import time
import requests
from logger import get_logger

logger = get_logger(__name__)


def transcribe_audio_assemblyai(audio_data: bytes, language_code: str = "en") -> dict:
    """
    Convert speech audio to text using AssemblyAI
    
    Args:
        audio_data: Audio file bytes
        language_code: Language code (e.g., 'en', 'es', 'fr')
        
    Returns:
        dict with success, transcript, and optional error
    """
    api_key = os.getenv("ASSEMBLYAI_API_KEY")
    if not api_key:
        logger.warning("ASSEMBLYAI_API_KEY not found in environment variables")
        return {
            "success": False,
            "transcript": "",
            "error": "AssemblyAI API key not configured"
        }

    try:
        logger.info("Transcribing audio with AssemblyAI")
        
        # Upload file
        upload_url = "https://api.assemblyai.com/v2/upload"
        headers = {"authorization": api_key}
        upload_response = requests.post(upload_url, headers=headers, data=audio_data)
        upload_response.raise_for_status()
        audio_url = upload_response.json()["upload_url"]
        
        # Request transcription
        transcript_url = "https://api.assemblyai.com/v2/transcript"
        transcript_request = {
            "audio_url": audio_url,
            "language_code": language_code
        }
        transcript_response = requests.post(transcript_url, headers=headers, json=transcript_request)
        transcript_response.raise_for_status()
        transcript_id = transcript_response.json()["id"]
        
        # Poll for completion
        polling_url = f"https://api.assemblyai.com/v2/transcript/{transcript_id}"
        while True:
            polling_response = requests.get(polling_url, headers=headers)
            polling_response.raise_for_status()
            result = polling_response.json()
            
            if result["status"] == "completed":
                logger.info("Successfully transcribed audio")
                return {
                    "success": True,
                    "transcript": result["text"]
                }
            elif result["status"] == "error":
                logger.error(f"AssemblyAI transcription failed: {result.get('error')}")
                return {
                    "success": False,
                    "transcript": "",
                    "error": result.get('error', 'Transcription failed')
                }
            
            time.sleep(3)
        
    except ImportError:
        error_msg = "ElevenLabs library not installed. Run: pip install elevenlabs"
        logger.error(error_msg)
        return {
            "success": False,
            "transcript": "",
            "error": error_msg
        }
    except Exception as e:
        error_msg = f"Exception: {str(e)}"
        logger.error(f"Error transcribing audio: {error_msg}")
        return {
            "success": False,
            "transcript": "",
            "error": error_msg
        }


def speech_to_text(audio_data: bytes, language: str = "en") -> str:
    """
    Convert speech audio to text
    
    Args:
        audio_data: Audio file bytes
        language: Language code
        
    Returns:
        Transcribed text
        
    Note:
        This is a placeholder. Implement with:
        - Google Cloud Speech-to-Text
        - Whisper API
        - AWS Transcribe
        - Azure Speech
    """
    logger.warning("[STT] Speech-to-Text not yet implemented")
    raise NotImplementedError("STT feature coming soon")
