"""
Schemas for agent API requests and responses
"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class AgentChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    tool_results: Optional[List[Dict[str, Any]]] = None

class AgentChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"
    chat_history: Optional[List[AgentChatMessage]] = []

class ToolResult(BaseModel):
    tool: str
    result: Dict[str, Any]
    error: Optional[str] = None

class AgentChatResponse(BaseModel):
    message: str
    tool_results: List[ToolResult]
    session_id: str

