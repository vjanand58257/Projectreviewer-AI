import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "prod-session-key-change-me")
    BASE_DIR = BASE_DIR  # expose to blueprints via current_app.config
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    
    # SQLite Database Config
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL", 
        f"sqlite:///{BASE_DIR / 'instance' / 'project_reviewer.db'}"
    )
    
    # File Upload & Allowed Extensions Config
    UPLOAD_FOLDER = BASE_DIR / "uploads"
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100 MB limit
    ALLOWED_EXTENSIONS = {"zip"}
    
    # Logging Configuration Directory
    LOGS_FOLDER = BASE_DIR / "logs"
