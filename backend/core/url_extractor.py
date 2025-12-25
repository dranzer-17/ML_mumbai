"""
URL content extraction utility using Tavily API
"""
from fastapi import HTTPException
from tavily import TavilyClient
from logger import get_logger
from config import TAVILY_API_KEY

logger = get_logger(__name__)

# Configure Tavily
tavily_client = TavilyClient(api_key=TAVILY_API_KEY)

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
        
        # Extract content from response
        if hasattr(response, 'results') and response.results:
            logger.info(f"[URL EXTRACT] Found {len(response.results)} results")
            content = response.results[0].raw_content
            logger.info(f"[URL EXTRACT] Extracted content length: {len(content)} characters")
            logger.info(f"[URL EXTRACT] Content preview: {content[:200]}...")
        else:
            logger.warning(f"[URL EXTRACT] No results found in response, using fallback")
            content = str(response)
        
        logger.info(f"[URL EXTRACT] URL extraction completed successfully")
        logger.info("=" * 80)
        return content
        
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        logger.error("=" * 80)
        logger.error(f"[URL EXTRACT ERROR] Failed to extract from URL: {url}")
        logger.error(f"[URL EXTRACT ERROR] Error type: {error_type}")
        logger.error(f"[URL EXTRACT ERROR] Error message: {error_msg}")
        logger.error("=" * 80)
        raise HTTPException(status_code=400, detail=f"Failed to extract from URL: {error_msg}")
