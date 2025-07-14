# schemas/auth.py
from pydantic import BaseModel, EmailStr, field_validator, ConfigDict
from typing import Optional

class UserRegister(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

class TokenRefresh(BaseModel):
    refresh_token: str

class PasswordReset(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str
