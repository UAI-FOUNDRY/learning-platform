"""In-app notifications (+ optional email), preferences and announcements.

`notify()` is best effort and is meant to be called AFTER the caller's own commit,
so a notification problem can never undo or block the real action.
"""
import logging
from datetime import datetime
from typing import Any, Dict, Iterable, List, Optional

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.notification import NOTIFICATION_TYPES, Announcement, Notification, NotificationPreference
from app.models.user import User
from app.services.email_service import email_service
from app.services.platform_settings_service import get_setting

logger = logging.getLogger(__name__)


class NotificationService:
    # ------------------------------------------------------------------ creating
    def _prefs(self, db: Session, user_ids: Iterable[str], ntype: str) -> Dict[str, NotificationPreference]:
        ids = list(user_ids)
        if not ids:
            return {}
        rows = db.query(NotificationPreference).filter(
            NotificationPreference.user_id.in_(ids), NotificationPreference.notification_type == ntype
        ).all()
        return {r.user_id: r for r in rows}

    def notify(
        self,
        db: Session,
        user_id: Optional[str],
        ntype: str,
        title: str,
        message: Optional[str] = None,
        link_url: Optional[str] = None,
        data: Optional[dict] = None,
    ) -> Optional[Notification]:
        """Create one notification for one user (skipped if they switched this type off)."""
        if not user_id:
            return None
        try:
            pref = self._prefs(db, [user_id], ntype).get(user_id)
            if pref is not None and not pref.in_app_enabled and not pref.email_enabled:
                return None
            note = None
            if pref is None or pref.in_app_enabled:
                note = Notification(user_id=user_id, type=ntype, title=title[:255], message=message,
                                    link_url=link_url, data=data)
                db.add(note)
            if (pref is None or pref.email_enabled) and get_setting(db, "notifications.email_enabled", False):
                user = db.get(User, user_id)
                if user is not None and user.is_active:
                    if email_service.send(user.email, title, (message or title) + (f"\n\n{link_url}" if link_url else "")) and note:
                        note.email_sent_at = datetime.utcnow()
            db.commit()
            if note is not None:
                db.refresh(note)
            return note
        except Exception:
            logger.exception("Could not create notification %s for %s", ntype, user_id)
            db.rollback()
            return None

    def notify_many(
        self,
        db: Session,
        user_ids: List[str],
        ntype: str,
        title: str,
        message: Optional[str] = None,
        link_url: Optional[str] = None,
        data: Optional[dict] = None,
    ) -> int:
        """In-app notification for many users in one commit (used for announcements)."""
        try:
            prefs = self._prefs(db, user_ids, ntype)
            rows = [
                Notification(user_id=uid, type=ntype, title=title[:255], message=message, link_url=link_url, data=data)
                for uid in dict.fromkeys(user_ids)
                if not (uid in prefs and not prefs[uid].in_app_enabled)
            ]
            db.add_all(rows)
            db.commit()
            return len(rows)
        except Exception:
            logger.exception("Could not fan out notification %s", ntype)
            db.rollback()
            return 0

    # ------------------------------------------------------------------ reading
    def list_for_user(self, db: Session, user: User, unread_only: bool = False, skip: int = 0, limit: int = 50):
        q = db.query(Notification).filter(Notification.user_id == user.id)
        if unread_only:
            q = q.filter(Notification.is_read.is_(False))
        return q.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()

    def unread_count(self, db: Session, user: User) -> int:
        return db.query(Notification).filter(Notification.user_id == user.id, Notification.is_read.is_(False)).count()

    def _own(self, db: Session, user: User, notification_id: str) -> Notification:
        note = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == user.id).first()
        if note is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found")
        return note

    def mark_read(self, db: Session, user: User, notification_id: str) -> Notification:
        note = self._own(db, user, notification_id)
        if not note.is_read:
            note.is_read, note.read_at = True, datetime.utcnow()
            db.commit()
            db.refresh(note)
        return note

    def mark_all_read(self, db: Session, user: User) -> int:
        n = db.query(Notification).filter(Notification.user_id == user.id, Notification.is_read.is_(False)).update(
            {Notification.is_read: True, Notification.read_at: datetime.utcnow()}, synchronize_session=False
        )
        db.commit()
        return n

    def delete(self, db: Session, user: User, notification_id: str) -> None:
        db.delete(self._own(db, user, notification_id))
        db.commit()

    # ------------------------------------------------------------------ preferences
    def get_preferences(self, db: Session, user: User) -> List[dict]:
        saved = {p.notification_type: p for p in db.query(NotificationPreference).filter_by(user_id=user.id).all()}
        return [
            {
                "notification_type": t,
                "in_app_enabled": saved[t].in_app_enabled if t in saved else True,
                "email_enabled": saved[t].email_enabled if t in saved else True,
            }
            for t in NOTIFICATION_TYPES
        ]

    def set_preferences(self, db: Session, user: User, items: List[Any]) -> List[dict]:
        for item in items:
            if item.notification_type not in NOTIFICATION_TYPES:
                raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Unknown notification type '{item.notification_type}'")
        existing = {p.notification_type: p for p in db.query(NotificationPreference).filter_by(user_id=user.id).all()}
        for item in items:
            pref = existing.get(item.notification_type)
            if pref is None:
                pref = NotificationPreference(user_id=user.id, notification_type=item.notification_type)
                db.add(pref)
                existing[item.notification_type] = pref
            if item.in_app_enabled is not None:
                pref.in_app_enabled = item.in_app_enabled
            if item.email_enabled is not None:
                pref.email_enabled = item.email_enabled
        db.commit()
        return self.get_preferences(db, user)

    # ------------------------------------------------------------------ announcements
    def create_announcement(self, db: Session, author: User, title: str, body: str, audience: str,
                            course_id: Optional[str]) -> Announcement:
        course = None
        if audience == "course":
            course = db.query(Course).filter(Course.id == course_id).first()
            if course is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Course not found")
            if author.role == "instructor" and course.instructor_id != author.id:
                raise HTTPException(status.HTTP_403_FORBIDDEN, "Instructors can only announce to their own courses")
        elif author.role != "super_admin":
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Only Super Admins can announce to the whole platform")

        ann = Announcement(course_id=course.id if course else None, author_id=author.id,
                           audience=audience, title=title, body=body)
        db.add(ann)
        db.commit()
        db.refresh(ann)

        if course is not None:
            ids = [e.user_id for e in db.query(Enrollment).filter(
                Enrollment.course_id == course.id, Enrollment.status.in_(["ACTIVE", "COMPLETED"])).all()]
            ntype = "instructor_announcement"
            link = f"/courses/{course.id}"
        else:
            q = db.query(User.id).filter(User.status == "active")
            if audience == "learners":
                q = q.filter(User.role == "learner")
            elif audience == "instructors":
                q = q.filter(User.role == "instructor")
            ids = [row[0] for row in q.all()]
            ntype, link = "admin_announcement", None
        ids = [i for i in ids if i != author.id]
        self.notify_many(db, ids, ntype, title, body[:500], link, {"announcement_id": ann.id, "course_id": ann.course_id})
        return ann

    def _visible_filter(self, db: Session, user: User):
        if user.role == "super_admin":
            return None
        enrolled = [e.course_id for e in db.query(Enrollment.course_id).filter(Enrollment.user_id == user.id).all()]
        owned = [c.id for c in db.query(Course.id).filter(Course.instructor_id == user.id).all()] if user.role == "instructor" else []
        platform = ["all", "learners" if user.role == "learner" else "instructors"]
        return or_(Announcement.audience.in_(platform), Announcement.course_id.in_(enrolled + owned))

    def list_for_user_announcements(self, db: Session, user: User, course_id: Optional[str] = None,
                                    skip: int = 0, limit: int = 50) -> List[Announcement]:
        q = db.query(Announcement)
        cond = self._visible_filter(db, user)
        if cond is not None:
            q = q.filter(cond)
        if course_id:
            q = q.filter(Announcement.course_id == course_id)
        return q.order_by(Announcement.created_at.desc()).offset(skip).limit(limit).all()

    def delete_announcement(self, db: Session, user: User, announcement_id: str) -> None:
        ann = db.query(Announcement).filter(Announcement.id == announcement_id).first()
        if ann is None or (user.role != "super_admin" and ann.author_id != user.id):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Announcement not found")
        db.delete(ann)
        db.commit()


notification_service = NotificationService()
