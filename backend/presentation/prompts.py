"""
Prompts for presentation generation
"""
from datetime import datetime

def get_outline_prompt(topic: str, num_slides: int, language: str) -> str:
    """
    Generate prompt for creating presentation outline
    
    Args:
        topic: Presentation topic
        num_slides: Number of slides
        language: Language for the presentation
        
    Returns:
        Formatted prompt string
    """
    language_map = {
        "en-US": "English (US)",
        "pt": "Portuguese",
        "es": "Spanish",
        "fr": "French",
        "de": "German",
        "it": "Italian",
        "ja": "Japanese",
        "ko": "Korean",
        "zh": "Chinese",
        "ru": "Russian",
        "hi": "Hindi",
        "ar": "Arabic",
    }
    
    actual_language = language_map.get(language, language)
    current_date = datetime.now().strftime("%A, %B %d, %Y")
    
    return f"""Given the following presentation topic and requirements, generate a structured outline with {num_slides} main topics in markdown format.
The outline should be in {actual_language} language and it very important.

Current Date: {current_date}
Topic: {topic}

First, generate an appropriate title for the presentation, then create exactly {num_slides} main topics that would make for an engaging and well-structured presentation.

Format the response starting with the title in XML tags, followed by markdown content with each topic as a heading and 2-3 bullet points.

Example format:
<TITLE>Your Generated Presentation Title Here</TITLE>

# First Main Topic
- Key point about this topic
- Another important aspect
- Brief conclusion or impact

# Second Main Topic
- Main insight for this section
- Supporting detail or example
- Practical application or takeaway

Make sure the topics:
1. Flow logically from one to another
2. Cover the key aspects of the main topic
3. Are clear and concise
4. Are engaging for the audience
5. ALWAYS use bullet points (not paragraphs) and format each point as "- point text"
6. Do not use bold, italic or underline
7. Keep each bullet point brief - just one sentence per point
8. Include exactly 2-3 bullet points per topic (not more, not less)

Return ONLY the formatted outline with title in XML tags, nothing else."""


def get_presentation_prompt(
    title: str,
    prompt: str,
    outline: list,
    language: str,
    tone: str
) -> str:
    """
    Generate prompt for creating full presentation slides
    
    Args:
        title: Presentation title
        prompt: Original user prompt
        outline: List of outline topics
        language: Language for the presentation
        tone: Presentation tone/style
        
    Returns:
        Formatted prompt string
    """
    current_date = datetime.now().strftime("%A, %B %d, %Y")
    outline_formatted = "\n".join(outline)
    
    return f"""You are an expert presentation designer. Your task is to create an engaging presentation in JSON format.

## PRESENTATION DETAILS
- Title: {title}
- User's Original Request: {prompt}
- Current Date: {current_date}
- Outline: {outline_formatted}
- Language: {language}
- Tone: {tone}

## OUTPUT FORMAT
Return a JSON array where each object represents one slide with this structure:
{{
  "layout": "bullets|columns|timeline|arrows|boxes|compare|icons|cycle|pyramid|staircase",
  "section_layout": "left|right|vertical",
  "content": {{
    "heading": "Slide heading",
    "items": [
      {{"text": "Point 1", "subtext": "Optional detail"}},
      {{"text": "Point 2", "subtext": "Optional detail"}}
    ]
  }},
  "image_query": "detailed 10+ word image search query"
}}

## LAYOUT DESCRIPTIONS
- bullets: Key points with bullet points
- columns: Side-by-side comparisons (2-3 columns)
- timeline: Chronological events
- arrows: Process flow or cause-effect
- boxes: Simple information tiles
- compare: Before/after or A vs B comparison
- icons: Concepts with symbolic icons
- cycle: Circular process workflow
- pyramid: Hierarchical importance
- staircase: Progressive advancement

## SECTION LAYOUTS (image position)
- left: Image on left side
- right: Image on right side  
- vertical: Image at top

## REQUIREMENTS
1. Create slides based on the outline topics
2. Use DIFFERENT layouts for variety
3. Expand outline points with examples and context
4. Include detailed image queries (10+ words) for every slide
5. Keep text concise but informative
6. Ensure logical flow between slides
7. Match the specified language and tone

Return ONLY the JSON array, no additional text or markdown formatting."""
