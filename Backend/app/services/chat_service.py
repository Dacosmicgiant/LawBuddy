from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException, status
from bson import ObjectId
import asyncio
import uuid
import logging

from app.models.chat import (
    ChatSession, Message, ChatStatus, MessageRole, MessageType, MessageStatus,
    ChatMetadata, AIMetadata, MessageFormatting, UserInteraction, ConversationBranch,
    ResponseFormat, TokenUsage
)
from app.models.user import User
from app.schemas.chat import (
    ChatSessionCreate, ChatSessionUpdate, MessageCreate,
    ChatSessionResponse, MessageResponse, ChatHistoryResponse, MessageHistoryResponse
)

logger = logging.getLogger(__name__)

class EnhancedChatService:
    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.chat_sessions_collection = database.chat_sessions
        self.messages_collection = database.messages
        self.users_collection = database.users
        self.conversation_memory_collection = database.conversation_memory
        
        # Message status tracking
        self.pending_messages: Dict[str, Dict[str, Any]] = {}
        self.streaming_messages: Dict[str, Dict[str, Any]] = {}

    async def create_chat_session(self, user: User, chat_data: ChatSessionCreate) -> ChatSession:
        """Create a new chat session with enhanced metadata"""
        
        # Create enhanced chat session document
        chat_dict = {
            "user_id": user.id,
            "title": chat_data.title,
            "preview": chat_data.initial_message[:100] if chat_data.initial_message else "",
            "status": ChatStatus.ACTIVE,
            "metadata": {
                "message_count": 0,
                "legal_categories": [],
                "ai_confidence_avg": 0.0,
                "user_satisfaction": None,
                "total_tokens_used": 0,
                "total_cost": 0.0,
                "conversation_length": 0
            },
            "tags": [],
            "last_message_at": None,
            "conversation_summary": None,
            "context_window_size": 10,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Insert chat session
        result = await self.chat_sessions_collection.insert_one(chat_dict)
        chat_dict["_id"] = result.inserted_id
        
        # Create initial message if provided
        if chat_data.initial_message:
            await self.add_message_with_status_tracking(
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

    async def create_pending_message(
        self, 
        chat_id: str, 
        user: User, 
        message_data: MessageCreate,
        stream_id: Optional[str] = None
    ) -> Message:
        """Create a message with PENDING status"""
        
        # Verify chat session exists and belongs to user
        chat = await self.get_chat_session(chat_id, user)
        
        # Generate stream ID if not provided
        if not stream_id:
            stream_id = str(uuid.uuid4())
        
        # Create message document with PENDING status
        message_dict = {
            "chat_session_id": chat.id,
            "user_id": user.id,
            "role": message_data.role,
            "content": "",  # Empty initially for pending messages
            "message_type": message_data.message_type,
            "status": MessageStatus.PENDING,
            "ai_metadata": None,
            "formatting": None,
            "user_interaction": {
                "helpful_rating": None,
                "feedback": None,
                "follow_up_questions": [],
                "bookmarked": False,
                "shared": False,
                "regeneration_count": 0,
                "edit_count": 0
            },
            "timestamp": datetime.utcnow(),
            "conversation_branch": None,
            "parent_message_id": None,
            "child_message_ids": [],
            "version": 1,
            "original_message_id": None,
            "edit_history": [],
            "stream_id": stream_id,
            "is_streaming": False,
            "partial_content": "",
            "final_content": message_data.content if message_data.role == MessageRole.USER else "",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # For user messages, set content immediately and mark as complete
        if message_data.role == MessageRole.USER:
            message_dict["content"] = message_data.content
            message_dict["status"] = MessageStatus.COMPLETE
            message_dict["final_content"] = message_data.content
        
        # Insert message
        result = await self.messages_collection.insert_one(message_dict)
        message_dict["_id"] = result.inserted_id
        
        # Track pending message
        if message_data.role == MessageRole.ASSISTANT:
            self.pending_messages[stream_id] = {
                "message_id": str(result.inserted_id),
                "chat_id": chat_id,
                "created_at": datetime.utcnow()
            }
        
        # Update chat session metadata for user messages
        if message_data.role == MessageRole.USER:
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

    async def start_message_streaming(self, stream_id: str) -> bool:
        """Mark message as streaming"""
        try:
            if stream_id not in self.pending_messages:
                return False
            
            message_id = self.pending_messages[stream_id]["message_id"]
            
            # Update message status to streaming
            result = await self.messages_collection.update_one(
                {"_id": ObjectId(message_id)},
                {
                    "$set": {
                        "status": MessageStatus.STREAMING,
                        "is_streaming": True,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            if result.modified_count > 0:
                # Move to streaming tracking
                self.streaming_messages[stream_id] = self.pending_messages.pop(stream_id)
                return True
            
        except Exception as e:
            logger.error(f"Error starting message streaming: {e}")
        
        return False

    async def update_streaming_message(self, stream_id: str, content_chunk: str) -> bool:
        """Update streaming message with new content chunk"""
        try:
            if stream_id not in self.streaming_messages:
                return False
            
            message_id = self.streaming_messages[stream_id]["message_id"]
            
            # Get current message to append content
            message_doc = await self.messages_collection.find_one({"_id": ObjectId(message_id)})
            if not message_doc:
                return False
            
            new_partial_content = message_doc.get("partial_content", "") + content_chunk
            
            # Update message with new chunk
            result = await self.messages_collection.update_one(
                {"_id": ObjectId(message_id)},
                {
                    "$set": {
                        "partial_content": new_partial_content,
                        "content": new_partial_content,  # Update display content
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Error updating streaming message: {e}")
            return False

    async def complete_streaming_message(
        self, 
        stream_id: str, 
        final_content: str,
        ai_metadata: Optional[AIMetadata] = None,
        formatting: Optional[MessageFormatting] = None
    ) -> bool:
        """Complete streaming message with final content and metadata"""
        try:
            if stream_id not in self.streaming_messages:
                return False
            
            message_info = self.streaming_messages.pop(stream_id)
            message_id = message_info["message_id"]
            chat_id = message_info["chat_id"]
            
            # Prepare update data
            update_data = {
                "status": MessageStatus.COMPLETE,
                "content": final_content,
                "final_content": final_content,
                "is_streaming": False,
                "updated_at": datetime.utcnow()
            }
            
            if ai_metadata:
                update_data["ai_metadata"] = ai_metadata.dict()
            
            if formatting:
                update_data["formatting"] = formatting.dict()
            
            # Update message
            result = await self.messages_collection.update_one(
                {"_id": ObjectId(message_id)},
                {"$set": update_data}
            )
            
            if result.modified_count > 0:
                # Update chat metadata
                await self._update_chat_metadata_with_ai_response(chat_id, final_content, ai_metadata)
                return True
            
        except Exception as e:
            logger.error(f"Error completing streaming message: {e}")
        
        return False

    async def fail_message(self, stream_id: str, error_message: str) -> bool:
        """Mark message as failed"""
        try:
            message_tracking = self.pending_messages.get(stream_id) or self.streaming_messages.get(stream_id)
            if not message_tracking:
                return False
            
            message_id = message_tracking["message_id"]
            
            # Update message status to failed
            result = await self.messages_collection.update_one(
                {"_id": ObjectId(message_id)},
                {
                    "$set": {
                        "status": MessageStatus.FAILED,
                        "content": f"Error: {error_message}",
                        "is_streaming": False,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            # Clean up tracking
            self.pending_messages.pop(stream_id, None)
            self.streaming_messages.pop(stream_id, None)
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Error failing message: {e}")
            return False

    async def regenerate_message(
        self, 
        message_id: str, 
        user: User,
        new_content: Optional[str] = None
    ) -> Message:
        """Regenerate an AI message or edit a user message"""
        
        # Get original message
        original_message_doc = await self.messages_collection.find_one({"_id": ObjectId(message_id)})
        if not original_message_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found"
            )
        
        original_message = Message(**original_message_doc)
        
        # Verify user owns the chat
        chat = await self.get_chat_session(str(original_message.chat_session_id), user)
        
        # Create new message as regeneration
        regenerated_dict = {
            "chat_session_id": original_message.chat_session_id,
            "user_id": user.id,
            "role": original_message.role,
            "content": new_content or original_message.content,
            "message_type": original_message.message_type,
            "status": MessageStatus.PENDING if original_message.role == MessageRole.ASSISTANT else MessageStatus.COMPLETE,
            "ai_metadata": None,
            "formatting": None,
            "user_interaction": {
                "helpful_rating": None,
                "feedback": None,
                "follow_up_questions": [],
                "bookmarked": False,
                "shared": False,
                "regeneration_count": 0,
                "edit_count": 0
            },
            "timestamp": datetime.utcnow(),
            "conversation_branch": {
                "branch_id": str(ObjectId()),
                "parent_message_id": original_message.id,
                "branch_point": datetime.utcnow(),
                "branch_reason": "user_regeneration",
                "is_active_branch": True
            },
            "parent_message_id": original_message.id,
            "child_message_ids": [],
            "version": original_message.version + 1,
            "original_message_id": original_message.original_message_id or original_message.id,
            "edit_history": original_message.edit_history + [{
                "version": original_message.version,
                "content": original_message.content,
                "timestamp": original_message.updated_at,
                "reason": "regeneration"
            }],
            "stream_id": str(uuid.uuid4()) if original_message.role == MessageRole.ASSISTANT else None,
            "is_streaming": False,
            "partial_content": "",
            "final_content": new_content or original_message.content,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Insert regenerated message
        result = await self.messages_collection.insert_one(regenerated_dict)
        regenerated_dict["_id"] = result.inserted_id
        
        # Update original message's child references
        await self.messages_collection.update_one(
            {"_id": original_message.id},
            {
                "$push": {"child_message_ids": result.inserted_id},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        # Update user interaction count
        await self.messages_collection.update_one(
            {"_id": original_message.id},
            {"$inc": {"user_interaction.regeneration_count": 1}}
        )
        
        return Message(**regenerated_dict)

    async def create_conversation_branch(
        self, 
        parent_message_id: str, 
        user: User,
        branch_reason: str = "user_choice"
    ) -> str:
        """Create a new conversation branch from a specific message"""
        
        parent_message_doc = await self.messages_collection.find_one({"_id": ObjectId(parent_message_id)})
        if not parent_message_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent message not found"
            )
        
        parent_message = Message(**parent_message_doc)
        
        # Verify user owns the chat
        await self.get_chat_session(str(parent_message.chat_session_id), user)
        
        # Create branch ID
        branch_id = str(ObjectId())
        
        # Mark all messages after parent as inactive in current branch
        await self.messages_collection.update_many(
            {
                "chat_session_id": parent_message.chat_session_id,
                "timestamp": {"$gt": parent_message.timestamp},
                "conversation_branch.is_active_branch": True
            },
            {
                "$set": {
                    "conversation_branch.is_active_branch": False,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return branch_id

    async def switch_conversation_branch(self, chat_id: str, branch_id: str, user: User) -> bool:
        """Switch to a different conversation branch"""
        
        # Verify user owns the chat
        await self.get_chat_session(chat_id, user)
        
        # Deactivate all branches
        await self.messages_collection.update_many(
            {"chat_session_id": ObjectId(chat_id)},
            {
                "$set": {
                    "conversation_branch.is_active_branch": False,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Activate selected branch
        result = await self.messages_collection.update_many(
            {
                "chat_session_id": ObjectId(chat_id),
                "conversation_branch.branch_id": branch_id
            },
            {
                "$set": {
                    "conversation_branch.is_active_branch": True,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return result.modified_count > 0

    async def get_conversation_branches(self, chat_id: str, user: User) -> List[Dict[str, Any]]:
        """Get all conversation branches for a chat"""
        
        # Verify user owns the chat
        await self.get_chat_session(chat_id, user)
        
        # Get all unique branches
        pipeline = [
            {"$match": {"chat_session_id": ObjectId(chat_id)}},
            {"$group": {
                "_id": "$conversation_branch.branch_id",
                "branch_point": {"$first": "$conversation_branch.branch_point"},
                "branch_reason": {"$first": "$conversation_branch.branch_reason"},
                "is_active": {"$first": "$conversation_branch.is_active_branch"},
                "message_count": {"$sum": 1},
                "last_message": {"$max": "$timestamp"}
            }},
            {"$sort": {"branch_point": 1}}
        ]
        
        cursor = self.messages_collection.aggregate(pipeline)
        branches = await cursor.to_list(length=None)
        
        return [
            {
                "branch_id": branch["_id"],
                "branch_point": branch["branch_point"],
                "branch_reason": branch["branch_reason"],
                "is_active": branch["is_active"],
                "message_count": branch["message_count"],
                "last_message": branch["last_message"]
            }
            for branch in branches if branch["_id"]  # Filter out None branch IDs
        ]

    async def add_message_with_status_tracking(
        self, 
        chat_id: str, 
        user: User, 
        message_data: MessageCreate
    ) -> Message:
        """Add message with proper status tracking (legacy method for compatibility)"""
        
        if message_data.role == MessageRole.ASSISTANT:
            # For AI messages, create as pending first
            return await self.create_pending_message(chat_id, user, message_data)
        else:
            # For user messages, create as complete
            message = await self.create_pending_message(chat_id, user, message_data)
            return message

    async def update_message_interaction(
        self,
        message_id: str,
        user: User,
        interaction_data: Dict[str, Any]
    ) -> bool:
        """Update user interaction data for a message"""
        
        # Verify message exists and user owns the chat
        message_doc = await self.messages_collection.find_one({"_id": ObjectId(message_id)})
        if not message_doc:
            return False
        
        message = Message(**message_doc)
        await self.get_chat_session(str(message.chat_session_id), user)
        
        # Build update query
        update_data = {}
        for key, value in interaction_data.items():
            if key in ["helpful_rating", "feedback", "bookmarked", "shared"]:
                update_data[f"user_interaction.{key}"] = value
        
        if not update_data:
            return False
        
        update_data["updated_at"] = datetime.utcnow()
        
        result = await self.messages_collection.update_one(
            {"_id": ObjectId(message_id)},
            {"$set": update_data}
        )
        
        return result.modified_count > 0

    async def _update_chat_metadata_with_ai_response(
        self, 
        chat_id: str, 
        content: str, 
        ai_metadata: Optional[AIMetadata] = None
    ):
        """Update chat metadata after AI response completion"""
        
        update_dict = {
            "$inc": {"metadata.message_count": 1},
            "$set": {
                "last_message_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
        
        # Add token usage and cost if available
        if ai_metadata and ai_metadata.token_usage:
            update_dict["$inc"]["metadata.total_tokens_used"] = ai_metadata.token_usage.total_tokens
            update_dict["$inc"]["metadata.total_cost"] = ai_metadata.token_usage.estimated_cost
        
        # Extract legal categories
        legal_categories = self._extract_legal_categories(content)
        if legal_categories:
            update_dict["$addToSet"] = {"metadata.legal_categories": {"$each": legal_categories}}
        
        # Update conversation length
        update_dict["$inc"]["metadata.conversation_length"] = len(content)
        
        await self.chat_sessions_collection.update_one(
            {"_id": ObjectId(chat_id)},
            update_dict
        )

    # [Keep all existing methods from original chat service - get_chat_session, update_chat_session, etc.]
    
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

    async def get_active_messages(self, chat_id: str, user: User) -> List[Message]:
        """Get active branch messages for a chat session"""
        
        # Verify chat ownership
        await self.get_chat_session(chat_id, user)
        
        # Get messages from active branch or main conversation
        cursor = self.messages_collection.find({
            "chat_session_id": ObjectId(chat_id),
            "$or": [
                {"conversation_branch.is_active_branch": True},
                {"conversation_branch": None}  # Main conversation
            ]
        }).sort("timestamp", 1)
        
        message_docs = await cursor.to_list(length=None)
        return [Message(**doc) for doc in message_docs]

    def _extract_legal_categories(self, content: str) -> List[str]:
        """Extract legal categories from message content"""
        categories = []
        content_lower = content.lower()
        
        # Enhanced category keywords
        category_keywords = {
            "traffic_violations": ["speed", "speeding", "red light", "signal", "violation", "challan", "fine"],
            "fines_penalties": ["fine", "penalty", "amount", "pay", "fee", "cost", "₹"],
            "license_registration": ["license", "registration", "rc", "dl", "permit", "driving licence"],
            "insurance": ["insurance", "claim", "policy", "coverage", "third party"],
            "accidents": ["accident", "crash", "collision", "hit", "damage", "injury"],
            "documents": ["documents", "papers", "certificate", "proof", "verification"],
            "police_procedures": ["police", "officer", "stop", "check", "procedure", "fir"],
            "court_legal": ["court", "legal", "lawyer", "case", "hearing", "judge", "bail"]
        }
        
        # Check for category keywords
        for category, keywords in category_keywords.items():
            if any(keyword in content_lower for keyword in keywords):
                categories.append(category)
        
        return categories

    async def cleanup_old_pending_messages(self, max_age_minutes: int = 30):
        """Cleanup old pending/streaming messages"""
        cutoff_time = datetime.utcnow() - timedelta(minutes=max_age_minutes)
        
        # Clean up tracking dictionaries
        expired_streams = []
        for stream_id, info in self.pending_messages.items():
            if info["created_at"] < cutoff_time:
                expired_streams.append(stream_id)
        
        for stream_id in expired_streams:
            await self.fail_message(stream_id, "Message timeout")
        
        # Clean up streaming messages
        expired_streams = []
        for stream_id, info in self.streaming_messages.items():
            if info["created_at"] < cutoff_time:
                expired_streams.append(stream_id)
        
        for stream_id in expired_streams:
            await self.fail_message(stream_id, "Streaming timeout")