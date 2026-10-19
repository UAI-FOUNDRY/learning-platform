import re
from typing import Optional
from datetime import datetime
from pydantic import field_validator
from app.schemas.common import BaseSchema

class CategoryBase(BaseSchema):
    name: str
    slug: str
    description: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Category name cannot be empty")
        if len(cleaned) > 128:
            raise ValueError("Category name cannot exceed 128 characters")
        return cleaned

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if not cleaned:
            raise ValueError("Category slug cannot be empty")
        if len(cleaned) > 128:
            raise ValueError("Category slug cannot exceed 128 characters")
        if not re.match(r"^[a-z0-9]+(?:-[a-z0-9]+)*$", cleaned):
            raise ValueError("Slug must be lowercase alphanumeric characters separated by single hyphens")
        return cleaned

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return v.strip()
        return v

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseSchema):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.strip()
            if not cleaned:
                raise ValueError("Category name cannot be empty")
            if len(cleaned) > 128:
                raise ValueError("Category name cannot exceed 128 characters")
            return cleaned
        return v

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.strip().lower()
            if not cleaned:
                raise ValueError("Category slug cannot be empty")
            if len(cleaned) > 128:
                raise ValueError("Category slug cannot exceed 128 characters")
            if not re.match(r"^[a-z0-9]+(?:-[a-z0-9]+)*$", cleaned):
                raise ValueError("Slug must be lowercase alphanumeric characters separated by single hyphens")
            return cleaned
        return v

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return v.strip()
        return v

class CategoryResponse(BaseSchema):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    created_at: Optional[datetime] = None
