from core.gemini_client import generate_with_gemini
from core.pdf_extractor import extract_text_from_pdf
from core.url_extractor import extract_text_from_url
from core.prompts import get_workflow_prompt
from logger import get_logger
import re

logger = get_logger(__name__)

def generate_workflow(content: str) -> dict:
    """
    Generate a Mermaid workflow diagram from content.
    AI determines optimal number of nodes based on content.
    Returns mermaid code string.
    """
    logger.info(f"Generating workflow from content (length: {len(content)})")
    
    prompt = get_workflow_prompt(content)
    
    try:
        raw_output = generate_with_gemini(prompt)
        logger.info(f"Raw Gemini output received: {raw_output[:200]}...")
        
        # Extract mermaid code from markdown code blocks if present
        mermaid_code = extract_mermaid_code(raw_output)
        
        logger.info(f"Successfully generated workflow")
        
        return {
            "mermaid_code": mermaid_code,
            "original_content": content
        }
    
    except Exception as e:
        logger.error(f"Failed to generate workflow: {str(e)}")
        raise

def extract_mermaid_code(text: str) -> str:
    """Extract mermaid code from markdown code blocks or raw text."""
    # Try to extract from ```mermaid code block
    mermaid_pattern = r"```mermaid\n(.*?)```"
    match = re.search(mermaid_pattern, text, re.DOTALL)
    
    if match:
        return match.group(1).strip()
    
    # Try to extract from ``` code block
    code_pattern = r"```\n(.*?)```"
    match = re.search(code_pattern, text, re.DOTALL)
    
    if match:
        code = match.group(1).strip()
        # Check if it starts with graph/flowchart (mermaid syntax)
        if code.startswith(('graph', 'flowchart', 'sequenceDiagram')):
            return code
    
    # If no code blocks, return as-is (assume it's already mermaid code)
    return text.strip()
