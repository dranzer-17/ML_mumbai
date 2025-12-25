from fastapi import APIRouter, Depends, File, UploadFile, Form, HTTPException
from auth.routes import get_current_user
from workflow.schemas import SaveWorkflowRequest
from workflow.services import generate_workflow
from core.pdf_extractor import extract_text_from_pdf
from core.url_extractor import extract_text_from_url
from database import db
from logger import get_logger
from typing import Optional

logger = get_logger(__name__)
import io

router = APIRouter()

@router.post("/generate")
async def generate_workflow_route(
    text: Optional[str] = Form(None),
    url: Optional[str] = Form(None),
    pdf: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Generate a Mermaid workflow diagram from text, URL, or PDF
    """
    logger.info(f"User {current_user['user_id']} generating workflow")
    
    content = ""
    content_source = ""
    
    try:
        # Extract content from input
        if text:
            content = text
            content_source = "text"
            logger.info("Using text input for workflow")
        elif url:
            content = extract_text_from_url(url)
            content_source = "url"
            logger.info(f"Extracted content from URL: {url}")
        elif pdf:
            pdf_bytes = await pdf.read()
            content = extract_text_from_pdf(io.BytesIO(pdf_bytes))
            content_source = "pdf"
            logger.info(f"Extracted content from PDF: {pdf.filename}")
        else:
            raise HTTPException(status_code=400, detail="No input provided (text, url, or pdf required)")
        
        if not content or len(content) < 50:
            raise HTTPException(status_code=400, detail="Content too short. Minimum 50 characters required.")
        
        # Generate workflow (AI determines optimal number of nodes)
        result = generate_workflow(content)
        
        return {
            "mermaid_code": result["mermaid_code"],
            "original_content": content,
            "content_source": content_source
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate workflow: {str(e)}")


@router.post("/save")
async def save_workflow_route(
    request: SaveWorkflowRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Save a workflow diagram to database
    """
    user_id = current_user["user_id"]
    logger.info(f"User {user_id} saving workflow")
    
    try:
        # Get next workflow ID
        def get_next_sequence(name: str) -> int:
            counter = db.counters.find_one_and_update(
                {"_id": name},
                {"$inc": {"seq": 1}},
                upsert=True,
                return_document=True
            )
            return counter["seq"]
        
        workflow_id = get_next_sequence("workflow_id")
        
        workflow_doc = {
            "workflow_id": workflow_id,
            "user_id": user_id,
            "mermaid_code": request.mermaid_code,
            "original_content": request.original_content,
            "content_source": request.content_source,
            "created_at": logger.name  # Will use timestamp
        }
        
        db.workflows.insert_one(workflow_doc)
        logger.info(f"Workflow {workflow_id} saved for user {user_id}")
        
        return {"message": "Workflow saved successfully", "workflow_id": workflow_id}
    
    except Exception as e:
        logger.error(f"Error saving workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save workflow: {str(e)}")


@router.get("/history")
async def get_workflow_history(current_user: dict = Depends(get_current_user)):
    """
    Get all workflows for the current user
    """
    user_id = current_user["user_id"]
    logger.info(f"Fetching workflow history for user {user_id}")
    
    try:
        workflows = list(db.workflows.find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("workflow_id", -1))
        
        # Format workflows for response
        workflow_list = []
        for wf in workflows:
            workflow_list.append({
                "workflow_id": wf["workflow_id"],
                "content_source": wf["content_source"],
                "created_at": wf.get("created_at", "")
            })
        
        return {"workflows": workflow_list}
    
    except Exception as e:
        logger.error(f"Error fetching workflow history: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch workflow history")


@router.get("/history/{workflow_id}")
async def get_workflow_by_id(
    workflow_id: int,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific workflow by ID
    """
    user_id = current_user["user_id"]
    logger.info(f"User {user_id} fetching workflow {workflow_id}")
    
    try:
        workflow = db.workflows.find_one(
            {"workflow_id": workflow_id, "user_id": user_id},
            {"_id": 0}
        )
        
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        return {"workflow": workflow}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching workflow: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch workflow")
