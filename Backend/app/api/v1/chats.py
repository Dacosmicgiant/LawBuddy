from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import (
    get_current_active_user,
    get_chat_service,
    get_ai_service,
    get_pagination_params,
    check_general_rate_limit,
    check_ai_rate_limit,
    verify_chat_ownership
)
from app.services.chat_service import ChatService
from app.services.ai_service import AIService
from app.schemas.chat import (
    ChatSessionCreate,
    ChatSessionUpdate,
    ChatSessionResponse,
    MessageCreate,
    MessageResponse,
    ChatHistoryResponse,
    MessageHistoryResponse
)
from app.schemas.common import SuccessResponse, PaginationParams
from app.models.user import User
from app.models.chat import ChatStatus, MessageRole

router = APIRouter()

@router.post("/", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_chat_session(
    chat_data: ChatSessionCreate,
    current_user: User = Depends(get_current_active_user),
    chat_service: ChatService = Depends(get_chat_service),
    _: None = Depends(check_general_rate_limit)
):
    """
    Create a new chat session
    
    - **title**: Chat session title
    - **initial_message**: Optional first message to start the conversation
    """
    try:
        chat = await chat_service.create_chat_session(current_user, chat_data)
        
        return ChatSessionResponse(
            id=str(chat.id),
            title=chat.title,
            preview=chat.preview,
            status=chat.status,
            metadata=chat.metadata.dict(),
            tags=chat.tags,
            created_at=chat.created_at.isoformat(),
            updated_at=chat.updated_at.isoformat(),
            last_message_at=chat.last_message_at.isoformat() if chat.last_message_at else None
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while creating chat session"
        )

@router.get("/", response_model=ChatHistoryResponse)
async def get_user_chat_history(
    status_filter: Optional[ChatStatus] = Query(None, description="Filter by chat status"),
    pagination: PaginationParams = Depends(get_pagination_params),
    current_user: User = Depends(get_current_active_user),
    chat_service: ChatService = Depends(get_chat_service),
    _: None = Depends(check_general_rate_limit)
):
    """
    Get user's chat history with pagination
    
    - **status**: Optional filter by chat status (active, archived, deleted)
    - **page**: Page number (default: 1)
    - **size**: Page size (default: 20, max: 100)
    """
    try:
        return await chat_service.get_user_chat_history(
            current_user,
            page=pagination.page,
            size=pagination.size,
            status=status_filter
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching chat history"
        )

@router.get("/{chat_id}", response_model=ChatSessionResponse)
async def get_chat_session(
    chat_id: str,
    current_user: User = Depends(get_current_active_user),
    chat_service: ChatService = Depends(get_chat_service),
    _: None = Depends(check_general_rate_limit)
):
    """
    Get a specific chat session by ID
    """
    try:
        chat = await chat_service.get_chat_session(chat_id, current_user)
        
        return ChatSessionResponse(
            id=str(chat.id),
            title=chat.title,
            preview=chat.preview,
            status=chat.status,
            metadata=chat.metadata.dict(),
            tags=chat.tags,
            created_at=chat.created_at.isoformat(),
            updated_at=chat.updated_at.isoformat(),
            last_message_at=chat.last_message_at.isoformat() if chat.last_message_at else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching chat session"
        )

@router.put("/{chat_id}", response_model=ChatSessionResponse)
async def update_chat_session(
    chat_id: str,
    update_data: ChatSessionUpdate,
    current_user: User = Depends(get_current_active_user),
    chat_service: ChatService = Depends(get_chat_service),
    _: None = Depends(check_general_rate_limit)
):
    """
    Update a chat session
    
    - **title**: New chat title
    - **status**: New chat status
    - **tags**: New tags list
    """
    try:
        chat = await chat_service.update_chat_session(chat_id, current_user, update_data)
        
        return ChatSessionResponse(
            id=str(chat.id),
            title=chat.title,
            preview=chat.preview,
            status=chat.status,
            metadata=chat.metadata.dict(),
            tags=chat.tags,
            created_at=chat.created_at.isoformat(),
            updated_at=chat.updated_at.isoformat(),
            last_message_at=chat.last_message_at.isoformat() if chat.last_message_at else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while updating chat session"
        )

@router.delete("/{chat_id}", response_model=SuccessResponse)
async def delete_chat_session(
    chat_id: str,
    current_user: User = Depends(get_current_active_user),
    chat_service: ChatService = Depends(get_chat_service),
    _: None = Depends(check_general_rate_limit)
):
    """
    Delete a chat session (soft delete)
    """
    try:
        await chat_service.delete_chat_session(chat_id, current_user)
        
        return SuccessResponse(
            message="Chat session deleted successfully",
            data={"chat_id": chat_id}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while deleting chat session"
        )

@router.get("/{chat_id}/messages", response_model=MessageHistoryResponse)
async def get_chat_messages(
    chat_id: str,
    pagination: PaginationParams = Depends(get_pagination_params),
    current_user: User = Depends(get_current_active_user),
    chat_service: ChatService = Depends(get_chat_service),
    _: None = Depends(check_general_rate_limit)
):
    """
    Get messages for a specific chat session
    
    - **page**: Page number (default: 1)
    - **size**: Page size (default: 50, max: 100)
    """
    try:
        return await chat_service.get_chat_messages(
            chat_id,
            current_user,
            page=pagination.page,
            size=pagination.size
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching chat messages"
        )

@router.post("/{chat_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    chat_id: str,
    message_data: MessageCreate,
    current_user: User = Depends(get_current_active_user),
    chat_service: ChatService = Depends(get_chat_service),
    ai_service: AIService = Depends(get_ai_service),
    _: None = Depends(check_ai_rate_limit)
):
    """
    Send a message in a chat session
    
    - **content**: Message content
    - **role**: Message role (user, assistant, system)
    - **message_type**: Message type (text, image, document)
    
    For user messages, this will automatically generate an AI response.
    """
    try:
        # Add user message
        user_message = await chat_service.add_message(chat_id, current_user, message_data)
        
        # If it's a user message, generate AI response
        if message_data.role == MessageRole.USER and ai_service.is_available():
            try:
                # Generate AI response
                ai_response = await ai_service.generate_response(
                    message_data.content,
                    chat_id,
                    current_user
                )
                
                if ai_response["success"]:
                    # Create AI message
                    ai_message_data = MessageCreate(
                        content=ai_response["content"],
                        role=MessageRole.ASSISTANT
                    )
                    
                    ai_message = await chat_service.add_message(chat_id, current_user, ai_message_data)
                    
                    # Update AI metadata
                    if ai_response["metadata"]:
                        await chat_service.update_message_ai_metadata(
                            str(ai_message.id),
                            ai_response["metadata"]
                        )
                
            except Exception as ai_error:
                print(f"Error generating AI response: {ai_error}")
                # Continue without AI response if there's an error
        
        return MessageResponse(
            id=str(user_message.id),
            chat_session_id=str(user_message.chat_session_id),
            role=user_message.role,
            content=user_message.content,
            message_type=user_message.message_type,
            ai_metadata=user_message.ai_metadata.dict() if user_message.ai_metadata else None,
            formatting=user_message.formatting.dict() if user_message.formatting else None,
            timestamp=user_message.timestamp.isoformat(),
            created_at=user_message.created_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while sending message"
        )

@router.get("/search", response_model=MessageHistoryResponse)
async def search_messages(
    q: str = Query(..., description="Search query"),
    pagination: PaginationParams = Depends(get_pagination_params),
    current_user: User = Depends(get_current_active_user),
    chat_service: ChatService = Depends(get_chat_service),
    _: None = Depends(check_general_rate_limit)
):
    """
    Search messages across all user's chat sessions
    
    - **q**: Search query string
    - **page**: Page number (default: 1)
    - **size**: Page size (default: 20, max: 100)
    """
    try:
        if len(q.strip()) < 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Search query must be at least 3 characters long"
            )
        
        return await chat_service.search_chat_messages(
            current_user,
            q.strip(),
            page=pagination.page,
            size=pagination.size
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while searching messages"
        )

@router.get("/{chat_id}/analytics", response_model=Dict[str, Any])
async def get_chat_analytics(
    chat_id: str,
    current_user: User = Depends(get_current_active_user),
    chat_service: ChatService = Depends(get_chat_service),
    _: None = Depends(verify_chat_ownership),
    __: None = Depends(check_general_rate_limit)
):
    """
    Get analytics for a specific chat session
    """
    try:
        # Verify chat ownership through dependency
        
        # Get basic chat analytics (placeholder implementation)
        analytics = {
            "chat_id": chat_id,
            "message_count": 0,
            "user_messages": 0,
            "ai_messages": 0,
            "avg_response_time": 0.0,
            "legal_categories": [],
            "satisfaction_score": None
        }
        
        # TODO: Implement actual analytics calculation
        # This would involve aggregating data from the messages collection
        
        return analytics
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching chat analytics"
        )

@router.get("/analytics/overview", response_model=Dict[str, Any])
async def get_user_chat_analytics(
    current_user: User = Depends(get_current_active_user),
    chat_service: ChatService = Depends(get_chat_service),
    _: None = Depends(check_general_rate_limit)
):
    """
    Get overall chat analytics for the current user
    """
    try:
        analytics = await chat_service.get_chat_analytics(current_user)
        return analytics
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching user analytics"
        )