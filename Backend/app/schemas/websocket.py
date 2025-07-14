# schemas/websocket.py
from typing import Optional, Dict, Any
from pydantic import BaseModel
from app.models.chat import MessageRole

class WebSocketMessage(BaseModel):
    type: str  # "message", "typing", "connect", "disconnect"
    content: Optional[str] = None
    chat_session_id: Optional[str] = None
    role: Optional[MessageRole] = None
    metadata: Optional[Dict[str, Any]] = None

class WebSocketResponse(BaseModel):
    type: str
    content: Optional[str] = None
    message_id: Optional[str] = None
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None