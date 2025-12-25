"""
Tool definitions for the Agent Development Kit (ADK)
These tools can be called by the agent orchestrator
"""
from typing import Dict, Any, List, Optional

# Tool definitions for Gemini function calling
AGENT_TOOLS = [
    {
        "name": "explain_content",
        "description": "Explain educational content from URL, PDF, or text. Use this when user asks to explain, summarize, or understand content. Always explain first before generating quizzes or flashcards.",
        "parameters": {
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "Text content to explain (optional if url or pdf provided)"
                },
                "url": {
                    "type": "string",
                    "description": "URL to scrape and explain (optional if text or pdf provided)"
                },
                "complexity": {
                    "type": "string",
                    "enum": ["simple", "medium", "advanced"],
                    "description": "Complexity level of explanation",
                    "default": "medium"
                }
            }
        }
    },
    {
        "name": "generate_quiz",
        "description": "Generate quiz questions from content. Use this when user asks for quiz, questions, test, or assessment. Requires content to be explained first or provide content directly.",
        "parameters": {
            "type": "object",
            "properties": {
                "content": {
                    "type": "string",
                    "description": "Content to generate quiz from. Can use previously explained content from context."
                },
                "num_questions": {
                    "type": "integer",
                    "description": "Number of questions to generate (default: 10, range: 5-20)",
                    "default": 10,
                    "minimum": 5,
                    "maximum": 20
                },
                "difficulty": {
                    "type": "string",
                    "enum": ["easy", "medium", "hard"],
                    "description": "Difficulty level of questions",
                    "default": "medium"
                }
            },
            "required": ["content"]
        }
    },
    {
        "name": "generate_flashcards",
        "description": "Generate flashcards from content. Use this when user asks for flashcards, study cards, or revision cards. Requires content to be explained first or provide content directly.",
        "parameters": {
            "type": "object",
            "properties": {
                "content": {
                    "type": "string",
                    "description": "Content to generate flashcards from. Can use previously explained content from context."
                },
                "num_cards": {
                    "type": "integer",
                    "description": "Number of flashcards to generate (default: 10, range: 5-30)",
                    "default": 10,
                    "minimum": 5,
                    "maximum": 30
                },
                "words_per_card": {
                    "type": "integer",
                    "description": "Words per flashcard (default: 35, range: 20-50)",
                    "default": 35,
                    "minimum": 20,
                    "maximum": 50
                }
            },
            "required": ["content"]
        }
    },
    {
        "name": "generate_workflow",
        "description": "Generate a workflow diagram from content. Use this when user asks for workflow, process diagram, or flowchart. Requires content to be explained first or provide content directly.",
        "parameters": {
            "type": "object",
            "properties": {
                "content": {
                    "type": "string",
                    "description": "Content to generate workflow from. Can use previously explained content from context."
                }
            },
            "required": ["content"]
        }
    }
]

