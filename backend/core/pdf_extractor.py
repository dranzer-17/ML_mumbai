"""
PDF text extraction utility
"""
from fastapi import HTTPException
from pypdf import PdfReader
import io
from logger import get_logger

logger = get_logger(__name__)

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
