# schemas/user.py
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, EmailStr, ConfigDict
from app.models.user import SubscriptionTier, UserProfile, UserPreferences

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    email: EmailStr
    profile: UserProfile
    preferences: UserPreferences
    subscription: Dict[str, Any]
    usage_stats: Dict[str, Any]
    is_active: bool
    created_at: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None

class PreferencesUpdate(BaseModel):
    language: Optional[str] = None
    notification_settings: Optional[Dict[str, Any]] = None
    legal_interests: Optional[List[str]] = None