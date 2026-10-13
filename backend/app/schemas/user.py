from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional, List
from datetime import datetime
from app.utils.validators import is_valid_email
from app.schemas.common import BaseSchema

class UserBase(BaseSchema):
    email: str
    full_name: str
    role: Optional[str] = "learner"

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not is_valid_email(v):
            raise ValueError("Invalid email address format")
        return v.lower().strip()

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Full name cannot be empty")
        return cleaned

class UserRegister(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def validate_password_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters long")
        return v

    @field_validator("role")
    @classmethod
    def validate_public_registration_role(cls, v: Optional[str]) -> str:
        if v is None:
            return "learner"
        cleaned_role = v.lower().strip()
        if cleaned_role in ["admin", "super_admin"]:
            raise ValueError("Public registration with administrative roles is not permitted")
        if cleaned_role not in ["learner", "instructor"]:
            raise ValueError("Role must be 'learner' or 'instructor'")
        return cleaned_role

# Backward-compatibility alias
UserCreate = UserRegister

class UserLogin(BaseSchema):
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

class Token(BaseSchema):
    access_token: str
    token_type: str = "bearer"

TokenResponse = Token

class TokenPayload(BaseSchema):
    sub: Optional[str] = None
    exp: Optional[int] = None
    email: Optional[str] = None
    role: Optional[str] = None

class UserProfileUpdate(BaseSchema):
    full_name: Optional[str] = None

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.strip()
            if not cleaned:
                raise ValueError("Full name cannot be empty")
            return cleaned
        return v

class AdminUserUpdate(BaseSchema):
    full_name: Optional[str] = None
    role: Optional[str] = None
    email: Optional[str] = None

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.strip()
            if not cleaned:
                raise ValueError("Full name cannot be empty")
            return cleaned
        return v

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.lower().strip()
            if cleaned not in ["learner", "instructor", "admin", "super_admin"]:
                raise ValueError("Role must be one of: learner, instructor, admin, super_admin")
            return cleaned
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if not is_valid_email(v):
                raise ValueError("Invalid email address format")
            return v.lower().strip()
        return v

class UserListResponse(BaseSchema):
    users: List[UserResponse]
    total: int
    page: int
    limit: int
    total_pages: int

    @property
    def items(self) -> List[UserResponse]:
        return self.users

