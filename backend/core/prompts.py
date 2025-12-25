"""
AI prompt templates for different features
"""

def get_quiz_prompt(content: str, num_questions: int, difficulty: str) -> str:
    """
    Generate quiz prompt for Gemini
    
    Args:
        content: Source content
        num_questions: Number of questions
        difficulty: Difficulty level
        
    Returns:
        Formatted prompt string
    """
    return f"""
Act as a strict educational API. Generate {num_questions} multiple-choice questions 
based strictly on the following text. The difficulty level should be {difficulty}.

Text: "{content}"

Output Format:
Return ONLY a raw JSON array. No markdown, no 'json' tags, no intro text.
Structure:
[
    {{
        "id": 1,
        "question": "Question text here?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_answer": "Option B" 
    }}
]
"""


def get_analysis_prompt(content: str, correct: list, wrong: list) -> str:
    """
    Generate analysis prompt for quiz results
    
    Args:
        content: Original content
        correct: Correct answers
        wrong: Wrong answers
        
    Returns:
        Formatted prompt string
    """
    return f"""
You are an educational AI assistant. Analyze this student's quiz performance and provide insights.

Original Content:
{content[:3000]}

Questions Answered Correctly:
{correct}

Questions Answered Incorrectly:
{wrong}

Provide a JSON response with:
{{
    "analysis": "Overall performance summary (2-3 sentences)",
    "topics_to_improve": ["topic1", "topic2"],
    "strengths": ["strength1", "strength2"],
    "recommendations": ["recommendation1", "recommendation2"]
}}

Return ONLY valid JSON, no markdown.
"""


def get_explainer_prompt(content: str, complexity: str = "medium") -> str:
    """
    Generate explanation prompt for content with rich structured output
    
    Args:
        content: Content to explain
        complexity: Explanation complexity level
        
    Returns:
        Formatted prompt string
    """
    return f"""
You are an expert educator creating a comprehensive, engaging explanation similar to NotebookLM.
Complexity level: {complexity}

Content to Explain:
{content}

Generate a rich, structured explanation in JSON format with the following structure:

{{
    "title": "Main topic title",
    "summary": "2-3 sentence overview",
    "sections": [
        {{
            "heading": "Section title",
            "content": "Detailed explanation in markdown format",
            "key_points": ["point 1", "point 2"],
            "examples": ["example 1", "example 2"]
        }}
    ],
    "concepts": [
        {{
            "term": "Key concept name",
            "definition": "Clear definition",
            "analogy": "Real-world analogy to understand it"
        }}
    ],
    "workflows": [
        {{
            "title": "Process/workflow name",
            "steps": ["step 1", "step 2", "step 3"]
        }}
    ],
    "diagrams": [
        {{
            "type": "flowchart|mindmap|process",
            "description": "What this diagram represents",
            "mermaid_code": "flowchart TD\n    A[Start] --> B[Process]\n    B --> C[End]"
        }}
    ],
    "image_suggestions": [
        {{
            "query": "Search query for relevant image",
            "context": "Why this image is relevant"
        }}
    ],
    "references": [
        {{
            "title": "Reference title",
            "description": "What to learn from this",
            "suggested_search": "Google search query"
        }}
    ],
    "quiz_topics": ["topic1", "topic2", "topic3"],
    "flashcard_concepts": ["concept1", "concept2", "concept3"]
}}

IMPORTANT: Return ONLY valid JSON with no markdown code blocks. Do not use newlines within string values - keep all text on single lines. Use spaces instead of tabs."""


def get_flashcard_prompt(content: str, num_cards: int = 10, words_per_card: int = 35) -> str:
    """
    Generate exam-style flashcard prompt with strict formatting
    
    Args:
        content: Source content
        num_cards: Number of flashcards
        words_per_card: Maximum words allowed per side
        
    Returns:
        Formatted prompt string optimized for exam preparation
    """
    return f"""
You are an EXAM-FOCUSED flashcard generator. Create EXACTLY {num_cards} flashcards for rapid memorization.

STRICT RULES - FOLLOW PRECISELY:
1. Each card FRONT & BACK must be ≤ {words_per_card} words
2. NO storytelling, NO examples, NO explanations
3. ONLY direct facts, formulas, definitions, key terms
4. Use bullet points (•) for multi-part answers
5. Include mathematical formulas EXACTLY as written (use proper notation)
6. Assign difficulty based on concept complexity:
   - easy: Basic definitions, simple facts
   - medium: Formulas, processes, relationships
   - hard: Complex concepts, advanced theories

Content to extract from:
{content}

Output Format (RAW JSON ARRAY ONLY - NO MARKDOWN):
[
  {{
    "id": 1,
    "front": "What is Newton's 2nd Law?",
    "back": "F = ma (Force = mass × acceleration)",
    "difficulty": "medium"
  }},
  {{
    "id": 2,
    "front": "Mitochondria function?",
    "back": "• Cellular respiration • ATP production • Energy powerhouse",
    "difficulty": "easy"
  }},
  {{
    "id": 3,
    "front": "Derive quadratic formula",
    "back": "x = (-b ± √(b² - 4ac)) / 2a",
    "difficulty": "hard"
  }}
]

❌ STRICTLY AVOID: Long sentences, stories, context, explanations, examples
✅ MUST INCLUDE: Formulas, definitions, key terms, bullet points, concise facts

Generate {num_cards} flashcards NOW:
"""


def get_workflow_prompt(content: str) -> str:
    """
    Generate workflow diagram prompt for Gemini
    
    Args:
        content: Source content
        
    Returns:
        Formatted prompt string with Mermaid syntax
    """
    return f"""
Generate a CLEAR Mermaid flowchart workflow diagram based on the following content.
Analyze the content and create a workflow with EXACTLY 6-7 nodes with at least ONE decision point.

Content: "{content}"

CRITICAL SYNTAX RULES:
1. ALWAYS use "flowchart TD" (Top-Down/Vertical layout)
2. Node IDs must be simple letters: A, B, C, D, E, F, G, H
3. Node labels MUST use square brackets: A[Label Text]
4. NEVER use parentheses, quotes, or special characters in node labels
5. For decision nodes, use double curly braces: C{{{{Decision Text}}}}
6. Keep labels SHORT - max 3-4 words
7. Use only alphanumeric characters and spaces in labels
8. Connection arrows: --> or ---|label|-->

REQUIRED STRUCTURE:
- MUST have 7-9 nodes total
- MUST have at least 1 decision node (diamond shape with {{{{}}}})
- Include at least one branching path with |Yes| and |No| labels
- One branch can loop back or both can continue forward
- Keep it organized vertically

PERFECT EXAMPLE:
flowchart TD
    A[Start Process] --> B[Gather Data]
    B --> C[Validate Input]
    C --> D{{{{Data Valid}}}}
    D -->|Yes| E[Process Data]
    D -->|No| F[Show Error]
    E --> G[Generate Output]
    F --> H[Log Error]
    G --> I[Complete]
    H --> I

BAD EXAMPLES:
- Only 5 linear nodes (TOO SIMPLE)
- More than 10 nodes (TOO COMPLEX)
- No decision nodes (TOO BORING)
- flowchart LR (WRONG - must be TD)

Output ONLY the Mermaid code starting with "flowchart TD".
NO markdown fences, NO explanations.
"""
