from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
import google.genai as genai
import json
from pypdf import PdfReader
from tavily import TavilyClient
import io
import requests
from logger import get_logger
from config import GEMINI_API_KEY, TAVILY_API_KEY, GEMINI_MODEL_NAME

logger = get_logger(__name__)

# Configure Gemini
client = genai.Client(api_key=GEMINI_API_KEY)
model_name = GEMINI_MODEL_NAME

# Configure Tavily
tavily_client = TavilyClient(api_key=TAVILY_API_KEY)

router = APIRouter()

class QuizRequest(BaseModel):
    text: Optional[str] = None
    url: Optional[str] = None
    num_questions: int
    difficulty: str

def extract_text_from_pdf(file_content: bytes, filename: str) -> str:
    """Extract text from PDF file"""
    logger.info(f"[PDF EXTRACT] Starting PDF extraction for file: {filename}")
    logger.info(f"[PDF EXTRACT] File size: {len(file_content)} bytes")
    try:
        pdf_reader = PdfReader(io.BytesIO(file_content))
        logger.info(f"[PDF EXTRACT] Number of pages: {len(pdf_reader.pages)}")
        text = ""
        for idx, page in enumerate(pdf_reader.pages):
            page_text = page.extract_text()
            logger.info(f"[PDF EXTRACT] Page {idx + 1} extracted: {len(page_text)} characters")
            text += page_text + "\n"
        text = text.strip()
        logger.info(f"[PDF EXTRACT] Total text extracted: {len(text)} characters")
        return text
    except Exception as e:
        logger.error(f"[PDF EXTRACT ERROR] Failed to read PDF {filename}: {type(e).__name__} - {e}")
        raise HTTPException(status_code=400, detail=f"Failed to read PDF: {str(e)}")

def extract_text_from_url(url: str) -> str:
    """Extract text content from URL using Tavily"""
    logger.info(f"[URL EXTRACT] Starting URL extraction for: {url}")
    try:
        logger.info(f"[URL EXTRACT] Calling Tavily API")
        response = tavily_client.extract(urls=[url])
        logger.info(f"[URL EXTRACT] Tavily response received: {len(str(response))} chars")
        if response and len(response.get("results", [])) > 0:
            content = response["results"][0].get("raw_content", "")
            logger.info(f"[URL EXTRACT] Content extracted: {len(content)} characters")
            return content
        logger.error(f"[URL EXTRACT ERROR] No content extracted from {url}")
        raise Exception("No content extracted")
    except Exception as e:
        logger.error(f"[URL EXTRACT ERROR] Failed to extract from URL {url}: {type(e).__name__} - {e}")
        raise HTTPException(status_code=400, detail=f"Failed to extract from URL: {str(e)}")

@router.post("/generate")
async def generate_quiz(
    text: Optional[str] = Form(None),
    url: Optional[str] = Form(None),
    pdf: Optional[UploadFile] = File(None),
    num_questions: int = Form(...),
    difficulty: str = Form(...)
):
    logger.info("=" * 80)
    logger.info(f"[QUIZ GENERATE START]")
    logger.info(f"[QUIZ] Number of questions: {num_questions}")
    logger.info(f"[QUIZ] Difficulty: {difficulty}")
    logger.info(f"[QUIZ] Text provided: {'Yes' if text else 'No'} ({len(text) if text else 0} chars)")
    logger.info(f"[QUIZ] URL provided: {'Yes' if url else 'No'} ({url if url else 'N/A'})")
    logger.info(f"[QUIZ] PDF provided: {'Yes' if pdf else 'No'} ({pdf.filename if pdf else 'N/A'})")
    
    try:
        # Determine source and extract content
        content = ""
        source_type = None
        
        if pdf:
            logger.info(f"[QUIZ] Processing PDF upload")
            source_type = "PDF"
            logger.info(f"[QUIZ] PDF filename: {pdf.filename}")
            logger.info(f"[QUIZ] PDF content type: {pdf.content_type}")
            file_content = await pdf.read()
            logger.info(f"[QUIZ] PDF file read: {len(file_content)} bytes")
            content = extract_text_from_pdf(file_content, pdf.filename)
        elif url:
            logger.info(f"[QUIZ] Processing URL extraction")
            source_type = "URL"
            content = extract_text_from_url(url)
        elif text:
            logger.info(f"[QUIZ] Processing direct text input")
            source_type = "TEXT"
            content = text
            logger.info(f"[QUIZ] Text length: {len(content)} characters")
        else:
            logger.error(f"[QUIZ ERROR] No input source provided")
            logger.info("=" * 80)
            raise HTTPException(status_code=400, detail="Please provide text, PDF, or URL")
        
        logger.info(f"[QUIZ] Content extracted from {source_type}: {len(content)} characters")
        logger.info(f"[QUIZ] Content preview: {content[:200]}...")
        
        if len(content) < 50:
            logger.error(f"[QUIZ ERROR] Content too short: {len(content)} characters")
            logger.info("=" * 80)
            raise HTTPException(status_code=400, detail="Content too short. Need at least 50 characters.")
        
        logger.info(f"[QUIZ] Content length valid")
        
        # Truncate content if too long
        content_to_use = content[:15000]
        if len(content) > 15000:
            logger.info(f"[QUIZ] Content truncated from {len(content)} to 15000 characters")
        
        # Prompt Engineering for JSON Output
        logger.info(f"[QUIZ] Building prompt for Gemini AI")
        prompt = f"""
        Act as a strict educational API. Generate {num_questions} multiple-choice questions 
        based strictly on the following text. The difficulty level should be {difficulty}.
        
        Text: "{content_to_use}"

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
        
        logger.info(f"[QUIZ] Sending request to Gemini AI (prompt length: {len(prompt)} chars)")
        try:
            # Try the new API pattern
            response = client.models.generate_content(
                model=model_name,
                contents=prompt
            )
        except AttributeError:
            # Fallback to alternative API pattern
            response = client.generate_content(
                model=model_name,
                contents=prompt
            )
        except Exception as api_error:
            # Handle API-specific errors (quota, rate limits, etc.)
            error_str = str(api_error)
            logger.error(f"[QUIZ ERROR] Gemini API error: {type(api_error).__name__} - {error_str}")
            
            # Check for quota/rate limit errors
            if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str or "quota" in error_str.lower():
                logger.error(f"[QUIZ ERROR] Quota/Rate limit exceeded")
                raise HTTPException(
                    status_code=429,
                    detail="API quota exceeded. Please check your Gemini API quota or try again later."
                )
            # Check for authentication errors
            elif "401" in error_str or "UNAUTHORIZED" in error_str or "invalid API key" in error_str.lower():
                logger.error(f"[QUIZ ERROR] Authentication failed")
                raise HTTPException(
                    status_code=401,
                    detail="Invalid API key. Please check your Gemini API key configuration."
                )
            # Re-raise other API errors
            raise
        logger.info(f"[QUIZ] Gemini AI response received")
        # Extract text from response - handle different response structures
        if hasattr(response, 'text'):
            response_text = response.text
        elif hasattr(response, 'candidates') and len(response.candidates) > 0:
            response_text = response.candidates[0].content.parts[0].text
        elif hasattr(response, 'content') and hasattr(response.content, 'parts'):
            response_text = response.content.parts[0].text
        else:
            response_text = str(response)
        logger.info(f"[QUIZ] Raw response length: {len(response_text)} characters")
        logger.info(f"[QUIZ] Raw response preview: {response_text[:200]}...")
        
        # Clean the response
        logger.info(f"[QUIZ] Cleaning response text")
        clean_text = response_text.strip()
        if clean_text.startswith("```json"):
            logger.info(f"[QUIZ] Removing ```json wrapper")
            clean_text = clean_text[7:-3]
        elif clean_text.startswith("```"):
            logger.info(f"[QUIZ] Removing ``` wrapper")
            clean_text = clean_text[3:-3]
        
        logger.info(f"[QUIZ] Cleaned text length: {len(clean_text)} characters")
        logger.info(f"[QUIZ] Parsing JSON")
        quiz_data = json.loads(clean_text)
        logger.info(f"[QUIZ] JSON parsed successfully: {len(quiz_data)} questions generated")
        
        for idx, q in enumerate(quiz_data):
            logger.info(f"[QUIZ] Q{idx + 1}: {q.get('question', 'N/A')[:80]}...")
        
        logger.info(f"[QUIZ SUCCESS] Quiz generated with {len(quiz_data)} questions")
        logger.info("=" * 80)
        return {"quiz": quiz_data}

    except HTTPException as he:
        logger.error(f"[QUIZ HTTP ERROR] {he.status_code}: {he.detail}")
        logger.info("=" * 80)
        raise
    except json.JSONDecodeError as je:
        logger.error(f"[QUIZ ERROR] JSON decode error: {je}")
        if 'clean_text' in locals():
            logger.error(f"[QUIZ ERROR] Failed to parse: {clean_text[:500]}")
        logger.info("=" * 80)
        raise HTTPException(status_code=500, detail="Failed to parse quiz data from AI response")
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        logger.error(f"[QUIZ ERROR] Unexpected error: {error_type} - {error_msg}")
        
        # Check if it's a quota/rate limit error that wasn't caught earlier
        if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg or "quota" in error_msg.lower():
            logger.info("=" * 80)
            raise HTTPException(
                status_code=429,
                detail="API quota exceeded. Please check your Gemini API quota or try again later."
            )
        # Check for authentication errors
        elif "401" in error_msg or "UNAUTHORIZED" in error_msg or "invalid API key" in error_msg.lower():
            logger.info("=" * 80)
            raise HTTPException(
                status_code=401,
                detail="Invalid API key. Please check your Gemini API key configuration."
            )
        
        logger.info("=" * 80)
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to generate quiz: {error_msg[:200] if len(error_msg) > 200 else error_msg}"
        )