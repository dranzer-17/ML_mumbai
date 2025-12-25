"""
Context manager for agent conversations
Maintains conversation state and tool execution results
"""
from typing import Dict, Any, List, Optional
from logger import get_logger

logger = get_logger(__name__)

class ConversationContext:
    """Manages conversation context and tool results"""
    
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.messages: List[Dict[str, Any]] = []
        self.tool_results: Dict[str, Any] = {}
        self.current_content: Optional[str] = None
        self.current_explanation: Optional[Dict[str, Any]] = None
        
    def add_message(self, role: str, content: str, tool_calls: Optional[List] = None):
        """Add a message to conversation history"""
        message = {
            "role": role,
            "content": content
        }
        if tool_calls:
            message["tool_calls"] = tool_calls
        self.messages.append(message)
        logger.info(f"[CONTEXT] Added {role} message: {content[:100]}...")
        
    def store_tool_result(self, tool_name: str, result: Any):
        """Store result from tool execution"""
        self.tool_results[tool_name] = result
        logger.info(f"[CONTEXT] Stored result from {tool_name}")
        
        # If explanation, store content for future use
        if tool_name == "explain_content":
            self.current_explanation = result
            if isinstance(result, dict) and "original_content" in result:
                self.current_content = result["original_content"]
            elif isinstance(result, dict) and "summary" in result:
                # Extract content from explanation
                content_parts = [result.get("summary", "")]
                if "sections" in result:
                    for section in result.get("sections", []):
                        content_parts.append(section.get("content", ""))
                self.current_content = " ".join(content_parts)
                
    def get_content_for_tool(self) -> Optional[str]:
        """Get current content that can be used by tools"""
        if self.current_content:
            return self.current_content
        if self.current_explanation and isinstance(self.current_explanation, dict):
            # Try to extract content from explanation
            if "original_content" in self.current_explanation:
                return self.current_explanation["original_content"]
        return None
        
    def get_conversation_history(self, max_messages: int = 20) -> List[Dict[str, Any]]:
        """Get recent conversation history"""
        return self.messages[-max_messages:]
        
    def clear(self):
        """Clear conversation context"""
        self.messages = []
        self.tool_results = {}
        self.current_content = None
        self.current_explanation = None
        logger.info(f"[CONTEXT] Cleared context for session {self.session_id}")

# Global context storage (in production, use Redis or database)
_contexts: Dict[str, ConversationContext] = {}

def get_context(session_id: str) -> ConversationContext:
    """Get or create conversation context for session"""
    if session_id not in _contexts:
        _contexts[session_id] = ConversationContext(session_id)
        logger.info(f"[CONTEXT] Created new context for session {session_id}")
    return _contexts[session_id]

def clear_context(session_id: str):
    """Clear context for a session"""
    if session_id in _contexts:
        _contexts[session_id].clear()
        del _contexts[session_id]
        logger.info(f"[CONTEXT] Cleared and removed context for session {session_id}")

