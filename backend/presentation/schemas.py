"""
Pydantic schemas for presentation generation
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class OutlineRequest(BaseModel):
    """Request to generate presentation outline"""
    prompt: str = Field(..., description="Topic or description for the presentation")
    num_slides: int = Field(5, ge=3, le=20, description="Number of slides to generate")
    language: str = Field("en-US", description="Language code (e.g., en-US, es, fr)")
    

class OutlineResponse(BaseModel):
    """Response containing generated outline"""
    title: str = Field(..., description="Generated presentation title")
    outline: List[str] = Field(..., description="List of slide topics with bullet points")
    success: bool = True


class PresentationRequest(BaseModel):
    """Request to generate full presentation"""
    title: str = Field(..., description="Presentation title")
    prompt: str = Field(..., description="Original user prompt/request")
    outline: List[str] = Field(..., description="Array of main topics with markdown content")
    language: str = Field("en-US", description="Language code")
    tone: str = Field("professional", description="Presentation tone/style")
    theme: str = Field("default", description="Visual theme")


class SlideContent(BaseModel):
    """Individual slide content"""
    layout: str = Field(..., description="Layout type (bullets, columns, timeline, etc)")
    section_layout: str = Field("left", description="Image position (left, right, vertical)")
    content: Dict[str, Any] = Field(..., description="Slide content data")
    image_query: Optional[str] = Field(None, description="Image search query")


class PresentationResponse(BaseModel):
    """Response containing generated presentation"""
    title: str
    slides: List[SlideContent]
    theme: str
    success: bool = True
