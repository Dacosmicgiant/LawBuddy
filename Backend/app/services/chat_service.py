from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException, status
from bson import ObjectId
import re

from app.models.chat import ChatSession, Message, ChatStatus, MessageRole, MessageType, ChatMetadata, AIMetadata
from app.models.user import User
from app.schemas.chat import (
    ChatSessionCreate, 
    ChatSessionUpdate, 
    MessageCreate,
    ChatSessionResponse,
    MessageResponse,
    ChatHistoryResponse,
    MessageHistoryResponse
)

class ChatService:
    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.chat_sessions_collection = database.chat_sessions
        self.messages_collection = database.messages
        self.users_collection = database.users

    async def create_chat_session(self, user: User, chat_data: ChatSessionCreate) -> ChatSession:
        """Create a new chat session"""
        
        # Create chat session document
        chat_dict = {
            "user_id": user.id,
            "title": chat_data.title,
            "preview": chat_data.initial_message[:100] if chat_data.initial_message else "",
            "status": ChatStatus.ACTIVE,
            "metadata": {
                "message_count": 0,
                "legal_categories": [],
                "ai_confidence_avg": 0.0,
                "user_satisfaction": None
            },
            "tags": [],
            "last_message_at": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Insert chat session
        result = await self.chat_sessions_collection.insert_one(chat_dict)
        chat_dict["_id"] = result.inserted_id
        
        # Create initial message if provided
        if chat_data.initial_message:
            await self.add_message(
                str(result.inserted_id),
                user,
                MessageCreate(content=chat_data.initial_message, role=MessageRole.USER)
            )
        
        # Update user stats
        await self.users_collection.update_one(
            {"_id": user.id},
            {
                "$inc": {"usage_stats.total_chats": 1},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        return ChatSession(**chat_dict)

    async def get_chat_session(self, chat_id: str, user: User) -> ChatSession:
        """Get a specific chat session"""
        if not ObjectId.is_valid(chat_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid chat session ID"
            )
        
        chat_doc = await self.chat_sessions_collection.find_one({
            "_id": ObjectId(chat_id),
            "user_id": user.id,
            "status": {"$ne": ChatStatus.DELETED}
        })
        
        if not chat_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat session not found"
            )
        
        return ChatSession(**chat_doc)

    async def update_chat_session(self, chat_id: str, user: User, update_data: ChatSessionUpdate) -> ChatSession:
        """Update a chat session"""
        chat = await self.get_chat_session(chat_id, user)
        
        update_dict = {"updated_at": datetime.utcnow()}
        
        if update_data.title is not None:
            update_dict["title"] = update_data.title
            
        if update_data.status is not None:
            update_dict["status"] = update_data.status
            
        if update_data.tags is not None:
            update_dict["tags"] = update_data.tags
        
        await self.chat_sessions_collection.update_one(
            {"_id": ObjectId(chat_id)},
            {"$set": update_dict}
        )
        
        # Get updated chat
        return await self.get_chat_session(chat_id, user)

    async def delete_chat_session(self, chat_id: str, user: User) -> bool:
        """Soft delete a chat session"""
        chat = await self.get_chat_session(chat_id, user)
        
        await self.chat_sessions_collection.update_one(
            {"_id": ObjectId(chat_id)},
            {
                "$set": {
                    "status": ChatStatus.DELETED,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return True

    async def get_user_chat_history(
        self, 
        user: User, 
        page: int = 1, 
        size: int = 20,
        status: Optional[ChatStatus] = None
    ) -> ChatHistoryResponse:
        """Get user's chat history with pagination"""
        
        skip = (page - 1) * size
        
        # Build query
        query = {
            "user_id": user.id,
            "status": {"$ne": ChatStatus.DELETED}
        }
        
        if status:
            query["status"] = status
        
        # Get total count
        total = await self.chat_sessions_collection.count_documents(query)
        
        # Get chat sessions
        cursor = self.chat_sessions_collection.find(query).sort("updated_at", -1).skip(skip).limit(size)
        chat_docs = await cursor.to_list(length=size)
        
        chat_sessions = [
            ChatSessionResponse(
                id=str(doc["_id"]),
                title=doc["title"],
                preview=doc["preview"],
                status=doc["status"],
                metadata=doc["metadata"],
                tags=doc["tags"],
                created_at=doc["created_at"].isoformat(),
                updated_at=doc["updated_at"].isoformat(),
                last_message_at=doc["last_message_at"].isoformat() if doc.get("last_message_at") else None
            )
            for doc in chat_docs
        ]
        
        return ChatHistoryResponse(
            chat_sessions=chat_sessions,
            total=total,
            page=page,
            size=size,
            has_next=skip + size < total
        )

    async def add_message(self, chat_id: str, user: User, message_data: MessageCreate) -> Message:
        """Add a message to a chat session"""
        
        # Verify chat session exists and belongs to user
        chat = await self.get_chat_session(chat_id, user)
        
        # Create message document
        message_dict = {
            "chat_session_id": chat.id,
            "user_id": user.id,
            "role": message_data.role,
            "content": message_data.content,
            "message_type": message_data.message_type,
            "ai_metadata": None,
            "formatting": None,
            "user_interaction": None,
            "timestamp": datetime.utcnow(),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Insert message
        result = await self.messages_collection.insert_one(message_dict)
        message_dict["_id"] = result.inserted_id
        
        # Update chat session metadata
        await self._update_chat_metadata(chat_id, message_data.content)
        
        # Update user stats
        await self.users_collection.update_one(
            {"_id": user.id},
            {
                "$inc": {"usage_stats.total_messages": 1},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        return Message(**message_dict)

    async def get_chat_messages(
        self, 
        chat_id: str, 
        user: User, 
        page: int = 1, 
        size: int = 50
    ) -> MessageHistoryResponse:
        """Get messages for a chat session with pagination"""
        
        # Verify chat session
        await self.get_chat_session(chat_id, user)
        
        skip = (page - 1) * size
        
        # Build query
        query = {"chat_session_id": ObjectId(chat_id)}
        
        # Get total count
        total = await self.messages_collection.count_documents(query)
        
        # Get messages
        cursor = self.messages_collection.find(query).sort("timestamp", 1).skip(skip).limit(size)
        message_docs = await cursor.to_list(length=size)
        
        messages = [
            MessageResponse(
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
            for doc in message_docs
        ]
        
        return MessageHistoryResponse(
            messages=messages,
            total=total,
            page=page,
            size=size,
            has_next=skip + size < total
        )

    async def update_message_ai_metadata(
        self, 
        message_id: str, 
        ai_metadata: AIMetadata
    ) -> bool:
        """Update AI metadata for a message"""
        
        if not ObjectId.is_valid(message_id):
            return False
        
        result = await self.messages_collection.update_one(
            {"_id": ObjectId(message_id)},
            {
                "$set": {
                    "ai_metadata": ai_metadata.dict(),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return result.modified_count > 0

    async def search_chat_messages(
        self, 
        user: User, 
        query: str, 
        page: int = 1, 
        size: int = 20
    ) -> MessageHistoryResponse:
        """Search messages across all user's chats"""
        
        skip = (page - 1) * size
        
        # Build search query
        search_query = {
            "user_id": user.id,
            "$text": {"$search": query}
        }
        
        # Get total count
        total = await self.messages_collection.count_documents(search_query)
        
        # Get messages with text score
        cursor = self.messages_collection.find(
            search_query,
            {"score": {"$meta": "textScore"}}
        ).sort([("score", {"$meta": "textScore"})]).skip(skip).limit(size)
        
        message_docs = await cursor.to_list(length=size)
        
        messages = [
            MessageResponse(
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
            for doc in message_docs
        ]
        
        return MessageHistoryResponse(
            messages=messages,
            total=total,
            page=page,
            size=size,
            has_next=skip + size < total
        )

    async def _update_chat_metadata(self, chat_id: str, message_content: str):
        """Update chat session metadata after adding a message"""
        
        # Increment message count and update timestamps
        update_dict = {
            "$inc": {"metadata.message_count": 1},
            "$set": {
                "last_message_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
        
        # Extract legal categories from message content
        legal_categories = self._extract_legal_categories(message_content)
        if legal_categories:
            update_dict["$addToSet"] = {"metadata.legal_categories": {"$each": legal_categories}}
        
        await self.chat_sessions_collection.update_one(
            {"_id": ObjectId(chat_id)},
            update_dict
        )

    def _extract_legal_categories(self, content: str) -> List[str]:
        """Extract legal categories from message content"""
        categories = []
        content_lower = content.lower()
        
        # Define category keywords
        category_keywords = {
            "traffic_violations": ["speed", "speeding", "red light", "signal", "violation", "challan"],
            "fines_penalties": ["fine", "penalty", "amount", "pay", "fee"],
            "license_registration": ["license", "registration", "rc", "dl", "permit"],
            "insurance": ["insurance", "claim", "policy", "coverage"],
            "accidents": ["accident", "crash", "collision", "hit", "damage"],
            "documents": ["documents", "papers", "certificate", "proof"],
            "police_procedures": ["police", "officer", "stop", "check", "procedure"],
            "court_legal": ["court", "legal", "lawyer", "case", "hearing"]
        }
        
        # Check for category keywords
        for category, keywords in category_keywords.items():
            if any(keyword in content_lower for keyword in keywords):
                categories.append(category)
        
        return categories

    async def get_chat_analytics(self, user: User) -> Dict[str, Any]:
        """Get chat analytics for a user"""
        
        # Aggregate chat statistics
        pipeline = [
            {"$match": {"user_id": user.id, "status": {"$ne": ChatStatus.DELETED}}},
            {"$group": {
                "_id": None,
                "total_chats": {"$sum": 1},
                "total_messages": {"$sum": "$metadata.message_count"},
                "avg_messages_per_chat": {"$avg": "$metadata.message_count"},
                "legal_categories": {"$push": "$metadata.legal_categories"}
            }}
        ]
        
        result = await self.chat_sessions_collection.aggregate(pipeline).to_list(1)
        
        if not result:
            return {
                "total_chats": 0,
                "total_messages": 0,
                "avg_messages_per_chat": 0,
                "top_legal_categories": []
            }
        
        stats = result[0]
        
        # Flatten and count legal categories
        all_categories = []
        for cat_list in stats.get("legal_categories", []):
            all_categories.extend(cat_list)
        
        category_counts = {}
        for category in all_categories:
            category_counts[category] = category_counts.get(category, 0) + 1
        
        # Get top categories
        top_categories = sorted(category_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        
        return {
            "total_chats": stats.get("total_chats", 0),
            "total_messages": stats.get("total_messages", 0),
            "avg_messages_per_chat": round(stats.get("avg_messages_per_chat", 0), 2),
            "top_legal_categories": [{"category": cat, "count": count} for cat, count in top_categories]
        }