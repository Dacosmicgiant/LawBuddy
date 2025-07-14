import json
import asyncio
from typing import Dict, List, Optional, Set
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime
import logging

from app.models.user import User
from app.models.chat import MessageRole
from app.schemas.websocket import WebSocketMessage, WebSocketResponse

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Active WebSocket connections: {user_id: {connection_id: websocket}}
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}
        
        # Chat room memberships: {chat_id: {user_id: connection_id}}
        self.chat_rooms: Dict[str, Dict[str, str]] = {}
        
        # User to connection mapping: {connection_id: user_id}
        self.connection_users: Dict[str, str] = {}
        
        # Typing indicators: {chat_id: {user_id: timestamp}}
        self.typing_indicators: Dict[str, Dict[str, datetime]] = {}

    async def connect(self, websocket: WebSocket, user: User, connection_id: str):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        
        user_id = str(user.id)
        
        # Initialize user connections if not exists
        if user_id not in self.active_connections:
            self.active_connections[user_id] = {}
        
        # Store connection
        self.active_connections[user_id][connection_id] = websocket
        self.connection_users[connection_id] = user_id
        
        logger.info(f"User {user.email} connected with connection {connection_id}")
        
        # Send connection confirmation
        await self.send_to_connection(
            websocket,
            WebSocketResponse(
                type="connection_established",
                content="Connected to LawBuddy",
                metadata={"user_id": user_id, "connection_id": connection_id}
            )
        )

    def disconnect(self, connection_id: str):
        """Handle WebSocket disconnection"""
        user_id = self.connection_users.get(connection_id)
        
        if user_id and user_id in self.active_connections:
            # Remove connection
            if connection_id in self.active_connections[user_id]:
                del self.active_connections[user_id][connection_id]
            
            # Clean up empty user entry
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
            
            # Remove from chat rooms
            for chat_id, members in self.chat_rooms.items():
                if user_id in members and members[user_id] == connection_id:
                    del members[user_id]
            
            # Clean up empty chat rooms
            self.chat_rooms = {k: v for k, v in self.chat_rooms.items() if v}
            
            # Remove from connection users mapping
            if connection_id in self.connection_users:
                del self.connection_users[connection_id]
            
            logger.info(f"User {user_id} disconnected (connection {connection_id})")

    async def join_chat_room(self, chat_id: str, user_id: str, connection_id: str):
        """Add user to a chat room"""
        if chat_id not in self.chat_rooms:
            self.chat_rooms[chat_id] = {}
        
        self.chat_rooms[chat_id][user_id] = connection_id
        
        # Notify user they joined the room
        websocket = self._get_user_connection(user_id, connection_id)
        if websocket:
            await self.send_to_connection(
                websocket,
                WebSocketResponse(
                    type="joined_chat",
                    content=f"Joined chat {chat_id}",
                    metadata={"chat_id": chat_id}
                )
            )

    async def leave_chat_room(self, chat_id: str, user_id: str):
        """Remove user from a chat room"""
        if chat_id in self.chat_rooms and user_id in self.chat_rooms[chat_id]:
            del self.chat_rooms[chat_id][user_id]
            
            # Clean up empty chat room
            if not self.chat_rooms[chat_id]:
                del self.chat_rooms[chat_id]

    async def send_to_connection(self, websocket: WebSocket, response: WebSocketResponse):
        """Send message to a specific WebSocket connection"""
        try:
            await websocket.send_text(response.json())
        except Exception as e:
            logger.error(f"Error sending message to connection: {e}")

    async def send_to_user(self, user_id: str, response: WebSocketResponse):
        """Send message to all connections of a user"""
        if user_id in self.active_connections:
            disconnected_connections = []
            
            for connection_id, websocket in self.active_connections[user_id].items():
                try:
                    await websocket.send_text(response.json())
                except Exception as e:
                    logger.error(f"Error sending to user {user_id}, connection {connection_id}: {e}")
                    disconnected_connections.append(connection_id)
            
            # Clean up disconnected connections
            for connection_id in disconnected_connections:
                self.disconnect(connection_id)

    async def broadcast_to_chat(self, chat_id: str, response: WebSocketResponse, exclude_user: Optional[str] = None):
        """Broadcast message to all users in a chat room"""
        if chat_id not in self.chat_rooms:
            return
        
        for user_id, connection_id in self.chat_rooms[chat_id].items():
            if exclude_user and user_id == exclude_user:
                continue
            
            websocket = self._get_user_connection(user_id, connection_id)
            if websocket:
                await self.send_to_connection(websocket, response)

    async def handle_typing_indicator(self, chat_id: str, user_id: str, is_typing: bool):
        """Handle typing indicators"""
        if is_typing:
            # Add/update typing indicator
            if chat_id not in self.typing_indicators:
                self.typing_indicators[chat_id] = {}
            self.typing_indicators[chat_id][user_id] = datetime.utcnow()
        else:
            # Remove typing indicator
            if chat_id in self.typing_indicators and user_id in self.typing_indicators[chat_id]:
                del self.typing_indicators[chat_id][user_id]
                
                # Clean up empty chat
                if not self.typing_indicators[chat_id]:
                    del self.typing_indicators[chat_id]
        
        # Broadcast typing status to other users in chat
        await self.broadcast_to_chat(
            chat_id,
            WebSocketResponse(
                type="typing_indicator",
                metadata={
                    "user_id": user_id,
                    "is_typing": is_typing,
                    "chat_id": chat_id
                }
            ),
            exclude_user=user_id
        )

    async def stream_ai_response(self, chat_id: str, message_id: str, content_generator):
        """Stream AI response to chat room"""
        full_content = ""
        
        try:
            async for chunk_data in content_generator:
                if chunk_data["type"] == "chunk":
                    chunk_text = chunk_data["content"]
                    full_content += chunk_text
                    
                    # Broadcast chunk to chat room
                    await self.broadcast_to_chat(
                        chat_id,
                        WebSocketResponse(
                            type="ai_response_chunk",
                            content=chunk_text,
                            message_id=message_id,
                            metadata={
                                "chat_id": chat_id,
                                "full_content": full_content,
                                "is_streaming": True
                            }
                        )
                    )
                    
                elif chunk_data["type"] == "complete":
                    # Send completion signal
                    await self.broadcast_to_chat(
                        chat_id,
                        WebSocketResponse(
                            type="ai_response_complete",
                            content=chunk_data["content"],
                            message_id=message_id,
                            metadata={
                                "chat_id": chat_id,
                                "ai_metadata": chunk_data["metadata"].dict() if chunk_data["metadata"] else None,
                                "is_streaming": False
                            }
                        )
                    )
                    break
                    
                elif chunk_data["type"] == "error":
                    # Send error
                    await self.broadcast_to_chat(
                        chat_id,
                        WebSocketResponse(
                            type="ai_response_error",
                            error=chunk_data["content"],
                            message_id=message_id,
                            metadata={"chat_id": chat_id}
                        )
                    )
                    break
                    
        except Exception as e:
            logger.error(f"Error streaming AI response: {e}")
            await self.broadcast_to_chat(
                chat_id,
                WebSocketResponse(
                    type="ai_response_error",
                    error="Error occurred while generating response",
                    message_id=message_id,
                    metadata={"chat_id": chat_id}
                )
            )

    def _get_user_connection(self, user_id: str, connection_id: str) -> Optional[WebSocket]:
        """Get WebSocket connection for user"""
        if user_id in self.active_connections and connection_id in self.active_connections[user_id]:
            return self.active_connections[user_id][connection_id]
        return None

    def get_active_users_in_chat(self, chat_id: str) -> List[str]:
        """Get list of active users in a chat room"""
        if chat_id in self.chat_rooms:
            return list(self.chat_rooms[chat_id].keys())
        return []

    def get_user_connection_count(self, user_id: str) -> int:
        """Get number of active connections for a user"""
        if user_id in self.active_connections:
            return len(self.active_connections[user_id])
        return 0

    def get_total_connections(self) -> int:
        """Get total number of active connections"""
        total = 0
        for user_connections in self.active_connections.values():
            total += len(user_connections)
        return total

    def get_stats(self) -> Dict[str, int]:
        """Get connection statistics"""
        return {
            "total_connections": self.get_total_connections(),
            "active_users": len(self.active_connections),
            "active_chat_rooms": len(self.chat_rooms),
            "typing_users": sum(len(users) for users in self.typing_indicators.values())
        }

# Global connection manager instance
connection_manager = ConnectionManager()

# WebSocket message handler
class WebSocketHandler:
    def __init__(self, connection_manager: ConnectionManager):
        self.connection_manager = connection_manager

    async def handle_message(
        self, 
        websocket: WebSocket, 
        user: User, 
        connection_id: str, 
        message_data: dict
    ):
        """Handle incoming WebSocket message"""
        try:
            # Parse message
            ws_message = WebSocketMessage(**message_data)
            
            # Handle different message types
            if ws_message.type == "join_chat":
                if ws_message.chat_session_id:
                    await self.connection_manager.join_chat_room(
                        ws_message.chat_session_id,
                        str(user.id),
                        connection_id
                    )
                    
            elif ws_message.type == "leave_chat":
                if ws_message.chat_session_id:
                    await self.connection_manager.leave_chat_room(
                        ws_message.chat_session_id,
                        str(user.id)
                    )
                    
            elif ws_message.type == "typing":
                if ws_message.chat_session_id:
                    is_typing = ws_message.metadata.get("is_typing", False) if ws_message.metadata else False
                    await self.connection_manager.handle_typing_indicator(
                        ws_message.chat_session_id,
                        str(user.id),
                        is_typing
                    )
                    
            elif ws_message.type == "ping":
                # Respond to ping with pong
                await self.connection_manager.send_to_connection(
                    websocket,
                    WebSocketResponse(type="pong", content="pong")
                )
                
            else:
                logger.warning(f"Unknown message type: {ws_message.type}")
                
        except Exception as e:
            logger.error(f"Error handling WebSocket message: {e}")
            await self.connection_manager.send_to_connection(
                websocket,
                WebSocketResponse(
                    type="error",
                    error=f"Error processing message: {str(e)}"
                )
            )

# Global WebSocket handler instance
websocket_handler = WebSocketHandler(connection_manager)