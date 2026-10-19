from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_role
from app.database.session import get_db
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.notification import (
    AnnouncementCreate, AnnouncementResponse, NotificationResponse, PreferenceResponse,
    PreferencesUpdate, UnreadCountResponse,
)
from app.services.notification_service import notification_service

router = APIRouter()
announcements_router = APIRouter()


@router.get("", response_model=List[NotificationResponse])
@router.get("/", response_model=List[NotificationResponse], include_in_schema=False)
def my_notifications(
    unread_only: bool = False,
    page: Optional[int] = Query(None, ge=1),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """My notifications, newest first."""
    offset = (page - 1) * limit if page is not None else skip
    return notification_service.list_for_user(db, current_user, unread_only, offset, limit)


@router.get("/unread-count", response_model=UnreadCountResponse)
def unread_count(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Number for the bell icon."""
    return UnreadCountResponse(unread=notification_service.unread_count(db, current_user))


@router.post("/read-all", response_model=MessageResponse)
def read_all(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    n = notification_service.mark_all_read(db, current_user)
    return MessageResponse(message=f"{n} notification(s) marked as read")


@router.get("/preferences", response_model=List[PreferenceResponse])
def get_preferences(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Which notification types I receive in the app / by email (default: all on)."""
    return notification_service.get_preferences(db, current_user)


@router.put("/preferences", response_model=List[PreferenceResponse])
def set_preferences(body: PreferencesUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return notification_service.set_preferences(db, current_user, body.preferences)


@router.post("/{notification_id}/read", response_model=NotificationResponse)
def mark_read(notification_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return notification_service.mark_read(db, current_user, notification_id)


@router.delete("/{notification_id}", response_model=MessageResponse)
def delete_notification(notification_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notification_service.delete(db, current_user, notification_id)
    return MessageResponse(message="Notification deleted")


# ------------------------------------------------------------------ announcements
@announcements_router.post("", response_model=AnnouncementResponse, status_code=201)
@announcements_router.post("/", response_model=AnnouncementResponse, status_code=201, include_in_schema=False)
def create_announcement(
    body: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "instructor")),
):
    """
    Instructor: announce to learners of their own course (`audience: "course"` + `course_id`).
    Super Admin: also to the whole platform (`all`, `learners` or `instructors`).
    Every recipient gets an in-app notification.
    """
    return notification_service.create_announcement(db, current_user, body.title, body.body, body.audience, body.course_id)


@announcements_router.get("", response_model=List[AnnouncementResponse])
@announcements_router.get("/", response_model=List[AnnouncementResponse], include_in_schema=False)
def list_announcements(
    course_id: Optional[str] = None,
    page: Optional[int] = Query(None, ge=1),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Announcements I can see: platform ones for my role, plus courses I am enrolled in or teach."""
    offset = (page - 1) * limit if page is not None else skip
    return notification_service.list_for_user_announcements(db, current_user, course_id, offset, limit)


@announcements_router.delete("/{announcement_id}", response_model=MessageResponse)
def delete_announcement(announcement_id: str, db: Session = Depends(get_db),
                        current_user: User = Depends(require_role("super_admin", "instructor"))):
    notification_service.delete_announcement(db, current_user, announcement_id)
    return MessageResponse(message="Announcement deleted")
