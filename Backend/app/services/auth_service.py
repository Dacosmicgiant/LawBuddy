from typing import Optional
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException, status
from bson import ObjectId

from app.core.security import (
    verify_password, 
    get_password_hash, 
    create_access_token, 
    create_refresh_token,
    verify_token,
    validate_password_strength
)
from app.core.config import settings
from app.models.user import User, UserProfile, UsageStats
from app.schemas.auth import UserRegister, UserLogin, Token

class AuthService:
    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.users_collection = database.users

    async def register_user(self, user_data: UserRegister) -> User:
        """Register a new user"""
        
        # Validate password strength
        if not validate_password_strength(user_data.password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character"
            )
        
        # Check if user already exists
        existing_user = await self.users_collection.find_one({"email": user_data.email.lower()})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create user document
        user_dict = {
            "email": user_data.email.lower(),
            "password_hash": get_password_hash(user_data.password),
            "profile": {
                "full_name": user_data.full_name,
                "location": None,
                "phone": None
            },
            "preferences": {
                "language": "en",
                "notification_settings": {},
                "legal_interests": []
            },
            "subscription": {
                "tier": "free",
                "expires_at": None,
                "features": []
            },
            "usage_stats": {
                "total_chats": 0,
                "total_messages": 0,
                "last_active": datetime.utcnow(),
                "favorite_topics": []
            },
            "is_active": True,
            "is_verified": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Insert user into database
        result = await self.users_collection.insert_one(user_dict)
        user_dict["_id"] = result.inserted_id
        
        return User(**user_dict)

    async def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """Authenticate user with email and password"""
        user_doc = await self.users_collection.find_one({"email": email.lower()})
        if not user_doc:
            return None
            
        if not verify_password(password, user_doc["password_hash"]):
            return None
            
        # Update last active
        await self.users_collection.update_one(
            {"_id": user_doc["_id"]},
            {"$set": {"usage_stats.last_active": datetime.utcnow(), "updated_at": datetime.utcnow()}}
        )
        
        return User(**user_doc)

    async def login_user(self, login_data: UserLogin) -> Token:
        """Login user and return tokens"""
        user = await self.authenticate_user(login_data.email, login_data.password)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user account"
            )
        
        # Create tokens
        access_token = create_access_token(subject=str(user.id))
        refresh_token = create_refresh_token(subject=str(user.id))
        
        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )

    async def refresh_token(self, refresh_token: str) -> Token:
        """Refresh access token using refresh token"""
        user_id = verify_token(refresh_token, token_type="refresh")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Verify user still exists and is active
        user_doc = await self.users_collection.find_one({"_id": ObjectId(user_id)})
        if not user_doc or not user_doc.get("is_active", False):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account not found or inactive"
            )
        
        # Create new tokens
        access_token = create_access_token(subject=user_id)
        new_refresh_token = create_refresh_token(subject=user_id)
        
        return Token(
            access_token=access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )

    async def get_current_user(self, token: str) -> User:
        """Get current user from access token"""
        user_id = verify_token(token, token_type="access")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid access token"
            )
        
        user_doc = await self.users_collection.find_one({"_id": ObjectId(user_id)})
        
        if not user_doc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        if not user_doc.get("is_active", False):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user account"
            )
        
        return User(**user_doc)

    async def update_user_activity(self, user_id: str):
        """Update user's last active timestamp"""
        await self.users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "usage_stats.last_active": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )

    async def deactivate_user(self, user_id: str):
        """Deactivate user account"""
        await self.users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "is_active": False,
                    "updated_at": datetime.utcnow()
                }
            }
        )

    async def change_password(self, user_id: str, current_password: str, new_password: str):
        """Change user password"""
        
        # Validate new password strength
        if not validate_password_strength(new_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be at least 8 characters long and contain uppercase, lowercase, number, and special character"
            )
        
        # Get current user
        user_doc = await self.users_collection.find_one({"_id": ObjectId(user_id)})
        if not user_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Verify current password
        if not verify_password(current_password, user_doc["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Update password
        new_password_hash = get_password_hash(new_password)
        await self.users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "password_hash": new_password_hash,
                    "updated_at": datetime.utcnow()
                }
            }
        )