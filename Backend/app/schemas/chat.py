# schemas/chat.py
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, field_validator, ConfigDict
from datetime import datetime
from app.models.chat import ChatStatus, MessageRole, MessageType

class ChatSessionCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    
    title: str
    initial_message: Optional[str] = None
    
    @field_validator('title')
    @classmethod
    def title_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Title cannot be empty')
        return v.strip()

class ChatSessionUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[ChatStatus] = None
    tags: Optional[List[str]] = None

class ChatSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    title: str
    preview: str
    status: ChatStatus
    metadata: Dict[str, Any]
    tags: List[str]
    created_at: str
    updated_at: str
    last_message_at: Optional[str] = None

class MessageCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    
    content: str
    role: MessageRole = MessageRole.USER
    message_type: MessageType = MessageType.TEXT
    
    @field_validator('content')
    @classmethod
    def content_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Content cannot be empty')
        return v.strip()

class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    chat_session_id: str
    role: MessageRole
    content: str
    message_type: MessageType
    ai_metadata: Optional[Dict[str, Any]] = None
    formatting: Optional[Dict[str, Any]] = None
    timestamp: str
    created_at: str

class ChatHistoryResponse(BaseModel):
    chat_sessions: List[ChatSessionResponse]
    total: int
    page: int
    size: int
    has_next: bool

class MessageHistoryResponse(BaseModel):
    messages: List[MessageResponse]
    total: int
    page: int
    size: int
    has_next: bool
