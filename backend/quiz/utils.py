"""
Utility functions for quiz operations
"""
from fastapi import HTTPException, UploadFile
from pypdf import PdfReader
from tavily import TavilyClient
import io
from logger import get_logger
from config import TAVILY_API_KEY

logger = get_logger(__name__)

# Configure Tavily
tavily_client = TavilyClient(api_key=TAVILY_API_KEY)

def extract_text_from_pdf(file_content: bytes, filename: str) -> str:
    """
    Extract text from PDF file with detailed logging
    
    Args:
        file_content: PDF file content as bytes
        filename: Name of the PDF file
        
    Returns:
        Extracted text content as string
        
    Raises:
        HTTPException: If PDF extraction fails
    """
    logger.info("=" * 80)
    logger.info(f"[PDF EXTRACT] Starting PDF extraction")
    logger.info(f"[PDF EXTRACT] Filename: {filename}")
    logger.info(f"[PDF EXTRACT] File size: {len(file_content)} bytes")
    
    try:
        logger.info(f"[PDF EXTRACT] Creating PdfReader from bytes")
        pdf_reader = PdfReader(io.BytesIO(file_content))
        total_pages = len(pdf_reader.pages)
        logger.info(f"[PDF EXTRACT] PDF opened successfully")
        logger.info(f"[PDF EXTRACT] Total pages: {total_pages}")
        
        text = ""
        for idx, page in enumerate(pdf_reader.pages):
            logger.info(f"[PDF EXTRACT] Processing page {idx + 1}/{total_pages}")
            page_text = page.extract_text()
            page_text_length = len(page_text)
            logger.info(f"[PDF EXTRACT] Page {idx + 1} extracted: {page_text_length} characters")
            
            if page_text_length > 0:
                text += page_text + "\n"
                logger.info(f"[PDF EXTRACT] Page {idx + 1} text preview: {page_text[:100]}...")
            else:
                logger.warning(f"[PDF EXTRACT] Page {idx + 1} returned empty text")
        
        text = text.strip()
        total_text_length = len(text)
        logger.info(f"[PDF EXTRACT] Total text extracted: {total_text_length} characters")
        logger.info(f"[PDF EXTRACT] Text preview (first 200 chars): {text[:200]}...")
        logger.info(f"[PDF EXTRACT] PDF extraction completed successfully")
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        logger.error("=" * 80)
        logger.error(f"[PDF EXTRACT ERROR] Failed to read PDF {filename}")
        logger.error(f"[PDF EXTRACT ERROR] Error type: {error_type}")
        logger.error(f"[PDF EXTRACT ERROR] Error message: {error_msg}")
        logger.error("=" * 80)
        raise HTTPException(status_code=400, detail=f"Failed to read PDF: {error_msg}")
    
    logger.info("=" * 80)
    return text

def extract_text_from_url(url: str) -> str:
    """
    Extract text content from URL using Tavily API with detailed logging
    
    Args:
        url: URL to extract content from
        
    Returns:
        Extracted text content as string
        
    Raises:
        HTTPException: If URL extraction fails
    """
    logger.info("=" * 80)
    logger.info(f"[URL EXTRACT] Starting URL extraction")
    logger.info(f"[URL EXTRACT] Target URL: {url}")
    
    try:
        logger.info(f"[URL EXTRACT] Initializing Tavily API call")
        logger.info(f"[URL EXTRACT] Tavily API key configured: {'Yes' if TAVILY_API_KEY else 'No'}")
        
        logger.info(f"[URL EXTRACT] Calling Tavily extract API")
        response = tavily_client.extract(urls=[url])
        
        response_str = str(response)
        logger.info(f"[URL EXTRACT] Tavily API response received")
        logger.info(f"[URL EXTRACT] Response length: {len(response_str)} characters")
        logger.info(f"[URL EXTRACT] Response type: {type(response)}")
        
        if response and isinstance(response, dict):
            results = response.get("results", [])
            logger.info(f"[URL EXTRACT] Number of results: {len(results)}")
            
            if len(results) > 0:
                first_result = results[0]
                logger.info(f"[URL EXTRACT] Processing first result")
                logger.info(f"[URL EXTRACT] Result keys: {list(first_result.keys())}")
                
                content = first_result.get("raw_content", "")
                content_length = len(content)
                logger.info(f"[URL EXTRACT] Content extracted: {content_length} characters")
                
                if content_length > 0:
                    logger.info(f"[URL EXTRACT] Content preview (first 200 chars): {content[:200]}...")
                    logger.info(f"[URL EXTRACT] URL extraction completed successfully")
                    logger.info("=" * 80)
                    return content
                else:
                    logger.warning(f"[URL EXTRACT] Content is empty")
            else:
                logger.error(f"[URL EXTRACT ERROR] No results in Tavily response")
        else:
            logger.error(f"[URL EXTRACT ERROR] Invalid response format from Tavily")
        
        logger.error(f"[URL EXTRACT ERROR] No content extracted from {url}")
        raise Exception("No content extracted from URL")
        
    except HTTPException:
        # Re-raise HTTPExceptions as-is
        raise
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        logger.error("=" * 80)
        logger.error(f"[URL EXTRACT ERROR] Failed to extract from URL: {url}")
        logger.error(f"[URL EXTRACT ERROR] Error type: {error_type}")
        logger.error(f"[URL EXTRACT ERROR] Error message: {error_msg}")
        logger.error("=" * 80)
        raise HTTPException(status_code=400, detail=f"Failed to extract from URL: {error_msg}")

def validate_content(content: str, min_length: int = 50) -> bool:
    """
    Validate content length with detailed logging
    
    Args:
        content: Content to validate
        min_length: Minimum required length
        
    Returns:
        True if content is valid
        
    Raises:
        HTTPException: If content is too short
    """
    logger.info("=" * 80)
    logger.info(f"[CONTENT VALIDATE] Starting content validation")
    logger.info(f"[CONTENT VALIDATE] Content length: {len(content)} characters")
    logger.info(f"[CONTENT VALIDATE] Minimum required: {min_length} characters")
    
    if len(content) < min_length:
        logger.error(f"[CONTENT VALIDATE ERROR] Content too short")
        logger.error(f"[CONTENT VALIDATE ERROR] Provided: {len(content)} chars, Required: {min_length} chars")
        logger.info("=" * 80)
        raise HTTPException(
            status_code=400, 
            detail=f"Content too short. Need at least {min_length} characters."
        )
    
    logger.info(f"[CONTENT VALIDATE] Content validation passed")
    logger.info("=" * 80)
    return True
