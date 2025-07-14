from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from typing import Optional, Dict, Any, List
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime

from app.api.deps import (
    get_current_active_user,
    get_db,
    get_pagination_params,
    check_general_rate_limit,
    check_ai_rate_limit
)
from app.services.enhanced_chat_service import EnhancedChatService
from app.services.enhanced_ai_service import AdvancedAIService
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
from app.models.chat import ChatStatus, MessageRole, MessageStatus, ResponseFormat
from app.websocket.manager import connection_manager

router = APIRouter()

@router.post("/", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_enhanced_chat_session(
    chat_data: ChatSessionCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: None = Depends(check_general_rate_limit)
):
    """
    Create a new chat session with enhanced features
    
    **Enhanced Features:**
    - Automatic conversation context management
    - Token usage tracking
    - Cost estimation
    - Legal category detection
    """
    try:
        chat_service = EnhancedChatService(db)
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

@router.post("/{chat_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_enhanced_message(
    chat_id: str,
    message_data: MessageCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
    response_format: ResponseFormat = Query(ResponseFormat.MARKDOWN, description="Response format"),
    regenerate: bool = Query(False, description="Force regeneration even if similar query exists"),
    _: None = Depends(check_ai_rate_limit)
):
    """
    Send a message with enhanced AI integration
    
    **Enhanced Features:**
    - Real-time status tracking
    - Response format control (markdown, text, json)
    - Token usage and cost tracking
    - Conversation context management
    - Response caching
    - Error handling and retry logic
    """
    try:
        chat_service = EnhancedChatService(db)
        ai_service = AdvancedAIService(db)
        
        # Add user message with status tracking
        user_message = await chat_service.add_message_with_status_tracking(
            chat_id, current_user, message_data
        )
        
        # Prepare response
        user_response = MessageResponse(
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
        
        # Generate AI response if it's a user message and AI is available
        if message_data.role == MessageRole.USER and ai_service.is_available():
            background_tasks.add_task(
                generate_ai_response_background,
                chat_id, message_data.content, current_user, db, response_format, regenerate
            )
        
        return user_response
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while sending message"
        )

async def generate_ai_response_background(
    chat_id: str, 
    user_message: str, 
    user: User, 
    db: AsyncIOMotorDatabase,
    response_format: ResponseFormat,
    regenerate: bool
):
    """Background task for AI response generation"""
    try:
        chat_service = EnhancedChatService(db)
        ai_service = AdvancedAIService(db)
        
        # Create pending AI message
        ai_message_create = MessageCreate(
            content="",
            role=MessageRole.ASSISTANT
        )
        
        ai_message = await chat_service.create_pending_message(
            chat_id, user, ai_message_create
        )
        
        stream_id = ai_message.stream_id
        
        # Notify WebSocket clients that AI response started
        await connection_manager.broadcast_to_chat(
            chat_id,
            {
                "type": "ai_response_started",
                "message_id": str(ai_message.id),
                "metadata": {
                    "chat_id": chat_id,
                    "stream_id": stream_id
                }
            }
        )
        
        # Generate AI response
        ai_response = await ai_service.generate_response(
            user_message,
            chat_id,
            user,
            response_format=response_format,
            regenerate=regenerate
        )
        
        if ai_response["success"]:
            # Complete the message
            await chat_service.complete_streaming_message(
                stream_id,
                ai_response["content"],
                ai_response["metadata"],
                ai_response.get("formatting")
            )
            
            # Notify WebSocket clients of completion
            await connection_manager.broadcast_to_chat(
                chat_id,
                {
                    "type": "ai_response_complete",
                    "content": ai_response["content"],
                    "message_id": str(ai_message.id),
                    "metadata": {
                        "chat_id": chat_id,
                        "ai_metadata": ai_response["metadata"].dict() if ai_response["metadata"] else None
                    }
                }
            )
        else:
            # Mark message as failed
            await chat_service.fail_message(stream_id, ai_response.get("content", "AI generation failed"))
            
            # Notify WebSocket clients of error
            await connection_manager.broadcast_to_chat(
                chat_id,
                {
                    "type": "ai_response_error",
                    "error": ai_response.get("content", "AI generation failed"),
                    "message_id": str(ai_message.id),
                    "metadata": {"chat_id": chat_id}
                }
            )
            
    except Exception as e:
        # Handle any errors in background task
        if 'stream_id' in locals():
            await chat_service.fail_message(stream_id, f"Background generation error: {str(e)}")

@router.post("/{chat_id}/messages/{message_id}/regenerate", response_model=MessageResponse)
async def regenerate_message(
    chat_id: str,
    message_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
    response_format: ResponseFormat = Query(ResponseFormat.MARKDOWN, description="Response format"),
    _: None = Depends(check_ai_rate_limit)
):
    """
    Regenerate an AI response or create an alternative version
    
    **Features:**
    - Creates new conversation branch
    - Maintains message history
    - Supports different response formats
    """
    try:
        chat_service = EnhancedChatService(db)
        
        # Create regenerated message
        regenerated_message = await chat_service.regenerate_message(message_id, current_user)
        
        # If it's an AI message, generate new response in background
        if regenerated_message.role == MessageRole.ASSISTANT:
            # Get the user message that prompted this response
            messages = await chat_service.get_active_messages(chat_id, current_user)
            user_message = None
            
            for msg in reversed(messages):
                if msg.role == MessageRole.USER and msg.timestamp < regenerated_message.timestamp:
                    user_message = msg
                    break
            
            if user_message:
                background_tasks.add_task(
                    regenerate_ai_response_background,
                    chat_id, user_message.content, current_user, db, 
                    regenerated_message.stream_id, response_format
                )
        
        return MessageResponse(
            id=str(regenerated_message.id),
            chat_session_id=str(regenerated_message.chat_session_id),
            role=regenerated_message.role,
            content=regenerated_message.content,
            message_type=regenerated_message.message_type,
            ai_metadata=regenerated_message.ai_metadata.dict() if regenerated_message.ai_metadata else None,
            formatting=regenerated_message.formatting.dict() if regenerated_message.formatting else None,
            timestamp=regenerated_message.timestamp.isoformat(),
            created_at=regenerated_message.created_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while regenerating message"
        )

async def regenerate_ai_response_background(
    chat_id: str,
    user_message: str,
    user: User,
    db: AsyncIOMotorDatabase,
    stream_id: str,
    response_format: ResponseFormat
):
    """Background task for AI response regeneration"""
    try:
        chat_service = EnhancedChatService(db)
        ai_service = AdvancedAIService(db)
        
        # Start streaming for regeneration
        await chat_service.start_message_streaming(stream_id)
        
        # Generate new AI response (force regeneration)
        ai_response = await ai_service.generate_response(
            user_message,
            chat_id,
            user,
            response_format=response_format,
            regenerate=True  # Force regeneration
        )
        
        if ai_response["success"]:
            await chat_service.complete_streaming_message(
                stream_id,
                ai_response["content"],
                ai_response["metadata"],
                ai_response.get("formatting")
            )
        else:
            await chat_service.fail_message(stream_id, ai_response.get("content", "Regeneration failed"))
            
    except Exception as e:
        await chat_service.fail_message(stream_id, f"Regeneration error: {str(e)}")

@router.get("/{chat_id}/branches", response_model=List[Dict[str, Any]])
async def get_conversation_branches(
    chat_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: None = Depends(check_general_rate_limit)
):
    """
    Get all conversation branches for a chat session
    
    **Returns:**
    - List of branches with metadata
    - Branch points and reasons
    - Message counts per branch
    """
    try:
        chat_service = EnhancedChatService(db)
        branches = await chat_service.get_conversation_branches(chat_id, current_user)
        return branches
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching conversation branches"
        )

@router.post("/{chat_id}/branches/{branch_id}/switch", response_model=SuccessResponse)
async def switch_conversation_branch(
    chat_id: str,
    branch_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: None = Depends(check_general_rate_limit)
):
    """
    Switch to a different conversation branch
    
    **Features:**
    - Activates selected branch
    - Deactivates other branches
    - Updates conversation context
    """
    try:
        chat_service = EnhancedChatService(db)
        success = await chat_service.switch_conversation_branch(chat_id, branch_id, current_user)
        
        if success:
            # Notify WebSocket clients of branch switch
            await connection_manager.broadcast_to_chat(
                chat_id,
                {
                    "type": "branch_switched",
                    "metadata": {
                        "chat_id": chat_id,
                        "branch_id": branch_id
                    }
                }
            )
            
            return SuccessResponse(
                message="Successfully switched to conversation branch",
                data={
                    "chat_id": chat_id,
                    "branch_id": branch_id
                }
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to switch conversation branch"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while switching conversation branch"
        )

@router.get("/{chat_id}/messages", response_model=MessageHistoryResponse)
async def get_enhanced_chat_messages(
    chat_id: str,
    branch_id: Optional[str] = Query(None, description="Specific branch to get messages from"),
    include_inactive: bool = Query(False, description="Include messages from inactive branches"),
    pagination: PaginationParams = Depends(get_pagination_params),
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: None = Depends(check_general_rate_limit)
):
    """
    Get messages for a chat session with enhanced filtering
    
    **Enhanced Features:**
    - Branch-specific message filtering
    - Status-based filtering
    - Message versioning support
    - Rich metadata inclusion
    """
    try:
        chat_service = EnhancedChatService(db)
        
        # Verify chat ownership
        await chat_service.get_chat_session(chat_id, current_user)
        
        skip = (pagination.page - 1) * pagination.size
        
        # Build query based on branch filtering
        if branch_id:
            query = {
                "chat_session_id": ObjectId(chat_id),
                "conversation_branch.branch_id": branch_id
            }
        elif include_inactive:
            query = {"chat_session_id": ObjectId(chat_id)}
        else:
            query = {
                "chat_session_id": ObjectId(chat_id),
                "$or": [
                    {"conversation_branch.is_active_branch": True},
                    {"conversation_branch": None}  # Main conversation
                ]
            }
        
        # Get total count
        total = await chat_service.messages_collection.count_documents(query)
        
        # Get messages with enhanced data
        cursor = chat_service.messages_collection.find(query).sort("timestamp", 1).skip(skip).limit(pagination.size)
        message_docs = await cursor.to_list(length=pagination.size)
        
        messages = []
        for doc in message_docs:
            message_response = MessageResponse(
                id=str(doc["_id"]),
                chat_session_id=str(doc["chat_session_id"]),
                role=doc["role"],
                content=doc["content"],
                message_type=doc["message_type"],
                ai_metadata=doc.get("ai_metadata"),
                formatting=doc.get("formatting"),
                timestamp=doc["timestamp"].isoformat(),
                created_at=doc["created_at"].isoformat()
            )
            
            # Add enhanced metadata
            message_response.metadata = {
                "status": doc.get("status", "complete"),
                "version": doc.get("version", 1),
                "branch_info": doc.get("conversation_branch"),
                "user_interaction": doc.get("user_interaction"),
                "has_children": len(doc.get("child_message_ids", [])) > 0,
                "is_streaming": doc.get("is_streaming", False)
            }
            
            messages.append(message_response)
        
        return MessageHistoryResponse(
            messages=messages,
            total=total,
            page=pagination.page,
            size=pagination.size,
            has_next=skip + pagination.size < total
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching chat messages"
        )

@router.post("/{chat_id}/messages/{message_id}/interact", response_model=SuccessResponse)
async def update_message_interaction(
    chat_id: str,
    message_id: str,
    interaction_data: Dict[str, Any],
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: None = Depends(check_general_rate_limit)
):
    """
    Update user interaction data for a message
    
    **Supported Interactions:**
    - helpful_rating: 1-5 scale rating
    - feedback: Text feedback
    - bookmarked: Boolean bookmark status
    - shared: Boolean share status
    """
    try:
        chat_service = EnhancedChatService(db)
        
        success = await chat_service.update_message_interaction(
            message_id, current_user, interaction_data
        )
        
        if success:
            return SuccessResponse(
                message="Message interaction updated successfully",
                data={
                    "message_id": message_id,
                    "interaction_data": interaction_data
                }
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found or access denied"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while updating message interaction"
        )

@router.get("/{chat_id}/analytics", response_model=Dict[str, Any])
async def get_enhanced_chat_analytics(
    chat_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: None = Depends(check_general_rate_limit)
):
    """
    Get enhanced analytics for a chat session
    
    **Analytics Include:**
    - Token usage and costs
    - Message statistics by type and status
    - Conversation branching metrics
    - User interaction patterns
    - AI performance metrics
    """
    try:
        chat_service = EnhancedChatService(db)
        ai_service = AdvancedAIService(db)
        
        # Verify chat ownership
        chat = await chat_service.get_chat_session(chat_id, current_user)
        
        # Get conversation health
        conversation_health = await ai_service.get_conversation_health(chat_id)
        
        # Get message statistics
        pipeline = [
            {"$match": {"chat_session_id": ObjectId(chat_id)}},
            {"$group": {
                "_id": None,
                "total_messages": {"$sum": 1},
                "user_messages": {"$sum": {"$cond": [{"$eq": ["$role", "user"]}, 1, 0]}},
                "ai_messages": {"$sum": {"$cond": [{"$eq": ["$role", "assistant"]}, 1, 0]}},
                "failed_messages": {"$sum": {"$cond": [{"$eq": ["$status", "failed"]}, 1, 0]}},
                "regenerated_messages": {"$sum": "$user_interaction.regeneration_count"},
                "avg_ai_confidence": {"$avg": "$ai_metadata.confidence_score"},
                "total_tokens": {"$sum": "$ai_metadata.token_usage.total_tokens"},
                "total_cost": {"$sum": "$ai_metadata.token_usage.estimated_cost"}
            }}
        ]
        
        result = await chat_service.messages_collection.aggregate(pipeline).to_list(1)
        stats = result[0] if result else {}
        
        # Get branch statistics
        branches = await chat_service.get_conversation_branches(chat_id, current_user)
        
        # Get user interaction stats
        interaction_pipeline = [
            {"$match": {"chat_session_id": ObjectId(chat_id)}},
            {"$group": {
                "_id": None,
                "avg_rating": {"$avg": "$user_interaction.helpful_rating"},
                "bookmarked_count": {"$sum": {"$cond": ["$user_interaction.bookmarked", 1, 0]}},
                "shared_count": {"$sum": {"$cond": ["$user_interaction.shared", 1, 0]}}
            }}
        ]
        
        interaction_result = await chat_service.messages_collection.aggregate(interaction_pipeline).to_list(1)
        interaction_stats = interaction_result[0] if interaction_result else {}
        
        analytics = {
            "chat_id": chat_id,
            "chat_metadata": chat.metadata.dict(),
            "conversation_health": conversation_health,
            "message_statistics": {
                "total_messages": stats.get("total_messages", 0),
                "user_messages": stats.get("user_messages", 0),
                "ai_messages": stats.get("ai_messages", 0),
                "failed_messages": stats.get("failed_messages", 0),
                "regenerated_messages": stats.get("regenerated_messages", 0),
                "success_rate": (1 - (stats.get("failed_messages", 0) / max(stats.get("ai_messages", 1), 1))) * 100
            },
            "ai_performance": {
                "avg_confidence": round(stats.get("avg_ai_confidence", 0) or 0, 2),
                "total_tokens": stats.get("total_tokens", 0),
                "total_cost": round(stats.get("total_cost", 0) or 0, 4),
                "avg_cost_per_message": round((stats.get("total_cost", 0) or 0) / max(stats.get("ai_messages", 1), 1), 4)
            },
            "branching_statistics": {
                "total_branches": len(branches),
                "active_branches": len([b for b in branches if b.get("is_active")]),
                "branch_points": [b.get("branch_reason") for b in branches]
            },
            "user_interaction": {
                "avg_rating": round(interaction_stats.get("avg_rating", 0) or 0, 2),
                "bookmarked_messages": interaction_stats.get("bookmarked_count", 0),
                "shared_messages": interaction_stats.get("shared_count", 0)
            },
            "legal_categories": chat.metadata.legal_categories,
            "generated_at": datetime.utcnow().isoformat()
        }
        
        return analytics
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching chat analytics"
        )

@router.post("/{chat_id}/export", response_model=Dict[str, Any])
async def export_conversation(
    chat_id: str,
    format: str = Query("json", regex="^(json|markdown|txt)$", description="Export format"),
    include_metadata: bool = Query(True, description="Include message metadata"),
    include_branches: bool = Query(False, description="Include all conversation branches"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: None = Depends(check_general_rate_limit)
):
    """
    Export conversation in various formats
    
    **Supported Formats:**
    - json: Complete conversation data
    - markdown: Human-readable format
    - txt: Plain text format
    """
    try:
        chat_service = EnhancedChatService(db)
        
        # Get chat session
        chat = await chat_service.get_chat_session(chat_id, current_user)
        
        # Get messages
        if include_branches:
            messages = await chat_service.messages_collection.find({
                "chat_session_id": ObjectId(chat_id)
            }).sort("timestamp", 1).to_list(length=None)
        else:
            messages = await chat_service.get_active_messages(chat_id, current_user)
            messages = [msg.dict() for msg in messages]
        
        export_data = {
            "chat_session": {
                "id": str(chat.id),
                "title": chat.title,
                "created_at": chat.created_at.isoformat(),
                "metadata": chat.metadata.dict() if include_metadata else None
            },
            "messages": [],
            "export_metadata": {
                "exported_at": datetime.utcnow().isoformat(),
                "exported_by": str(current_user.id),
                "format": format,
                "include_metadata": include_metadata,
                "include_branches": include_branches,
                "message_count": len(messages)
            }
        }
        
        # Process messages based on format
        for msg_doc in messages:
            if isinstance(msg_doc, dict):
                msg_dict = msg_doc
            else:
                msg_dict = msg_doc.dict()
            
            message_export = {
                "id": str(msg_dict["_id"]) if "_id" in msg_dict else msg_dict["id"],
                "role": msg_dict["role"],
                "content": msg_dict["content"],
                "timestamp": msg_dict["timestamp"] if isinstance(msg_dict["timestamp"], str) else msg_dict["timestamp"].isoformat()
            }
            
            if include_metadata:
                message_export.update({
                    "message_type": msg_dict.get("message_type"),
                    "status": msg_dict.get("status"),
                    "ai_metadata": msg_dict.get("ai_metadata"),
                    "formatting": msg_dict.get("formatting"),
                    "user_interaction": msg_dict.get("user_interaction"),
                    "conversation_branch": msg_dict.get("conversation_branch")
                })
            
            export_data["messages"].append(message_export)
        
        # Format-specific processing
        if format == "markdown":
            return {"content": _format_as_markdown(export_data), "format": "markdown"}
        elif format == "txt":
            return {"content": _format_as_text(export_data), "format": "txt"}
        else:
            return {"content": export_data, "format": "json"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while exporting conversation"
        )

def _format_as_markdown(export_data: Dict[str, Any]) -> str:
    """Format conversation as markdown"""
    content = f"# {export_data['chat_session']['title']}\n\n"
    content += f"**Created:** {export_data['chat_session']['created_at']}\n"
    content += f"**Messages:** {export_data['export_metadata']['message_count']}\n\n"
    content += "---\n\n"
    
    for msg in export_data["messages"]:
        role = "**You**" if msg["role"] == "user" else "**LawBuddy**"
        timestamp = msg["timestamp"][:19]  # Remove microseconds
        content += f"### {role} ({timestamp})\n\n"
        content += f"{msg['content']}\n\n"
        
        if msg.get("ai_metadata") and msg["ai_metadata"].get("token_usage"):
            tokens = msg["ai_metadata"]["token_usage"]["total_tokens"]
            cost = msg["ai_metadata"]["token_usage"]["estimated_cost"]
            content += f"*Tokens: {tokens}, Cost: ${cost:.4f}*\n\n"
        
        content += "---\n\n"
    
    return content

def _format_as_text(export_data: Dict[str, Any]) -> str:
    """Format conversation as plain text"""
    content = f"{export_data['chat_session']['title']}\n"
    content += "="*50 + "\n\n"
    
    for msg in export_data["messages"]:
        role = "You" if msg["role"] == "user" else "LawBuddy"
        timestamp = msg["timestamp"][:19]
        content += f"{role} ({timestamp}):\n"
        content += f"{msg['content']}\n\n"
        content += "-"*30 + "\n\n"
    
    return content

@router.get("/health", response_model=Dict[str, Any])
async def get_enhanced_chat_health(
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get health status of enhanced chat services
    """
    try:
        chat_service = EnhancedChatService(db)
        ai_service = AdvancedAIService(db)
        
        # Check database connectivity
        await db.command("ping")
        
        # Get service stats
        pending_count = len(chat_service.pending_messages)
        streaming_count = len(chat_service.streaming_messages)
        
        health_data = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "services": {
                "database": "healthy",
                "ai_service": "healthy" if ai_service.is_available() else "unavailable",
                "websocket": "healthy"
            },
            "metrics": {
                "pending_messages": pending_count,
                "streaming_messages": streaming_count,
                "cache_entries": len(ai_service.response_cache),
                "active_contexts": len(ai_service.context_manager.contexts)
            },
            "features": {
                "message_status_tracking": True,
                "conversation_branching": True,
                "ai_streaming": True,
                "token_management": True,
                "cost_tracking": True,
                "response_caching": True
            }
        }
        
        return health_data
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }