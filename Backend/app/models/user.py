# models/user.py
from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, EmailStr, field_validator
from enum import Enum

from app.models.base import BaseMongoModel

class SubscriptionTier(str, Enum):
    FREE = "free"
    PREMIUM = "premium"
    PROFESSIONAL = "professional"

class UserProfile(BaseModel):
    full_name: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None

class UserPreferences(BaseModel):
    language: str = "en"
    notification_settings: Dict[str, Any] = {}
    legal_interests: List[str] = []

class SubscriptionInfo(BaseModel):
    tier: SubscriptionTier = SubscriptionTier.FREE
    expires_at: Optional[datetime] = None
    features: List[str] = []

class UsageStats(BaseModel):
    total_chats: int = 0
    total_messages: int = 0
    last_active: Optional[datetime] = None
    favorite_topics: List[str] = []

class User(BaseMongoModel):
    email: EmailStr
    password_hash: str
    profile: UserProfile = UserProfile()
    preferences: UserPreferences = UserPreferences()
    subscription: SubscriptionInfo = SubscriptionInfo()
    usage_stats: UsageStats = UsageStats()
    is_active: bool = True
    is_verified: bool = False

    @field_validator('email')
    @classmethod
    def email_must_be_lowercase(cls, v):
        return v.lower()

class UserInDB(User):
    pass
