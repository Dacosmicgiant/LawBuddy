# models/chat.py - Enhanced with status tracking and conversation branching
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
    CODE = "code"
    MARKDOWN = "markdown"

class MessageStatus(str, Enum):
    PENDING = "pending"
    STREAMING = "streaming"
    COMPLETE = "complete"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REGENERATING = "regenerating"

class ResponseFormat(str, Enum):
    TEXT = "text"
    MARKDOWN = "markdown"
    JSON = "json"
    CODE = "code"

class ChatMetadata(BaseModel):
    message_count: int = 0
    legal_categories: List[str] = []
    ai_confidence_avg: float = 0.0
    user_satisfaction: Optional[float] = None
    total_tokens_used: int = 0
    total_cost: float = 0.0
    conversation_length: int = 0

class ChatSession(BaseMongoModel):
    user_id: PyObjectId
    title: str
    preview: str = ""
    status: ChatStatus = ChatStatus.ACTIVE
    metadata: ChatMetadata = ChatMetadata()
    tags: List[str] = []
    last_message_at: Optional[datetime] = None
    conversation_summary: Optional[str] = None
    context_window_size: int = 10  # Number of messages to keep in context

class TokenUsage(BaseModel):
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    estimated_cost: float = 0.0

class AIMetadata(BaseModel):
    model_used: Optional[str] = None
    confidence_score: Optional[float] = None
    processing_time: Optional[float] = None
    token_usage: Optional[TokenUsage] = None
    legal_sources: List[str] = []
    fact_checked: bool = False
    response_format: ResponseFormat = ResponseFormat.TEXT
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    safety_ratings: Optional[Dict[str, Any]] = None
    finish_reason: Optional[str] = None

class MessageFormatting(BaseModel):
    has_formatting: bool = False
    sections: List[str] = []
    citations: List[str] = []
    code_blocks: List[Dict[str, str]] = []  # [{"language": "python", "code": "..."}]
    markdown_elements: List[str] = []
    has_tables: bool = False
    has_lists: bool = False

class UserInteraction(BaseModel):
    helpful_rating: Optional[int] = None  # 1-5 scale
    feedback: Optional[str] = None
    follow_up_questions: List[str] = []
    bookmarked: bool = False
    shared: bool = False
    regeneration_count: int = 0
    edit_count: int = 0

class ConversationBranch(BaseModel):
    branch_id: str = Field(default_factory=lambda: str(ObjectId()))
    parent_message_id: Optional[PyObjectId] = None
    branch_point: Optional[datetime] = None
    branch_reason: str = "user_regeneration"  # regeneration, edit, alternative_response
    is_active_branch: bool = True

class Message(BaseMongoModel):
    chat_session_id: PyObjectId
    user_id: PyObjectId
    role: MessageRole
    content: str
    message_type: MessageType = MessageType.TEXT
    status: MessageStatus = MessageStatus.COMPLETE
    ai_metadata: Optional[AIMetadata] = None
    formatting: Optional[MessageFormatting] = None
    user_interaction: Optional[UserInteraction] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    # Conversation branching
    conversation_branch: Optional[ConversationBranch] = None
    parent_message_id: Optional[PyObjectId] = None
    child_message_ids: List[PyObjectId] = []
    
    # Message versioning
    version: int = 1
    original_message_id: Optional[PyObjectId] = None
    edit_history: List[Dict[str, Any]] = []
    
    # Streaming support
    stream_id: Optional[str] = None
    is_streaming: bool = False
    partial_content: str = ""
    final_content: str = ""

    @field_validator('content')
    @classmethod
    def content_must_not_be_empty_for_complete_messages(cls, v, info):
        # Allow empty content for streaming messages
        if info.data and info.data.get('status') in [MessageStatus.STREAMING, MessageStatus.PENDING]:
            return v
        
        if not v or not v.strip():
            raise ValueError('Content cannot be empty for complete messages')
        return v.strip()

class ConversationContext(BaseModel):
    """Manages conversation context for AI responses"""
    session_id: str
    messages: List[Dict[str, Any]] = []
    context_window_size: int = 10
    token_count: int = 0
    max_context_tokens: int = 4000
    summary: Optional[str] = None
    last_summarized_at: Optional[datetime] = None

class ConversationMemory(BaseModel):
    """Long-term conversation memory beyond context window"""
    session_id: str
    key_topics: List[str] = []
    important_facts: List[str] = []
    user_preferences: Dict[str, Any] = {}
    conversation_summaries: List[str] = []
    legal_case_history: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)