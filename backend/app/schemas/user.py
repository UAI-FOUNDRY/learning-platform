from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    pass

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
