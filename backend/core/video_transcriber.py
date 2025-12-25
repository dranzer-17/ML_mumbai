"""
Video Transcription Service
Handles YouTube URL and local video transcription using Gemini agents
"""
import os
import re
import time
import requests
from logger import get_logger

logger = get_logger(__name__)


def get_youtube_transcript(video_url: str) -> str:
    """
    Fetch raw transcript from a YouTube video using a third-party API.
    Returns transcript WITH timestamps.
    """
    match = re.search(r'(?:v=|\/)([0-9A-Za-z_-]{11})', video_url)
    if not match:
        return "ERROR: Invalid YouTube URL"

    video_id = match.group(1)
    api_key = os.getenv("TRANSCRIPT_API_KEY")

    url = "https://transcriptapi.com/api/v2/youtube/transcript"
    headers = {"Authorization": f"Bearer {api_key}"}
    params = {
        "video_url": video_id,
        "format": "text",
        "include_timestamp": "true"
    }

    try:
        response = requests.get(url, headers=headers, params=params)
        if response.status_code == 200:
            return response.json().get("transcript", "No transcript found")
        return f"ERROR: {response.status_code} - {response.text}"
    except Exception as e:
        return f"ERROR: {str(e)}"


def transcribe_local_video(file_path: str) -> str:
    """
    Transcribes a local video file using AssemblyAI.
    Returns raw transcription text.
    """
    if not os.path.exists(file_path):
        return "ERROR: File not found"

    api_key = os.getenv("ASSEMBLYAI_API_KEY")
    if not api_key:
        return "ERROR: ASSEMBLYAI_API_KEY not configured"

    try:
        with open(file_path, "rb") as f:
            data = f.read()

        # Upload file
        upload_url = "https://api.assemblyai.com/v2/upload"
        headers = {"authorization": api_key}
        upload_response = requests.post(upload_url, headers=headers, data=data)
        upload_response.raise_for_status()
        audio_url = upload_response.json()["upload_url"]
        
        # Request transcription
        transcript_url = "https://api.assemblyai.com/v2/transcript"
        transcript_request = {
            "audio_url": audio_url,
            "language_code": "en"
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
                return result["text"]
            elif result["status"] == "error":
                return f"ERROR: {result.get('error', 'Transcription failed')}"
            
            time.sleep(3)
            
    except Exception as e:
        return f"ERROR: {str(e)}"
