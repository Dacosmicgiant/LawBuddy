from pydantic_settings import BaseSettings
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "LawBuddy API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Server Settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Database Settings - MongoDB Atlas
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "lawbuddy"
    
    # Security Settings
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # AI Settings
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-1.5-flash"
    
    # CORS Settings
    ALLOWED_HOSTS: list = ["*"]
    ALLOWED_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ]
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 3600  # 1 hour
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Global settings instance
settings = Settings()

# Validation
if not settings.GEMINI_API_KEY:
    print("Warning: GEMINI_API_KEY not set. AI features will be limited.")

if settings.SECRET_KEY == "your-secret-key-change-in-production":
    print("Warning: Using default SECRET_KEY. Change this in production!")

# MongoDB Atlas specific validation
if "mongodb+srv" in settings.MONGODB_URL:
    print("✅ Using MongoDB Atlas cloud database")
elif "localhost" in settings.MONGODB_URL:
    print("⚠️  Using local MongoDB - make sure it's running")
else:
    print(f"🔗 Using MongoDB at: {settings.MONGODB_URL.split('@')[1] if '@' in settings.MONGODB_URL else settings.MONGODB_URL}")