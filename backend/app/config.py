import os
import json
from typing import List
from pydantic_settings import BaseSettings

def get_cors_origins() -> List[str]:
    raw = os.getenv("CORS_ORIGINS")
    if not raw:
        return [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
        ]
    raw = raw.strip()
    if raw == "*":
        return ["*"]
    if raw.startswith("[") and raw.endswith("]"):
        try:
            return json.loads(raw)
        except Exception:
            pass
    return [origin.strip() for origin in raw.split(",") if origin.strip()]

def get_database_url() -> str:
    url = os.getenv("DATABASE_URL", "sqlite:///./examduty.db")
    # Render and Heroku provide postgres:// but SQLAlchemy requires postgresql://
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url

class Settings(BaseSettings):
    PROJECT_NAME: str = "ExamDuty AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Database
    DATABASE_URL: str = get_database_url()
    
    # Security / Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "examduty-super-secret-key-vfstr-agentic-2026-secure")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # CORS
    CORS_ORIGINS: List[str] = get_cors_origins()

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
