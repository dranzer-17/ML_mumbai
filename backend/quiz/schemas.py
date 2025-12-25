from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class QuizQuestion(BaseModel):
    id: int
    question: str
    options: List[str]
    correct_answer: str

class QuizGenerateRequest(BaseModel):
    text: Optional[str] = None
    url: Optional[str] = None
    num_questions: int
    difficulty: str

class QuizGenerateResponse(BaseModel):
    quiz: List[Dict[str, Any]]

class UserAnswer(BaseModel):
    question_id: int
    user_answer: str
    is_correct: bool

class QuizResults(BaseModel):
    questions: List[Dict[str, Any]]
    user_answers: List[UserAnswer]
    score: int
    total_questions: int
    correct_answers: List[Dict[str, Any]]
    wrong_answers: List[Dict[str, Any]]

class AnalysisRequest(BaseModel):
    original_content: str
    content_source: str  # "text", "url", "pdf"
    correct_answers: List[Dict[str, Any]]  # Questions answered correctly
    wrong_answers: List[Dict[str, Any]]  # Questions answered incorrectly

class AnalysisResponse(BaseModel):
    analysis: str
    topics_to_improve: List[str]
    strengths: List[str]
    recommendations: List[str]
