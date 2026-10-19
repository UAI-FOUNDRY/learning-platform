from datetime import datetime
from typing import Any, List, Optional

from pydantic import field_validator, model_validator

from app.schemas.common import BaseSchema


class NotificationResponse(BaseSchema):
    id: str
    type: str
    title: str
    message: Optional[str] = None
    link_url: Optional[str] = None
    data: Optional[Any] = None
    is_read: bool = False
    read_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class UnreadCountResponse(BaseSchema):
    unread: int


class PreferenceItem(BaseSchema):
    notification_type: str
    in_app_enabled: Optional[bool] = None
    email_enabled: Optional[bool] = None


class PreferencesUpdate(BaseSchema):
    preferences: List[PreferenceItem]


class PreferenceResponse(BaseSchema):
    notification_type: str
    in_app_enabled: bool
    email_enabled: bool


class AnnouncementCreate(BaseSchema):
    title: str
    body: str
    audience: str = "course"  # course | all | learners | instructors
    course_id: Optional[str] = None

    @field_validator("title")
    @classmethod
    def check_title(cls, v: str) -> str:
        v = v.strip()
        if not v or len(v) > 255:
            raise ValueError("Title is required (max 255 characters)")
        return v

    @field_validator("body")
    @classmethod
    def check_body(cls, v: str) -> str:
        v = v.strip()
        if not v or len(v) > 5000:
            raise ValueError("Message is required (max 5000 characters)")
        return v

    @field_validator("audience")
    @classmethod
    def check_audience(cls, v: str) -> str:
        v = v.strip().lower()
        if v not in ("course", "all", "learners", "instructors"):
            raise ValueError("audience must be course, all, learners or instructors")
        return v

    @model_validator(mode="after")
    def check_course_matches_audience(self):
        if self.audience == "course" and not self.course_id:
            raise ValueError("course_id is required for a course announcement")
        if self.audience != "course" and self.course_id:
            raise ValueError("course_id is only for course announcements")
        return self


class AnnouncementResponse(BaseSchema):
    id: str
    course_id: Optional[str] = None
    author_id: Optional[str] = None
    audience: str
    title: str
    body: str
    created_at: Optional[datetime] = None
