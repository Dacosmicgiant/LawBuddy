# models/chat.py
from datetime import datetime
from typing import List, Dict, Any, Optional
from enum import Enum
from bson import ObjectId
from pydantic import BaseModel, Field, field_validator

from app.models.base import BaseMongoModel, PyObjectId

class ChatStatus(str, Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"
    DELETED = "deleted"

class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"

class MessageType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    DOCUMENT = "document"

class ChatMetadata(BaseModel):
    message_count: int = 0
    legal_categories: List[str] = []
    ai_confidence_avg: float = 0.0
    user_satisfaction: Optional[float] = None

class ChatSession(BaseMongoModel):
    user_id: PyObjectId
    title: str
    preview: str = ""
    status: ChatStatus = ChatStatus.ACTIVE
    metadata: ChatMetadata = ChatMetadata()
    tags: List[str] = []
    last_message_at: Optional[datetime] = None

class AIMetadata(BaseModel):
    model_used: Optional[str] = None
    confidence_score: Optional[float] = None
    processing_time: Optional[float] = None
    token_usage: Optional[int] = None
    legal_sources: List[str] = []
    fact_checked: bool = False

class MessageFormatting(BaseModel):
    has_formatting: bool = False
    sections: List[str] = []
    citations: List[str] = []

class UserInteraction(BaseModel):
    helpful_rating: Optional[int] = None
    feedback: Optional[str] = None
    follow_up_questions: List[str] = []

class Message(BaseMongoModel):
    chat_session_id: PyObjectId
    user_id: PyObjectId
    role: MessageRole
    content: str
    message_type: MessageType = MessageType.TEXT
    ai_metadata: Optional[AIMetadata] = None
    formatting: Optional[MessageFormatting] = None
    user_interaction: Optional[UserInteraction] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    @field_validator('content')
    @classmethod
    def content_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Content cannot be empty')
        return v.strip()
