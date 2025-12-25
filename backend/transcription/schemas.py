"""
Pydantic schemas for video transcription
"""
from pydantic import BaseModel, HttpUrl
from typing import Optional, Literal


class TranscriptionRequest(BaseModel):
    """Request model for video transcription"""
    source_type: Literal["url", "video"]
    url: Optional[str] = None


class TranscriptionResponse(BaseModel):
    """Response model for video transcription"""
    success: bool
    formatted_transcript: Optional[str] = None
    error: Optional[str] = None
    video_source: Optional[str] = None
