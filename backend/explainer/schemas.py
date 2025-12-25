from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class ExplainerRequest(BaseModel):
    text: Optional[str] = None
    url: Optional[str] = None
    complexity: str = "medium"  # "simple", "medium", "advanced"

class ConceptModel(BaseModel):
    term: str
    definition: str
    analogy: str

class WorkflowModel(BaseModel):
    title: str
    steps: List[str]

class DiagramModel(BaseModel):
    type: str
    description: str
    mermaid_code: str

class ImageSuggestion(BaseModel):
    query: str
    context: str

class ReferenceModel(BaseModel):
    title: str
    description: str
    suggested_search: str

class SectionModel(BaseModel):
    heading: str
    content: str
    key_points: List[str]
    examples: List[str]

class ExplainerResponse(BaseModel):
    title: str
    summary: str
    sections: List[SectionModel]
    concepts: List[ConceptModel]
    workflows: List[WorkflowModel]
    diagrams: List[DiagramModel]
    image_suggestions: List[ImageSuggestion]
    references: List[ReferenceModel]
    quiz_topics: List[str]
    flashcard_concepts: List[str]
    original_content: str
    content_source: str

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ExplainerChatRequest(BaseModel):
    explainer_content: str
    chat_history: List[ChatMessage]
    question: str

class ExplainerChatResponse(BaseModel):
    answer: str
    relevant_section: Optional[str] = None

