from pydantic import BaseModel
from typing import Optional

class GenerateWorkflowRequest(BaseModel):
    text: Optional[str] = None
    url: Optional[str] = None

class SaveWorkflowRequest(BaseModel):
    mermaid_code: str
    original_content: str
    content_source: str
