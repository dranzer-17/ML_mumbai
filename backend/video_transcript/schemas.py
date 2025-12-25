"""
Pydantic schemas for video transcription
"""
from pydantic import BaseModel


class YoutubeRequest(BaseModel):
    video_url: str


class TranscriptResponse(BaseModel):
    success: bool
    transcript: str = ""
    video_id: str = ""
    error: str = ""
