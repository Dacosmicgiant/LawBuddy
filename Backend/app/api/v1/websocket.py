import json
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from typing import Optional

from app.api.deps import get_db, generate_connection_id, get_current_active_user
from app.websocket.manager import connection_manager, websocket_handler
from app.services.chat_service import ChatService
from app.services.ai_service import AIService
from app.schemas.chat import MessageCreate
from app.schemas.websocket import WebSocketMessage, WebSocketResponse
from app.models.chat import MessageRole
from app.models.user import User

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
async def websocket_chat_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="JWT access token"),
    chat_id: Optional[str] = Query(None, description="Chat session ID to join")
):
    """
    WebSocket endpoint for real-time chat functionality
    
    **Query Parameters:**
    - token: JWT access token for authentication
    - chat_id: Optional chat session ID to join immediately
    
    **Message Types:**
    - join_chat: Join a specific chat room
    - leave_chat: Leave a chat room
    - message: Send a message (triggers AI response)
    - typing: Send typing indicator
    - ping: Keep connection alive
    
    **Response Types:**
    - connection_established: Connection successful
    - joined_chat: Successfully joined chat room
    - message_sent: Message sent successfully
    - ai_response_chunk: Streaming AI response chunk
    - ai_response_complete: AI response completed
    - typing_indicator: User typing status
    - error: Error occurred
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
        
        # Initialize services
        chat_service = ChatService(db)
        ai_service = AIService(db)
        
        # Main message loop
        while True:
            try:
                # Receive message
                data = await websocket.receive_text()
                message_data = json.loads(data)
                
                # Handle special message types
                if message_data.get("type") == "message" and message_data.get("chat_session_id"):
                    await handle_chat_message(
                        websocket,
                        user,
                        connection_id,
                        message_data,
                        chat_service,
                        ai_service
                    )
                else:
                    # Handle other message types (join, leave, typing, etc.)
                    await websocket_handler.handle_message(
                        websocket,
                        user,
                        connection_id,
                        message_data
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
        # Client disconnected
        connection_manager.disconnect(connection_id)
        print(f"WebSocket client disconnected: {connection_id}")
        
    except Exception as e:
        # Unexpected error
        print(f"WebSocket error: {e}")
        connection_manager.disconnect(connection_id)
        await websocket.close(code=1011, reason="Internal server error")

async def handle_chat_message(
    websocket: WebSocket,
    user: User,
    connection_id: str,
    message_data: dict,
    chat_service: ChatService,
    ai_service: AIService
):
    """Handle chat message with AI response"""
    
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
        
        # Create message
        message_create = MessageCreate(
            content=content.strip(),
            role=MessageRole(role)
        )
        
        # Add message to database
        message = await chat_service.add_message(chat_id, user, message_create)
        
        # Send confirmation to user
        await connection_manager.send_to_connection(
            websocket,
            WebSocketResponse(
                type="message_sent",
                content=content,
                message_id=str(message.id),
                metadata={
                    "chat_id": chat_id,
                    "role": role,
                    "timestamp": message.timestamp.isoformat()
                }
            )
        )
        
        # Broadcast message to other users in chat (if any)
        await connection_manager.broadcast_to_chat(
            chat_id,
            WebSocketResponse(
                type="new_message",
                content=content,
                message_id=str(message.id),
                metadata={
                    "chat_id": chat_id,
                    "role": role,
                    "user_id": str(user.id),
                    "timestamp": message.timestamp.isoformat()
                }
            ),
            exclude_user=str(user.id)
        )
        
        # Generate AI response if it's a user message
        if role == "user" and ai_service.is_available():
            await generate_streaming_ai_response(
                chat_id,
                content,
                user,
                chat_service,
                ai_service
            )
            
    except Exception as e:
        await connection_manager.send_to_connection(
            websocket,
            WebSocketResponse(
                type="error",
                error=f"Error processing chat message: {str(e)}"
            )
        )

async def generate_streaming_ai_response(
    chat_id: str,
    user_message: str,
    user: User,
    chat_service: ChatService,
    ai_service: AIService
):
    """Generate and stream AI response"""
    
    try:
        # Create placeholder AI message
        ai_message_create = MessageCreate(
            content="",
            role=MessageRole.ASSISTANT
        )
        
        ai_message = await chat_service.add_message(chat_id, user, ai_message_create)
        message_id = str(ai_message.id)
        
        # Notify chat room that AI is responding
        await connection_manager.broadcast_to_chat(
            chat_id,
            WebSocketResponse(
                type="ai_response_started",
                message_id=message_id,
                metadata={
                    "chat_id": chat_id,
                    "timestamp": ai_message.timestamp.isoformat()
                }
            )
        )
        
        # Generate streaming response
        response_generator = ai_service.generate_streaming_response(
            user_message,
            chat_id,
            user
        )
        
        # Stream response to chat room
        await connection_manager.stream_ai_response(
            chat_id,
            message_id,
            response_generator
        )
        
        # Update message with final content and metadata
        # This would be handled in the stream_ai_response method
        
    except Exception as e:
        # Send error to chat room
        await connection_manager.broadcast_to_chat(
            chat_id,
            WebSocketResponse(
                type="ai_response_error",
                error=f"Error generating AI response: {str(e)}",
                metadata={"chat_id": chat_id}
            )
        )

@router.get("/stats")
async def get_websocket_stats():
    """
    Get WebSocket connection statistics
    
    **Returns:**
    - total_connections: Total active WebSocket connections
    - active_users: Number of users with active connections
    - active_chat_rooms: Number of active chat rooms
    - typing_users: Number of users currently typing
    """
    try:
        stats = connection_manager.get_stats()
        return {
            "success": True,
            "data": stats
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching WebSocket stats: {str(e)}"
        )

@router.post("/broadcast/{chat_id}")
async def broadcast_to_chat(
    chat_id: str,
    message: str,
    message_type: str = "system",
    current_user: User = Depends(get_current_active_user)
):
    """
    Broadcast a message to all users in a chat room
    
    **Note:** This is an admin/system endpoint for sending announcements
    """
    try:
        # Verify user has permission to broadcast (admin check)
        # In production, you'd check admin roles here
        
        await connection_manager.broadcast_to_chat(
            chat_id,
            WebSocketResponse(
                type="system_message",
                content=message,
                metadata={
                    "chat_id": chat_id,
                    "message_type": message_type,
                    "from_admin": True
                }
            )
        )
        
        return {
            "success": True,
            "message": "Message broadcasted successfully",
            "data": {
                "chat_id": chat_id,
                "recipients": len(connection_manager.get_active_users_in_chat(chat_id))
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error broadcasting message: {str(e)}"
        )

@router.websocket("/test")
async def websocket_test_endpoint(websocket: WebSocket):
    """
    Simple WebSocket test endpoint for debugging
    """
    await websocket.accept()
    
    try:
        await websocket.send_text(json.dumps({
            "type": "connection_test",
            "message": "WebSocket connection successful",
            "timestamp": asyncio.get_event_loop().time()
        }))
        
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Echo back the message
            response = {
                "type": "echo",
                "original_message": message,
                "timestamp": asyncio.get_event_loop().time()
            }
            
            await websocket.send_text(json.dumps(response))
            
    except WebSocketDisconnect:
        print("Test WebSocket client disconnected")
    except Exception as e:
        print(f"Test WebSocket error: {e}")
        await websocket.close()