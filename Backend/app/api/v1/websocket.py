import json
import asyncio
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from typing import Dict, Optional

from app.api.deps import get_current_active_user, get_db, generate_connection_id
from app.websocket.manager import connection_manager, websocket_handler
from app.services.chat_service import EnhancedChatService
from app.services.ai_service import AIService
from app.schemas.chat import MessageCreate
from app.schemas.websocket import WebSocketMessage, WebSocketResponse
from app.models.chat import MessageRole, MessageStatus, ResponseFormat
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()

async def get_websocket_user(token: str, db):
    """Authenticate user for WebSocket connection"""
    from app.services.auth_service import AuthService
    auth_service = AuthService(db)
    try:
        return await auth_service.get_current_user(token)
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail="WebSocket authentication failed"
        )

@router.websocket("/chat")
async def enhanced_websocket_chat_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="JWT access token"),
    chat_id: Optional[str] = Query(None, description="Chat session ID to join")
):
    """
    Enhanced WebSocket endpoint for real-time chat with AI streaming
    
    **Features:**
    - Real-time message streaming from AI
    - Message status tracking (pending, streaming, complete, failed)
    - Message regeneration support
    - Conversation branching
    - Robust error handling and reconnection
    
    **Message Types:**
    - send_message: Send a new message (triggers AI response)
    - regenerate_message: Regenerate an AI response
    - edit_message: Edit a user message
    - cancel_generation: Cancel ongoing AI generation
    - switch_branch: Switch conversation branch
    - get_branches: Get conversation branches
    - typing: Send typing indicator
    - ping: Keep connection alive
    - join_chat: Join a specific chat room
    - leave_chat: Leave a chat room
    
    **Response Types:**
    - message_status: Message status update
    - ai_stream_start: AI response streaming started
    - ai_stream_chunk: AI response chunk
    - ai_stream_complete: AI response completed
    - ai_stream_error: AI response error
    - message_regenerated: Message regeneration result
    - branch_switched: Branch switch confirmation
    - pong: Response to ping
    - error: Error message
    """
    
    db = await get_db()
    connection_id = generate_connection_id()
    
    try:
        # Authenticate user
        user = await get_websocket_user(token, db)
        
        # Accept connection
        await connection_manager.connect(websocket, user, connection_id)
        
        # Join chat room if specified
        if chat_id:
            await connection_manager.join_chat_room(chat_id, str(user.id), connection_id)
        
        # Initialize enhanced services
        chat_service = EnhancedChatService(db)
        ai_service = AIService(db)
        
        # Track active generations for this connection
        active_generations: Dict[str, str] = {}  # stream_id -> generation_task_id
        
        # Main message loop
        while True:
            try:
                # Receive message
                data = await websocket.receive_text()
                message_data = json.loads(data)
                
                message_type = message_data.get("type")
                logger.info(f"Received WebSocket message: {message_type} from user {user.email}")
                
                if message_type == "send_message":
                    await handle_send_message(
                        websocket, user, connection_id, message_data,
                        chat_service, ai_service, active_generations
                    )
                    
                elif message_type == "regenerate_message":
                    await handle_regenerate_message(
                        websocket, user, connection_id, message_data,
                        chat_service, ai_service, active_generations
                    )
                    
                elif message_type == "edit_message":
                    await handle_edit_message(
                        websocket, user, connection_id, message_data,
                        chat_service
                    )
                    
                elif message_type == "cancel_generation":
                    await handle_cancel_generation(
                        websocket, user, message_data, active_generations
                    )
                    
                elif message_type == "switch_branch":
                    await handle_switch_branch(
                        websocket, user, message_data, chat_service
                    )
                    
                elif message_type == "get_branches":
                    await handle_get_branches(
                        websocket, user, message_data, chat_service
                    )
                    
                elif message_type == "get_messages":
                    await handle_get_messages(
                        websocket, user, message_data, chat_service
                    )
                    
                elif message_type == "create_chat":
                    await handle_create_chat(
                        websocket, user, message_data, chat_service
                    )
                    
                elif message_type == "get_chat_list":
                    await handle_get_chat_list(
                        websocket, user, message_data, chat_service
                    )
                    
                else:
                    # Handle other message types (join, leave, typing, ping, etc.)
                    await websocket_handler.handle_message(
                        websocket, user, connection_id, message_data
                    )
                    
            except json.JSONDecodeError:
                await connection_manager.send_to_connection(
                    websocket,
                    WebSocketResponse(
                        type="error",
                        error="Invalid JSON message format"
                    )
                )
            except Exception as e:
                logger.error(f"Error processing WebSocket message: {e}")
                await connection_manager.send_to_connection(
                    websocket,
                    WebSocketResponse(
                        type="error",
                        error=f"Error processing message: {str(e)}"
                    )
                )
                
    except HTTPException as e:
        # Authentication failed
        await websocket.close(code=4001, reason=f"Authentication failed: {e.detail}")
        
    except WebSocketDisconnect:
        # Client disconnected - cancel any active generations
        for stream_id, task_id in active_generations.items():
            try:
                # Cancel any pending AI generations
                chat_service = EnhancedChatService(db)
                await chat_service.fail_message(stream_id, "Connection disconnected")
            except Exception as e:
                logger.error(f"Error canceling generation on disconnect: {e}")
        
        connection_manager.disconnect(connection_id)
        logger.info(f"WebSocket client disconnected: {connection_id}")
        
    except Exception as e:
        # Unexpected error
        logger.error(f"WebSocket error: {e}")
        connection_manager.disconnect(connection_id)
        await websocket.close(code=1011, reason="Internal server error")

async def handle_send_message(
    websocket: WebSocket,
    user: User,
    connection_id: str,
    message_data: dict,
    chat_service: EnhancedChatService,
    ai_service: AIService,
    active_generations: Dict[str, str]
):
    """Handle sending a new message with AI response generation"""
    
    try:
        chat_id = message_data["chat_session_id"]
        content = message_data["content"]
        role = message_data.get("role", "user")
        response_format = message_data.get("response_format", ResponseFormat.MARKDOWN)
        
        # Validate message
        if not content or not content.strip():
            await connection_manager.send_to_connection(
                websocket,
                WebSocketResponse(
                    type="error",
                    error="Message content cannot be empty"
                )
            )
            return
        
        # Create user message
        user_message_create = MessageCreate(
            content=content.strip(),
            role=MessageRole.USER
        )
        
        # Add user message to database (completes immediately)
        user_message = await chat_service.add_message_with_status_tracking(
            chat_id, user, user_message_create
        )
        
        # Send user message confirmation
        await connection_manager.send_to_connection(
            websocket,
            WebSocketResponse(
                type="message_sent",
                content=content,
                message_id=str(user_message.id),
                metadata={
                    "chat_id": chat_id,
                    "role": "user",
                    "status": "complete",
                    "timestamp": user_message.timestamp.isoformat()
                }
            )
        )
        
        # Broadcast user message to other users in chat (if any)
        await connection_manager.broadcast_to_chat(
            chat_id,
            WebSocketResponse(
                type="new_message",
                content=content,
                message_id=str(user_message.id),
                metadata={
                    "chat_id": chat_id,
                    "role": "user",
                    "user_id": str(user.id),
                    "status": "complete",
                    "timestamp": user_message.timestamp.isoformat()
                }
            ),
            exclude_user=str(user.id)
        )
        
        # Generate AI response if AI service is available
        if ai_service.is_available():
            await generate_ai_response_with_streaming(
                chat_id, content, user, chat_service, ai_service, active_generations, response_format
            )
        else:
            await connection_manager.send_to_connection(
                websocket,
                WebSocketResponse(
                    type="ai_unavailable",
                    error="AI service is currently unavailable",
                    metadata={"chat_id": chat_id}
                )
            )
            
    except Exception as e:
        logger.error(f"Error handling send message: {e}")
        await connection_manager.send_to_connection(
            websocket,
            WebSocketResponse(
                type="error",
                error=f"Error sending message: {str(e)}"
            )
        )

async def handle_regenerate_message(
    websocket: WebSocket,
    user: User,
    connection_id: str,
    message_data: dict,
    chat_service: EnhancedChatService,
    ai_service: AIService,
    active_generations: Dict[str, str]
):
    """Handle message regeneration"""
    
    try:
        message_id = message_data["message_id"]
        chat_id = message_data["chat_session_id"]
        response_format = message_data.get("response_format", ResponseFormat.MARKDOWN)
        
        # Create regenerated message
        regenerated_message = await chat_service.regenerate_message(
            message_id, user
        )
        
        # Send regeneration confirmation
        await connection_manager.send_to_connection(
            websocket,
            WebSocketResponse(
                type="message_regenerated",
                message_id=str(regenerated_message.id),
                metadata={
                    "chat_id": chat_id,
                    "original_message_id": message_id,
                    "status": "pending"
                }
            )
        )
        
        # If it's an AI message, generate new response
        if regenerated_message.role == MessageRole.ASSISTANT:
            # Get the user message that prompted this response
            user_messages = await chat_service.get_active_messages(chat_id, user)
            user_message = None
            
            for msg in reversed(user_messages):
                if msg.role == MessageRole.USER and msg.timestamp < regenerated_message.timestamp:
                    user_message = msg
                    break
            
            if user_message:
                await generate_ai_response_with_streaming(
                    chat_id, user_message.content, user, chat_service, ai_service, 
                    active_generations, response_format, regenerated_message.stream_id
                )
            
    except Exception as e:
        logger.error(f"Error handling regenerate message: {e}")
        await connection_manager.send_to_connection(
            websocket,
            WebSocketResponse(
                type="error",
                error=f"Error regenerating message: {str(e)}"
            )
        )

async def handle_edit_message(
    websocket: WebSocket,
    user: User,
    connection_id: str,
    message_data: dict,
    chat_service: EnhancedChatService
):
    """Handle message editing"""
    
    try:
        message_id = message_data["message_id"]
        new_content = message_data["new_content"]
        
        # Create edited version
        edited_message = await chat_service.regenerate_message(
            message_id, user, new_content
        )
        
        await connection_manager.send_to_connection(
            websocket,
            WebSocketResponse(
                type="message_edited",
                content=new_content,
                message_id=str(edited_message.id),
                metadata={
                    "original_message_id": message_id,
                    "edit_count": edited_message.version
                }
            )
        )
        
    except Exception as e:
        logger.error(f"Error handling edit message: {e}")
        await connection_manager.send_to_connection(
            websocket,
            WebSocketResponse(
                type="error",
                error=f"Error editing message: {str(e)}"
            )
        )

async def handle_cancel_generation(
    websocket: WebSocket,
    user: User,
    message_data: dict,
    active_generations: Dict[str, str]
):
    """Handle canceling AI generation"""
    
    try:
        stream_id = message_data.get("stream_id")
        
        if stream_id and stream_id in active_generations:
            # Cancel the generation task
            task_id = active_generations.pop(stream_id)
            
            # Mark message as cancelled
            chat_service = EnhancedChatService(await get_db())
            await chat_service.fail_message(stream_id, "Generation cancelled by user")
            
            await connection_manager.send_to_connection(
                websocket,
                WebSocketResponse(
                    type="generation_cancelled",
                    metadata={"stream_id": stream_id}
                )
            )
        else:
            await connection_manager.send_to_connection(
                websocket,
                WebSocketResponse(
                    type="error",
                    error="No active generation found to cancel"
                )
            )
            
    except Exception as e:
        logger.error(f"Error handling cancel generation: {e}")
        await connection_manager.send_to_connection(
            websocket,
            WebSocketResponse(
                type="error",
                error=f"Error canceling generation: {str(e)}"
            )
        )

async def handle_switch_branch(
    websocket: WebSocket,
    user: User,
    message_data: dict,
    chat_service: EnhancedChatService
):
    """Handle switching conversation branch"""
    
    try:
        chat_id = message_data["chat_session_id"]
        branch_id = message_data["branch_id"]
        
        success = await chat_service.switch_conversation_branch(chat_id, branch_id, user)
        
        if success:
            await connection_manager.send_to_connection(
                websocket,
                WebSocketResponse(
                    type="branch_switched",
                    metadata={
                        "chat_id": chat_id,
                        "branch_id": branch_id
                    }
                )
            )
            
            # Broadcast to other users in the chat
            await connection_manager.broadcast_to_chat(
                chat_id,
                WebSocketResponse(
                    type="branch_switched",
                    metadata={
                        "chat_id": chat_id,
                        "branch_id": branch_id,
                        "switched_by": str(user.id)
                    }
                ),
                exclude_user=str(user.id)
            )
        else:
            await connection_manager.send_to_connection(
                websocket,
                WebSocketResponse(
                    type="error",
                    error="Failed to switch branch"
                )
            )
            
    except Exception as e:
        logger.error(f"Error handling switch branch: {e}")
        await connection_manager.send_to_connection(
            websocket,
            WebSocketResponse(
                type="error",
                error=f"Error switching branch: {str(e)}"
            )
        )

async def handle_get_branches(
    websocket: WebSocket,
    user: User,
    message_data: dict,
    chat_service: EnhancedChatService
):
    """Handle getting conversation branches"""
    
    try:
        chat_id = message_data["chat_session_id"]
        
        branches = await chat_service.get_conversation_branches(chat_id, user)
        
        await connection_manager.send_to_connection(
            websocket,
            WebSocketResponse(
                type="conversation_branches",
                metadata={
                    "chat_id": chat_id,
                    "branches": branches
                }
            )
        )
        
    except Exception as e:
        logger.error(f"Error handling get branches: {e}")
        await connection_manager.send_to_connection(
            websocket,
            WebSocketResponse(
                type="error",
                error=f"Error getting branches: {str(e)}"
            )
        )

async def handle_get_messages(
    websocket: WebSocket,
    user: User,
    message_data: dict,
    chat_service: EnhancedChatService
):
    """Handle getting messages for a chat"""
    
    try:
        chat_id = message_data["chat_session_id"]
        limit = message_data.get("limit", 50)
        skip = message_data.get("skip", 0)
        branch_id = message_data.get("branch_id")
        
        # Get messages
        messages = await chat_service.get_active_messages(chat_id, user)
        
        # Convert to dict format
        message_list = []
        for msg in messages[skip:skip+limit]:
            message_dict = {
                "id": str(msg.id),
                "chat_session_id": str(msg.chat_session_id),
                "role": msg.role,
                "content": msg.content,
                "message_type": msg.message_type,
                "status": msg.status,
                "timestamp": msg.timestamp.isoformat(),
                "created_at": msg.created_at.isoformat()
            }
            
            if msg.ai_metadata:
                message_dict["ai_metadata"] = msg.ai_metadata.dict()
            if msg.formatting:
                message_dict["formatting"] = msg.formatting.dict()
            if msg.user_interaction:
                message_dict["user_interaction"] = msg.user_interaction.dict()
            
            message_list.append(message_dict)
        
        await connection_manager.send_to_connection(
            websocket,
            WebSocketResponse(
                type="messages_list",
                metadata={
                    "chat_id": chat_id,
                    "messages": message_list,
                    "total": len(messages),
                    "limit": limit,
                    "skip": skip
                }
            )
        )
        
    except Exception as e:
        logger.error(f"Error handling get messages: {e}")
        await connection_manager.send_to_connection(
            websocket,
            WebSocketResponse(
                type="error",
                error=f"Error getting messages: {str(e)}"
            )
        )

async def handle_create_chat(
    websocket: WebSocket,
    user: User,
    message_data: dict,
    chat_service: EnhancedChatService
):
    """Handle creating a new chat session"""
    
    try:
        title = message_data.get("title", "New Chat")
        initial_message = message_data.get("initial_message")
        
        from app.schemas.chat import ChatSessionCreate
        chat_create = ChatSessionCreate(
            title=title,
            initial_message=initial_message
        )
        
        chat = await chat_service.create_chat_session(user, chat_create)
        
        await connection_manager.send_to_connection(
            websocket,
            WebSocketResponse(
                type="chat_created",
                metadata={
                    "chat": {
                        "id": str(chat.id),
                        "title": chat.title,
                        "preview": chat.preview,
                        "status": chat.status,
                        "created_at": chat.created_at.isoformat(),
                        "updated_at": chat.updated_at.isoformat()
                    }
                }
            )
        )
        
    except Exception as e:
        logger.error(f"Error handling create chat: {e}")
        await connection_manager.send_to_connection(
            websocket,
            WebSocketResponse(
                type="error",
                error=f"Error creating chat: {str(e)}"
            )
        )

async def handle_get_chat_list(
    websocket: WebSocket,
    user: User,
    message_data: dict,
    chat_service: EnhancedChatService
):
    """Handle getting user's chat list"""
    
    try:
        limit = message_data.get("limit", 20)
        skip = message_data.get("skip", 0)
        
        chats = await chat_service.get_user_chat_sessions(
            user, limit=limit, skip=skip
        )
        
        chat_list = []
        for chat in chats:
            chat_dict = {
                "id": str(chat.id),
                "title": chat.title,
                "preview": chat.preview,
                "status": chat.status,
                "tags": chat.tags,
                "created_at": chat.created_at.isoformat(),
                "updated_at": chat.updated_at.isoformat(),
                "last_message_at": chat.last_message_at.isoformat() if chat.last_message_at else None
            }
            chat_list.append(chat_dict)
        
        await connection_manager.send_to_connection(
            websocket,
            WebSocketResponse(
                type="chat_list",
                metadata={
                    "chats": chat_list,
                    "limit": limit,
                    "skip": skip
                }
            )
        )
        
    except Exception as e:
        logger.error(f"Error handling get chat list: {e}")
        await connection_manager.send_to_connection(
            websocket,
            WebSocketResponse(
                type="error",
                error=f"Error getting chat list: {str(e)}"
            )
        )

async def generate_ai_response_with_streaming(
    chat_id: str,
    user_message: str,
    user: User,
    chat_service: EnhancedChatService,
    ai_service: AIService,
    active_generations: Dict[str, str],
    response_format: ResponseFormat = ResponseFormat.MARKDOWN,
    stream_id: Optional[str] = None
):
    """Generate AI response with real-time streaming"""
    
    try:
        # Create pending AI message if stream_id not provided
        if not stream_id:
            ai_message_create = MessageCreate(
                content="",
                role=MessageRole.ASSISTANT
            )
            
            ai_message = await chat_service.create_pending_message(
                chat_id, user, ai_message_create
            )
            stream_id = ai_message.stream_id
            message_id = str(ai_message.id)
        else:
            # Get existing message
            pending_info = chat_service.pending_messages.get(stream_id) or chat_service.streaming_messages.get(stream_id)
            if pending_info:
                message_id = pending_info["message_id"]
            else:
                logger.error(f"No message found for stream_id: {stream_id}")
                return
        
        # Track this generation
        generation_task_id = f"gen_{stream_id}"
        active_generations[stream_id] = generation_task_id
        
        # Notify that AI response started
        await connection_manager.broadcast_to_chat(
            chat_id,
            WebSocketResponse(
                type="ai_stream_start",
                message_id=message_id,
                metadata={
                    "chat_id": chat_id,
                    "stream_id": stream_id,
                    "response_format": response_format
                }
            )
        )
        
        # Start streaming
        await chat_service.start_message_streaming(stream_id)
        
        # Check if streaming is available
        if hasattr(ai_service, 'generate_streaming_response'):
            # Use streaming response
            async for chunk_data in ai_service.generate_streaming_response(
                user_message, chat_id, user, response_format
            ):
                # Check if generation was cancelled
                if stream_id not in active_generations:
                    await chat_service.fail_message(stream_id, "Generation cancelled")
                    return
                
                if chunk_data["type"] == "chunk":
                    chunk_text = chunk_data["content"]
                    
                    # Update streaming message
                    await chat_service.update_streaming_message(stream_id, chunk_text)
                    
                    # Broadcast chunk to chat room
                    await connection_manager.broadcast_to_chat(
                        chat_id,
                        WebSocketResponse(
                            type="ai_stream_chunk",
                            content=chunk_text,
                            message_id=message_id,
                            metadata={
                                "chat_id": chat_id,
                                "stream_id": stream_id,
                                "is_streaming": True
                            }
                        )
                    )
                    
                elif chunk_data["type"] == "complete":
                    # Complete the streaming message
                    await chat_service.complete_streaming_message(
                        stream_id, chunk_data["content"], chunk_data["metadata"], None
                    )
                    
                    # Send completion signal
                    await connection_manager.broadcast_to_chat(
                        chat_id,
                        WebSocketResponse(
                            type="ai_stream_complete",
                            content=chunk_data["content"],
                            message_id=message_id,
                            metadata={
                                "chat_id": chat_id,
                                "stream_id": stream_id,
                                "ai_metadata": chunk_data["metadata"].dict() if chunk_data["metadata"] else None,
                                "is_streaming": False
                            }
                        )
                    )
                    
                    # Remove from active generations
                    active_generations.pop(stream_id, None)
                    break
                    
                elif chunk_data["type"] == "error":
                    # Handle error
                    await chat_service.fail_message(stream_id, chunk_data["content"])
                    
                    await connection_manager.broadcast_to_chat(
                        chat_id,
                        WebSocketResponse(
                            type="ai_stream_error",
                            error=chunk_data["content"],
                            message_id=message_id,
                            metadata={
                                "chat_id": chat_id,
                                "stream_id": stream_id
                            }
                        )
                    )
                    
                    # Remove from active generations
                    active_generations.pop(stream_id, None)
                    break
        else:
            # Fallback to non-streaming response
            ai_response = await ai_service.generate_response(
                user_message,
                chat_id,
                user,
                response_format=response_format,
                regenerate=False
            )
            
            if ai_response["success"]:
                # Complete the streaming message
                await chat_service.complete_streaming_message(
                    stream_id, ai_response["content"], ai_response["metadata"], ai_response.get("formatting")
                )
                
                # Send completion signal
                await connection_manager.broadcast_to_chat(
                    chat_id,
                    WebSocketResponse(
                        type="ai_stream_complete",
                        content=ai_response["content"],
                        message_id=message_id,
                        metadata={
                            "chat_id": chat_id,
                            "stream_id": stream_id,
                            "ai_metadata": ai_response["metadata"].dict() if ai_response["metadata"] else None,
                            "formatting": ai_response.get("formatting").dict() if ai_response.get("formatting") else None,
                            "is_streaming": False
                        }
                    )
                )
                
                # Remove from active generations
                active_generations.pop(stream_id, None)
                    
            else:
                # Handle error
                await chat_service.fail_message(stream_id, ai_response.get("content", "AI generation failed"))
                
                await connection_manager.broadcast_to_chat(
                    chat_id,
                    WebSocketResponse(
                        type="ai_stream_error",
                        error=ai_response.get("content", "AI generation failed"),
                        message_id=message_id,
                        metadata={
                            "chat_id": chat_id,
                            "stream_id": stream_id
                        }
                    )
                )
                
                # Remove from active generations
                active_generations.pop(stream_id, None)
                
    except Exception as e:
        logger.error(f"Error in AI response generation: {e}")
        
        if stream_id:
            await chat_service.fail_message(stream_id, f"Generation error: {str(e)}")
            
            await connection_manager.broadcast_to_chat(
                chat_id,
                WebSocketResponse(
                    type="ai_stream_error",
                    error=f"AI generation failed: {str(e)}",
                    metadata={
                        "chat_id": chat_id,
                        "stream_id": stream_id
                    }
                )
            )
            
            # Remove from active generations
            active_generations.pop(stream_id, None)

# Additional REST endpoints for WebSocket management

@router.get("/stats")
async def get_websocket_stats():
    """Get WebSocket connection statistics"""
    try:
        base_stats = connection_manager.get_stats()
        
        # Add enhanced stats
        enhanced_stats = {
            **base_stats,
            "features": {
                "ai_streaming": True,
                "message_status_tracking": True,
                "conversation_branching": True,
                "message_regeneration": True,
                "real_time_collaboration": True,
                "chat_management": True
            }
        }
        
        return {
            "success": True,
            "data": enhanced_stats
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching WebSocket stats: {str(e)}"
        )

@router.post("/broadcast/{chat_id}")
async def broadcast_to_chat(
    chat_id: str,
    message: dict,
    current_user: User = Depends(get_current_active_user)
):
    """Broadcast a message to all users in a chat room (admin/testing only)"""
    try:
        # Verify user has access to this chat
        db = await get_db()
        chat_service = EnhancedChatService(db)
        await chat_service.get_chat_session(chat_id, current_user)
        
        # Broadcast message
        await connection_manager.broadcast_to_chat(
            chat_id,
            WebSocketResponse(
                type="broadcast",
                content=message.get("content"),
                metadata={
                    "chat_id": chat_id,
                    "broadcast_by": str(current_user.id),
                    **message.get("metadata", {})
                }
            )
        )
        
        return {
            "success": True,
            "message": "Message broadcasted successfully",
            "data": {
                "chat_id": chat_id,
                "recipients": connection_manager.get_active_users_in_chat(chat_id)
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error broadcasting message: {str(e)}"
        )

@router.post("/notify/{user_id}")
async def notify_user(
    user_id: str,
    message: dict,
    current_user: User = Depends(get_current_active_user)
):
    """Send a direct notification to a specific user"""
    try:
        # Send notification to user
        await connection_manager.send_to_user(
            user_id,
            WebSocketResponse(
                type="notification",
                content=message.get("content"),
                metadata={
                    "from_user": str(current_user.id),
                    "notification_type": message.get("type", "general"),
                    **message.get("metadata", {})
                }
            )
        )
        
        return {
            "success": True,
            "message": "Notification sent successfully",
            "data": {
                "target_user": user_id,
                "connections": connection_manager.get_user_connection_count(user_id)
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error sending notification: {str(e)}"
        )

@router.get("/connections")
async def get_active_connections(
    current_user: User = Depends(get_current_active_user)
):
    """Get information about active WebSocket connections"""
    try:
        user_connections = connection_manager.get_user_connection_count(str(current_user.id))
        total_connections = connection_manager.get_total_connections()
        
        return {
            "success": True,
            "data": {
                "user_connections": user_connections,
                "total_connections": total_connections,
                "user_id": str(current_user.id),
                "is_connected": user_connections > 0
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting connection info: {str(e)}"
        )

@router.post("/health")
async def websocket_health_check():
    """WebSocket service health check"""
    try:
        stats = connection_manager.get_stats()
        
        # Check if services are responsive
        db = await get_db()
        await db.command("ping")
        
        ai_service = AIService(db)
        ai_available = ai_service.is_available()
        
        health_data = {
            "status": "healthy",
            "timestamp": "2024-12-20T12:00:00Z",  # Use actual timestamp in production
            "websocket": {
                "status": "operational",
                "active_connections": stats["total_connections"],
                "active_users": stats["active_users"],
                "active_chat_rooms": stats["active_chat_rooms"]
            },
            "services": {
                "database": "healthy",
                "ai_service": "healthy" if ai_available else "unavailable",
                "connection_manager": "healthy"
            },
            "features": {
                "real_time_messaging": True,
                "ai_streaming": ai_available,
                "conversation_branching": True,
                "message_regeneration": True,
                "typing_indicators": True,
                "presence_tracking": True
            }
        }
        
        return health_data
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": "2024-12-20T12:00:00Z"
        }

@router.delete("/connections/{connection_id}")
async def force_disconnect(
    connection_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Force disconnect a specific connection (admin only)"""
    try:
        # In a real implementation, you'd check admin privileges here
        # For now, users can only disconnect their own connections
        
        user_id = str(current_user.id)
        user_connections = connection_manager.active_connections.get(user_id, {})
        
        if connection_id in user_connections:
            # Disconnect the specific connection
            connection_manager.disconnect(connection_id)
            
            return {
                "success": True,
                "message": "Connection disconnected successfully",
                "data": {
                    "connection_id": connection_id,
                    "user_id": user_id
                }
            }
        else:
            raise HTTPException(
                status_code=404,
                detail="Connection not found or access denied"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error disconnecting connection: {str(e)}"
        )

@router.get("/chat/{chat_id}/users")
async def get_chat_users(
    chat_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get list of users currently active in a chat"""
    try:
        # Verify user has access to this chat
        db = await get_db()
        chat_service = EnhancedChatService(db)
        await chat_service.get_chat_session(chat_id, current_user)
        
        # Get active users in chat
        active_users = connection_manager.get_active_users_in_chat(chat_id)
        
        return {
            "success": True,
            "data": {
                "chat_id": chat_id,
                "active_users": active_users,
                "user_count": len(active_users),
                "current_user_active": str(current_user.id) in active_users
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting chat users: {str(e)}"
        )

@router.post("/chat/{chat_id}/typing")
async def send_typing_indicator(
    chat_id: str,
    is_typing: bool,
    current_user: User = Depends(get_current_active_user)
):
    """Send typing indicator to chat (REST alternative to WebSocket)"""
    try:
        # Verify user has access to this chat
        db = await get_db()
        chat_service = EnhancedChatService(db)
        await chat_service.get_chat_session(chat_id, current_user)
        
        # Send typing indicator
        await connection_manager.handle_typing_indicator(
            chat_id, str(current_user.id), is_typing
        )
        
        return {
            "success": True,
            "message": f"Typing indicator {'started' if is_typing else 'stopped'}",
            "data": {
                "chat_id": chat_id,
                "user_id": str(current_user.id),
                "is_typing": is_typing
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error sending typing indicator: {str(e)}"
        )

# Development/debugging endpoints
@router.get("/debug/connections")
async def debug_connections():
    """Debug endpoint to see all active connections (development only)"""
    try:
        debug_info = {
            "active_connections": {
                user_id: list(connections.keys()) 
                for user_id, connections in connection_manager.active_connections.items()
            },
            "chat_rooms": connection_manager.chat_rooms,
            "connection_users": connection_manager.connection_users,
            "typing_indicators": {
                chat_id: {
                    user_id: timestamp.isoformat() 
                    for user_id, timestamp in users.items()
                }
                for chat_id, users in connection_manager.typing_indicators.items()
            },
            "stats": connection_manager.get_stats()
        }
        
        return {
            "success": True,
            "data": debug_info
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting debug info: {str(e)}"
        )

@router.post("/debug/simulate-message")
async def simulate_message(
    chat_id: str,
    message: str,
    current_user: User = Depends(get_current_active_user)
):
    """Simulate a message for testing purposes (development only)"""
    try:
        # Simulate receiving a message
        await connection_manager.broadcast_to_chat(
            chat_id,
            WebSocketResponse(
                type="simulated_message",
                content=message,
                metadata={
                    "chat_id": chat_id,
                    "simulated_by": str(current_user.id),
                    "timestamp": "2024-12-20T12:00:00Z"
                }
            )
        )
        
        return {
            "success": True,
            "message": "Simulated message sent",
            "data": {
                "chat_id": chat_id,
                "message": message,
                "recipients": connection_manager.get_active_users_in_chat(chat_id)
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error simulating message: {str(e)}"
        )