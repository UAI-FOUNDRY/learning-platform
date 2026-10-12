from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional
from datetime import datetime
from app.utils.validators import is_valid_email

class UserBase(BaseModel):
    email: str
    full_name: str
    role: Optional[str] = "learner"

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not is_valid_email(v):
            raise ValueError("Invalid email address format")
        return v.lower().strip()

class UserCreate(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def validate_password_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters long")
        return v

class UserLogin(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not is_valid_email(v):
            raise ValueError("Invalid email address format")
        return v.lower().strip()

class UserResponse(UserBase):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None
