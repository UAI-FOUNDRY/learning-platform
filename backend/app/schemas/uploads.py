from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import field_validator

from app.schemas.common import BaseSchema, StorageUrl


class UploadResponse(BaseSchema):
    ref: str                      # what the database stores
    url: Optional[str] = None     # what the browser uses (signed for private files)
    file_name: str
    size: int
    content_type: str
    purpose: str
    applied: Dict[str, Any] = {}  # what the upload was attached to


class SignedUploadRequest(BaseSchema):
    purpose: str
    target_id: str
    file_name: str
    content_type: Optional[str] = None


class SignedUploadResponse(BaseSchema):
    upload_url: str
    method: str = "PUT"
    ref: str
    max_size_mb: int
    expires_in_seconds: int


class ConfirmUploadRequest(BaseSchema):
    purpose: str
    target_id: str
    ref: str
    file_name: Optional[str] = None
    title: Optional[str] = None
    language_code: Optional[str] = None
    size: Optional[int] = None


class ResourceLinkCreate(BaseSchema):
    title: str
    url: str

    @field_validator("title")
    @classmethod
    def check_title(cls, v: str) -> str:
        v = (v or "").strip()
        if not v or len(v) > 255:
            raise ValueError("Title is required and must be at most 255 characters")
        return v

    @field_validator("url")
    @classmethod
    def check_url(cls, v: str) -> str:
        v = (v or "").strip()
        if not (v.lower().startswith("http://") or v.lower().startswith("https://")):
            raise ValueError("url must start with http:// or https://")
        return v


class ResourceResponse(BaseSchema):
    id: str
    lecture_id: str
    title: str
    resource_type: str
    url: StorageUrl = None
    file_size_bytes: Optional[int] = None
    created_at: Optional[datetime] = None


class SubtitleResponse(BaseSchema):
    id: str
    lecture_id: str
    language_code: str
    label: Optional[str] = None
    url: StorageUrl = None
    created_at: Optional[datetime] = None


class SubmissionFileResponse(BaseSchema):
    id: str
    submission_id: str
    file_name: str
    file_url: StorageUrl = None
    mime_type: Optional[str] = None
    file_size_bytes: Optional[int] = None
    uploaded_at: Optional[datetime] = None
