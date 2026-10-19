from datetime import datetime
from typing import Optional

from pydantic import field_validator

from app.schemas.common import BaseSchema


class CertificateResponse(BaseSchema):
    id: str
    enrollment_id: str
    user_id: str
    course_id: str
    verification_code: str
    learner_name: Optional[str] = None
    course_title: Optional[str] = None
    status: str = "issued"
    issued_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    revoked_reason: Optional[str] = None


class CertificateVerification(BaseSchema):
    """Public result of verifying a certificate code. Never exposes ids or emails."""
    valid: bool
    status: str
    verification_code: str
    learner_name: Optional[str] = None
    course_title: Optional[str] = None
    issued_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None


class CertificateRevokeRequest(BaseSchema):
    reason: str

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("A revocation reason is required")
        return cleaned
