# schemas/chat.py - Enhanced with new features
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, field_validator, ConfigDict
from datetime import datetime
from app.models.chat import ChatStatus, MessageRole, MessageType, MessageStatus, ResponseFormat

class ChatSessionCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    
    title: str
    initial_message: Optional[str] = None
    context_window_size: Optional[int] = 10
    tags: Optional[List[str]] = []
    
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
    context_window_size: Optional[int] = None

class EnhancedChatMetadata(BaseModel):
    message_count: int = 0
    legal_categories: List[str] = []
    ai_confidence_avg: float = 0.0
    user_satisfaction: Optional[float] = None
    total_tokens_used: int = 0
    total_cost: float = 0.0
    conversation_length: int = 0

class ChatSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    title: str
    preview: str
    status: ChatStatus
    metadata: EnhancedChatMetadata
    tags: List[str]
    created_at: str
    updated_at: str
    last_message_at: Optional[str] = None
    conversation_summary: Optional[str] = None
    context_window_size: int = 10

class MessageCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    
    content: str
    role: MessageRole = MessageRole.USER
    message_type: MessageType = MessageType.TEXT
    response_format: Optional[ResponseFormat] = ResponseFormat.MARKDOWN
    
    @field_validator('content')
    @classmethod
    def content_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Content cannot be empty')
        return v.strip()

class TokenUsageResponse(BaseModel):
    input_tokens: int
    output_tokens: int
    total_tokens: int
    estimated_cost: float

class AIMetadataResponse(BaseModel):
    model_used: Optional[str] = None
    confidence_score: Optional[float] = None
    processing_time: Optional[float] = None
    token_usage: Optional[TokenUsageResponse] = None
    legal_sources: List[str] = []
    fact_checked: bool = False
    response_format: ResponseFormat = ResponseFormat.TEXT
    temperature: float = 0.7
    safety_ratings: Optional[Dict[str, Any]] = None
    finish_reason: Optional[str] = None

class MessageFormattingResponse(BaseModel):
    has_formatting: bool = False
    sections: List[str] = []
    citations: List[str] = []
    code_blocks: List[Dict[str, str]] = []
    markdown_elements: List[str] = []
    has_tables: bool = False
    has_lists: bool = False

class UserInteractionResponse(BaseModel):
    helpful_rating: Optional[int] = None
    feedback: Optional[str] = None
    follow_up_questions: List[str] = []
    bookmarked: bool = False
    shared: bool = False
    regeneration_count: int = 0
    edit_count: int = 0

class ConversationBranchResponse(BaseModel):
    branch_id: str
    parent_message_id: Optional[str] = None
    branch_point: Optional[str] = None
    branch_reason: str = "user_regeneration"
    is_active_branch: bool = True

class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    chat_session_id: str
    role: MessageRole
    content: str
    message_type: MessageType
    status: MessageStatus = MessageStatus.COMPLETE
    ai_metadata: Optional[AIMetadataResponse] = None
    formatting: Optional[MessageFormattingResponse] = None
    user_interaction: Optional[UserInteractionResponse] = None
    timestamp: str
    created_at: str
    
    # Enhanced fields
    conversation_branch: Optional[ConversationBranchResponse] = None
    parent_message_id: Optional[str] = None
    version: int = 1
    is_streaming: bool = False
    stream_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None  # Additional metadata

class MessageInteractionUpdate(BaseModel):
    helpful_rating: Optional[int] = None
    feedback: Optional[str] = None
    bookmarked: Optional[bool] = None
    shared: Optional[bool] = None
    
    @field_validator('helpful_rating')
    @classmethod
    def validate_rating(cls, v):
        if v is not None and (v < 1 or v > 5):
            raise ValueError('Rating must be between 1 and 5')
        return v

class ConversationBranchCreate(BaseModel):
    parent_message_id: str
    branch_reason: str = "user_choice"

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

class ChatAnalyticsResponse(BaseModel):
    chat_id: str
    message_statistics: Dict[str, Any]
    ai_performance: Dict[str, Any]
    branching_statistics: Dict[str, Any]
    user_interaction: Dict[str, Any]
    conversation_health: Dict[str, Any]
    legal_categories: List[str]
    generated_at: str

class ConversationExportRequest(BaseModel):
    format: str = "json"
    include_metadata: bool = True
    include_branches: bool = False
    
    @field_validator('format')
    @classmethod
    def validate_format(cls, v):
        if v not in ["json", "markdown", "txt"]:
            raise ValueError('Format must be json, markdown, or txt')
        return v

# Enhanced WebSocket schemas
class EnhancedWebSocketMessage(BaseModel):
    type: str  # send_message, regenerate_message, edit_message, cancel_generation, switch_branch
    content: Optional[str] = None
    chat_session_id: Optional[str] = None
    message_id: Optional[str] = None
    role: Optional[MessageRole] = None
    response_format: Optional[ResponseFormat] = ResponseFormat.MARKDOWN
    branch_id: Optional[str] = None
    stream_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class EnhancedWebSocketResponse(BaseModel):
    type: str
    content: Optional[str] = None
    message_id: Optional[str] = None
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    
    # Enhanced fields for streaming
    stream_id: Optional[str] = None
    is_streaming: Optional[bool] = None
    status: Optional[MessageStatus] = None
    ai_metadata: Optional[AIMetadataResponse] = None
    formatting: Optional[MessageFormattingResponse] = None
    
    # Branch-related fields
    branch_info: Optional[ConversationBranchResponse] = None
    branches: Optional[List[Dict[str, Any]]] = None

# Search and filtering schemas
class MessageSearchRequest(BaseModel):
    query: str
    chat_id: Optional[str] = None
    role: Optional[MessageRole] = None
    message_type: Optional[MessageType] = None
    status: Optional[MessageStatus] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    include_branches: bool = False
    
    @field_validator('query')
    @classmethod
    def query_must_not_be_empty(cls, v):
        if len(v.strip()) < 3:
            raise ValueError('Search query must be at least 3 characters long')
        return v.strip()

class MessageSearchResponse(BaseModel):
    messages: List[MessageResponse]
    total: int
    page: int
    size: int
    has_next: bool
    search_metadata: Dict[str, Any]

# Advanced filtering for chat sessions
class ChatSessionFilter(BaseModel):
    status: Optional[ChatStatus] = None
    tags: Optional[List[str]] = None
    legal_categories: Optional[List[str]] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    min_messages: Optional[int] = None
    max_messages: Optional[int] = None
    has_ai_responses: Optional[bool] = None

# Batch operations
class BatchMessageOperation(BaseModel):
    operation: str  # delete, archive, tag, rate
    message_ids: List[str]
    parameters: Optional[Dict[str, Any]] = None
    
    @field_validator('operation')
    @classmethod
    def validate_operation(cls, v):
        allowed_ops = ["delete", "archive", "tag", "rate", "bookmark"]
        if v not in allowed_ops:
            raise ValueError(f'Operation must be one of: {", ".join(allowed_ops)}')
        return v

class BatchOperationResponse(BaseModel):
    operation: str
    total_requested: int
    successful: int
    failed: int
    errors: List[str] = []
    processed_ids: List[str] = []

# AI service configuration
class AIServiceConfig(BaseModel):
    model: str = "gemini-1.5-flash"
    temperature: float = 0.7
    max_tokens: Optional[int] = 2048
    response_format: ResponseFormat = ResponseFormat.MARKDOWN
    enable_caching: bool = True
    context_window_size: int = 10
    
    @field_validator('temperature')
    @classmethod
    def validate_temperature(cls, v):
        if v < 0 or v > 2:
            raise ValueError('Temperature must be between 0 and 2')
        return v

# Performance monitoring
class ServiceHealthResponse(BaseModel):
    status: str
    timestamp: str
    services: Dict[str, str]
    metrics: Dict[str, Any]
    features: Dict[str, bool]
    error: Optional[str] = None

class PerformanceMetrics(BaseModel):
    avg_response_time: float
    total_requests: int
    error_rate: float
    cache_hit_rate: float
    active_connections: int
    pending_messages: int
    streaming_messages: int
    memory_usage: Optional[float] = None
    cpu_usage: Optional[float] = None