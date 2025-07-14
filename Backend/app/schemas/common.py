# schemas/common.py
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict

class PaginationParams(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    page: int = 1
    size: int = 20

class SuccessResponse(BaseModel):
    success: bool = True
    message: str
    data: Optional[Dict[str, Any]] = None

class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    details: Optional[Dict[str, Any]] = None