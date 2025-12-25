import os
import logging
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from auth import routes as auth_routes
from quiz import routes as quiz_routes
from explainer import routes as explainer_routes
from flashcards import routes as flashcard_routes
from workflow import routes as workflow_routes
from presentation import routes as presentation_routes
from transcription import routes as transcription_routes
from video_transcript import routes as video_transcript_routes

# --- LOGGING SETUP ---
# 1. Create logs directory if it doesn't exist
if not os.path.exists("logs"):
    os.makedirs("logs")

# 2. Configure the logger to write to logs/app.log
logging.basicConfig(
    filename="logs/app.log",
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

# 3. Create a logger instance for this file
logger = logging.getLogger("Main")

app = FastAPI(title="Saarthi API")

# --- VALIDATION ERROR HANDLER ---
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error("=" * 80)
    logger.error(f"[VALIDATION ERROR] {request.method} {request.url.path}")
    logger.error(f"[VALIDATION ERROR] Client: {request.client.host}:{request.client.port}")
    logger.error(f"[VALIDATION ERROR] Errors: {exc.errors()}")
    logger.error(f"[VALIDATION ERROR] Body: {exc.body}")
    
    # Log detailed error information
    for error in exc.errors():
        logger.error(f"[VALIDATION ERROR] Field: {error.get('loc')}, Type: {error.get('type')}, Message: {error.get('msg')}")
    
    logger.error("=" * 80)
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
    )

# --- CORS SETUP ---
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ROUTERS ---
app.include_router(auth_routes.router, prefix="/api", tags=["Authentication"])
app.include_router(quiz_routes.router, prefix="/api/quiz", tags=["Quiz"])
app.include_router(explainer_routes.router, prefix="/api/explainer", tags=["Explainer"])
app.include_router(flashcard_routes.router, prefix="/api/flashcards", tags=["Flashcards"])
app.include_router(workflow_routes.router, prefix="/api/workflow", tags=["Workflow"])
app.include_router(presentation_routes.router, prefix="/api", tags=["Presentation"])
app.include_router(transcription_routes.router, tags=["Transcription"])
app.include_router(video_transcript_routes.router, tags=["Video Transcript"]) 

# --- EVENTS ---
@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Saarthi Backend Server Started")

@app.get("/")
def read_root():
    logger.info("Root endpoint accessed")
    return {"message": "Saarthi AI Backend is Running 🚀"}