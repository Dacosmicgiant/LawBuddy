from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_db, get_auth_service, get_current_user, security
from app.services.auth_service import AuthService
from app.schemas.auth import UserRegister, UserLogin, Token, TokenRefresh, PasswordReset, PasswordResetConfirm
from app.schemas.user import UserResponse
from app.schemas.common import SuccessResponse, ErrorResponse
from app.models.user import User

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserRegister,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Register a new user account
    
    - **email**: User's email address (must be unique)
    - **password**: User's password (minimum 8 characters with complexity requirements)
    - **full_name**: User's full name (optional)
    """
    try:
        user = await auth_service.register_user(user_data)
        
        return UserResponse(
            id=str(user.id),
            email=user.email,
            profile=user.profile,
            preferences=user.preferences,
            subscription=user.subscription.dict(),
            usage_stats=user.usage_stats.dict(),
            is_active=user.is_active,
            created_at=user.created_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during registration"
        )

@router.post("/login", response_model=Token)
async def login_user(
    login_data: UserLogin,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Authenticate user and return access tokens
    
    - **email**: User's email address
    - **password**: User's password
    
    Returns access token and refresh token for subsequent API calls.
    """
    try:
        token = await auth_service.login_user(login_data)
        return token
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during login"
        )

@router.post("/refresh", response_model=Token)
async def refresh_access_token(
    refresh_data: TokenRefresh,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Refresh access token using refresh token
    
    - **refresh_token**: Valid refresh token
    
    Returns new access token and refresh token.
    """
    try:
        token = await auth_service.refresh_token(refresh_data.refresh_token)
        return token
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during token refresh"
        )

@router.post("/logout", response_model=SuccessResponse)
async def logout_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: User = Depends(get_current_user)
):
    """
    Logout user (invalidate current session)
    
    Note: In a production environment, you would typically:
    - Add the token to a blacklist
    - Clear any server-side session data
    - Notify other services of the logout
    """
    try:
        # In a real implementation, you would:
        # 1. Add token to blacklist/revocation list
        # 2. Clear any cached user data
        # 3. Log the logout event
        
        return SuccessResponse(
            message="Successfully logged out",
            data={"user_id": str(current_user.id)}
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during logout"
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Get current authenticated user's information
    
    Returns detailed user profile, preferences, and usage statistics.
    """
    try:
        return UserResponse(
            id=str(current_user.id),
            email=current_user.email,
            profile=current_user.profile,
            preferences=current_user.preferences,
            subscription=current_user.subscription.dict(),
            usage_stats=current_user.usage_stats.dict(),
            is_active=current_user.is_active,
            created_at=current_user.created_at.isoformat()
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching user information"
        )

@router.post("/change-password", response_model=SuccessResponse)
async def change_password(
    current_password: str,
    new_password: str,
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Change user's password
    
    - **current_password**: User's current password
    - **new_password**: New password (must meet complexity requirements)
    """
    try:
        await auth_service.change_password(
            str(current_user.id),
            current_password,
            new_password
        )
        
        return SuccessResponse(
            message="Password changed successfully",
            data={"user_id": str(current_user.id)}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while changing password"
        )

@router.post("/forgot-password", response_model=SuccessResponse)
async def request_password_reset(
    reset_data: PasswordReset,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Request password reset (send reset email)
    
    - **email**: User's email address
    
    Note: This is a placeholder implementation. In production, you would:
    - Generate a secure reset token
    - Send email with reset link
    - Store token with expiration
    """
    try:
        # TODO: Implement actual password reset logic
        # 1. Check if user exists
        # 2. Generate secure reset token
        # 3. Send reset email
        # 4. Store token with expiration
        
        return SuccessResponse(
            message="If an account with this email exists, a password reset link has been sent",
            data={"email": reset_data.email}
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing password reset request"
        )

@router.post("/reset-password", response_model=SuccessResponse)
async def confirm_password_reset(
    reset_data: PasswordResetConfirm,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Confirm password reset with token
    
    - **token**: Password reset token from email
    - **new_password**: New password
    
    Note: This is a placeholder implementation. In production, you would:
    - Validate the reset token
    - Check token expiration
    - Update user's password
    - Invalidate the token
    """
    try:
        # TODO: Implement actual password reset confirmation
        # 1. Validate reset token
        # 2. Check token expiration
        # 3. Update user password
        # 4. Invalidate token
        
        return SuccessResponse(
            message="Password reset successfully",
            data={"token_used": reset_data.token[:8] + "..."}
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while resetting password"
        )

@router.delete("/deactivate", response_model=SuccessResponse)
async def deactivate_account(
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Deactivate user account
    
    This will deactivate the account but preserve data.
    For complete account deletion, contact support.
    """
    try:
        await auth_service.deactivate_user(str(current_user.id))
        
        return SuccessResponse(
            message="Account deactivated successfully",
            data={"user_id": str(current_user.id)}
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while deactivating account"
        )