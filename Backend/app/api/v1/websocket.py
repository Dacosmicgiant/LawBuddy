import json
import asyncio
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from typing import Dict, Optional

from app.api.deps import get_current_active_user, get_db, generate_connection_id
from app.websocket.manager import connection_manager, websocket_handler
from app.services.enhanced_chat_service import EnhancedChatService
from app.services.enhanced_ai_service import AdvancedAIService
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
    - typing: Send typing indicator
    - ping: Keep connection alive
    
    **Response Types:**
    - message_status: Message status update
    - ai_stream_start: AI response streaming started
    - ai_stream_chunk: AI response chunk
    - ai_stream_complete: AI response completed
    - ai_stream_error: AI response error
    - message_regenerated: Message regeneration result
    - branch_switched: Branch switch confirmation
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
        ai_service = AdvancedAIService(db)
        
        # Track active generations for this connection
        active_generations: Dict[str, str] = {}  # stream_id -> generation_task_id
        
        # Main message loop
        while True:
            try:
                # Receive message
                data = await websocket.receive_text()
                message_data = json.loads(data)
                
                message_type = message_data.get("type")
                
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
                    
                else:
                    # Handle other message types (join, leave, typing, etc.)
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
            # Cancel the generation task (implementation depends on how you track tasks)
            pass
        
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
    ai_service: AdvancedAIService,
    active_generations: Dict[str, str]
):
    """Handle sending a new message with AI response generation"""
    
    try:
        chat_id = message_data["chat_session_id"]
        content = message_data["content"]
        role = message_data.get("role", "user")
        
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
                chat_id, content, user, chat_service, ai_service, active_generations
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
    ai_service: AdvancedAIService,
    active_generations: Dict[str, str]
):
    """Handle message regeneration"""
    
    try:
        message_id = message_data["message_id"]
        chat_id = message_data["chat_session_id"]
        
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
                    active_generations, regenerated_message.stream_id
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
            
            # Note: Actual task cancellation would depend on your task management system
            # For now, we'll just remove it from tracking
            
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

async def generate_ai_response_with_streaming(
    chat_id: str,
    user_message: str,
    user: User,
    chat_service: EnhancedChatService,
    ai_service: AdvancedAIService,
    active_generations: Dict[str, str],
    stream_id: Optional[str] = None
):
    """Generate AI response with real-time streaming"""
    
    try:
        # Create pending AI message
        ai_message_create = MessageCreate(
            content="",
            role=MessageRole.ASSISTANT
        )
        
        ai_message = await chat_service.create_pending_message(
            chat_id, user, ai_message_create, stream_id
        )
        
        stream_id = ai_message.stream_id
        message_id = str(ai_message.id)
        
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
                    "timestamp": ai_message.timestamp.isoformat()
                }
            )
        )
        
        # Start streaming
        await chat_service.start_message_streaming(stream_id)
        
        # Generate streaming response
        response_generator = ai_service.generate_streaming_response(
            user_message,
            chat_id,
            user
        )
        
        full_content = ""
        ai_metadata = None
        formatting = None
        
        async for chunk_data in response_generator:
            # Check if generation was cancelled
            if stream_id not in active_generations:
                await chat_service.fail_message(stream_id, "Generation cancelled")
                return
            
            if chunk_data["type"] == "chunk":
                chunk_text = chunk_data["content"]
                full_content += chunk_text
                
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
                            "full_content": full_content,
                            "is_streaming": True
                        }
                    )
                )
                
            elif chunk_data["type"] == "complete":
                ai_metadata = chunk_data["metadata"]
                formatting = ai_service._extract_formatting(chunk_data["content"])
                
                # Complete the streaming message
                await chat_service.complete_streaming_message(
                    stream_id, chunk_data["content"], ai_metadata, formatting
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
                            "ai_metadata": ai_metadata.dict() if ai_metadata else None,
                            "formatting": formatting.dict() if formatting else None,
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

# Additional endpoints for REST API compatibility

@router.get("/stats")
async def get_enhanced_websocket_stats():
    """Get enhanced WebSocket connection statistics"""
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
                "real_time_collaboration": True
            }
        }
        
        return {
            "success": True,
            "data": enhanced_stats
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching enhanced WebSocket stats: {str(e)}"
        )

@router.post("/message/{message_id}/regenerate")
async def regenerate_message_endpoint(
    message_id: str,
    chat_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """REST endpoint for message regeneration"""
    try:
        db = await get_db()
        chat_service = EnhancedChatService(db)
        
        regenerated_message = await chat_service.regenerate_message(
            message_id, current_user
        )
        
        # Broadcast regeneration to WebSocket clients
        await connection_manager.broadcast_to_chat(
            chat_id,
            WebSocketResponse(
                type="message_regenerated",
                message_id=str(regenerated_message.id),
                metadata={
                    "chat_id": chat_id,
                    "original_message_id": message_id
                }
            )
        )
        
        return {
            "success": True,
            "message": "Message regenerated successfully",
            "data": {
                "regenerated_message_id": str(regenerated_message.id),
                "original_message_id": message_id
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error regenerating message: {str(e)}"
        )