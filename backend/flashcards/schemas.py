from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class FlashcardGenerateRequest(BaseModel):
    text: Optional[str] = None
    url: Optional[str] = None
    num_cards: int = 10
    words_per_card: int = 35

class Flashcard(BaseModel):
    id: int
    front: str
    back: str
    difficulty: str

class FlashcardGenerateResponse(BaseModel):
    flashcards: List[Flashcard]
    original_content: str
    content_source: str

class SaveFlashcardSetRequest(BaseModel):
    flashcards: List[Dict[str, Any]]
    original_content: str
    content_source: str
    num_cards: int
    words_per_card: int

