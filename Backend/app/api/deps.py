from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid

from app.core.database import get_database
from app.core.security import verify_token, AuthenticationError
from app.models.user import User
from app.services.auth_service import AuthService
from app.services.chat_service import EnhancedChatService  # Fixed import
from app.services.ai_service import AIService
from app.schemas.common import PaginationParams

# Security scheme
security = HTTPBearer()

# Database dependency
async def get_db() -> AsyncIOMotorDatabase:
    """Get database dependency"""
    return await get_database()

# Authentication dependencies
async def get_current_user_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    """Extract and validate bearer token"""
    if not credentials:
        raise AuthenticationError("Authorization header required")
    
    token = credentials.credentials
    if not token:
        raise AuthenticationError("Token required")
    
    return token

async def get_current_user(
    token: str = Depends(get_current_user_token),
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    auth_service = AuthService(db)
    return await auth_service.get_current_user(token)

async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current active user"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user

# Optional authentication (for public endpoints that can benefit from user context)
async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> Optional[User]:
    """Get current user if authenticated, None otherwise"""
    if not credentials:
        return None
    
    try:
        token = credentials.credentials
        auth_service = AuthService(db)
        return await auth_service.get_current_user(token)
    except Exception:
        return None

# Service dependencies
async def get_auth_service(
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> AuthService:
    """Get authentication service"""
    return AuthService(db)

async def get_chat_service(
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> EnhancedChatService:  # Fixed return type
    """Get chat service"""
    return EnhancedChatService(db)

async def get_ai_service(
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> AIService:
    """Get AI service"""
    return AIService(db)

# Pagination dependency
def get_pagination_params(
    page: int = 1,
    size: int = 20
) -> PaginationParams:
    """Get pagination parameters with validation"""
    if page < 1:
        page = 1
    if size < 1:
        size = 1
    if size > 100:  # Maximum page size
        size = 100
    
    return PaginationParams(page=page, size=size)

# WebSocket connection ID generator
def generate_connection_id() -> str:
    """Generate unique connection ID for WebSocket"""
    return str(uuid.uuid4())

# Rate limiting dependency (basic implementation)
class RateLimiter:
    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.requests: dict = {}
    
    def is_allowed(self, key: str) -> bool:
        """Check if request is allowed based on rate limit"""
        import time
        current_time = time.time()
        minute_window = int(current_time // 60)
        
        if key not in self.requests:
            self.requests[key] = {}
        
        # Clean old windows
        self.requests[key] = {
            window: count for window, count in self.requests[key].items()
            if window >= minute_window - 1
        }
        
        # Count requests in current window
        current_requests = self.requests[key].get(minute_window, 0)
        
        if current_requests >= self.requests_per_minute:
            return False
        
        # Increment counter
        self.requests[key][minute_window] = current_requests + 1
        return True

# Global rate limiter instances
general_rate_limiter = RateLimiter(requests_per_minute=60)
ai_rate_limiter = RateLimiter(requests_per_minute=20)  # More restrictive for AI endpoints

async def check_general_rate_limit(
    current_user: User = Depends(get_current_active_user)
):
    """Check general rate limit for authenticated endpoints"""
    user_key = str(current_user.id)
    
    if not general_rate_limiter.is_allowed(user_key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later."
        )

async def check_ai_rate_limit(
    current_user: User = Depends(get_current_active_user)
):
    """Check AI-specific rate limit"""
    user_key = f"ai_{current_user.id}"
    
    if not ai_rate_limiter.is_allowed(user_key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="AI request limit exceeded. Please try again later."
        )

# Subscription tier dependency
def require_subscription_tier(required_tier: str):
    """Dependency factory to require specific subscription tier"""
    
    async def check_subscription(
        current_user: User = Depends(get_current_active_user)
    ):
        # Define tier hierarchy
        tier_hierarchy = {
            "free": 0,
            "premium": 1,
            "professional": 2
        }
        
        user_tier_level = tier_hierarchy.get(current_user.subscription.tier, 0)
        required_tier_level = tier_hierarchy.get(required_tier, 0)
        
        if user_tier_level < required_tier_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This feature requires {required_tier} subscription"
            )
        
        return current_user
    
    return check_subscription

# Admin user dependency
async def get_admin_user(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """Require admin privileges"""
    # This would typically check a role field or admin flag
    # For now, we'll use email-based admin check
    admin_emails = ["admin@lawbuddy.com", "support@lawbuddy.com"]
    
    if current_user.email not in admin_emails:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    
    return current_user

# Chat ownership dependency
async def verify_chat_ownership(
    chat_id: str,
    current_user: User = Depends(get_current_active_user),
    chat_service: EnhancedChatService = Depends(get_chat_service)  # Fixed type
):
    """Verify that the current user owns the specified chat"""
    try:
        chat = await chat_service.get_chat_session(chat_id, current_user)
        return chat
    except HTTPException:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found or access denied"
        )

# WebSocket authentication dependency
async def get_websocket_user(token: str, db) -> User:
    """Authenticate user for WebSocket connection (internal use only)"""
    from app.services.auth_service import AuthService
    auth_service = AuthService(db)
    try:
        return await auth_service.get_current_user(token)
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail="WebSocket authentication failed"
        )

# Feature flag dependency
class FeatureFlags:
    """Feature flags for enabling/disabling features"""
    AI_STREAMING = True
    CHAT_EXPORT = True
    ADVANCED_ANALYTICS = False
    FILE_UPLOADS = False

def require_feature_flag(feature_name: str):
    """Dependency factory to require feature flag"""
    
    async def check_feature():
        feature_enabled = getattr(FeatureFlags, feature_name, False)
        
        if not feature_enabled:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Feature '{feature_name}' is currently disabled"
            )
    
    return check_feature

# Health check dependencies
async def check_database_health(
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> bool:
    """Check if database is healthy"""
    try:
        await db.command("ping")
        return True
    except Exception:
        return False

async def check_ai_service_health(
    ai_service: AIService = Depends(get_ai_service)
) -> bool:
    """Check if AI service is healthy"""
    return ai_service.is_available()