import os
from dotenv import load_dotenv

load_dotenv()

# Authentication & Security
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable is required")

ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

# API Keys
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
if not TAVILY_API_KEY:
    raise ValueError("TAVILY_API_KEY environment variable is required")

# Video Transcript API Keys (Optional)
TRANSCRIPT_API_KEY = os.getenv("TRANSCRIPT_API_KEY")  # For YouTube transcripts
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")  # For video transcription

# Multiple Gemini API Keys for automatic switching
GEMINI_API_KEYS = []
for i in range(1, 10):  # Support up to 9 API keys
    key = os.getenv(f"GEMINI_API_KEY_{i}")
    if key:
        GEMINI_API_KEYS.append(key)

if not GEMINI_API_KEYS:
    raise ValueError("At least one GEMINI_API_KEY_X environment variable is required (e.g., GEMINI_API_KEY_1)")

GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-2.5-flash")

# Database
MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise ValueError("MONGO_URI environment variable is required")
