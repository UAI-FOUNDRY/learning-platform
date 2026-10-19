"""Shared course lifecycle rules: approval history, edits to published courses, learner access."""
from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.course import Course
from app.models.course_approval_log import CourseApprovalLog
from app.models.user import User
from app.services.platform_settings_service import get_setting

PUBLISHED = "published"
PENDING_REVIEW = "pending_review"
CHANGES_REQUESTED = "changes_requested"


def is_live_for_enrolled(course: Course) -> bool:
    """Can already-enrolled learners keep using the course (lectures, quizzes, assignments)?

    A course that was published once stays usable for people who enrolled, even while it is
    reopened for editing or re-reviewed. New enrolments and the public catalog still need `published`.
    """
    status = (course.status or "").lower()
    if status == PUBLISHED:
        return True
    return course.published_at is not None and status in (PENDING_REVIEW, CHANGES_REQUESTED, "draft")


def log_approval(
    db: Session,
    course: Course,
    actor: Optional[User],
    action: str,
    from_status: Optional[str],
    to_status: str,
    comment: Optional[str] = None,
) -> None:
    """Append a row to course_approval_logs (committed together with the caller's change)."""
    db.add(
        CourseApprovalLog(
            course_id=course.id,
            actor_id=actor.id if actor else None,
            action=action,
            from_status=(from_status or "").lower() or None,
            to_status=to_status,
            comment=comment,
        )
    )


def apply_published_edit_policy(db: Session, course: Course, actor: User) -> None:
    """Called before an instructor changes a course, section, lecture, quiz or assignment.

    When `courses.reapproval_on_published_edit` is on (default), a published course cannot be
    edited in place: the instructor first calls `POST /courses/{id}/reopen`, which moves it to
    `draft` (out of the public catalog, but enrolled learners keep access), edits freely, and
    submits it for review again. Super Admins are trusted and are never blocked.
    """
    if actor.role != "instructor" or (course.status or "").lower() != PUBLISHED:
        return
    if not get_setting(db, "courses.reapproval_on_published_edit", True):
        return
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="This course is published. Reopen it for editing (POST /courses/{id}/reopen); "
        "your changes will be reviewed again before they go live.",
    )


def reopen_for_editing(db: Session, course: Course, actor: User) -> Course:
    """Published -> draft so the owner can edit; enrolled learners keep access."""
    if actor.role == "instructor" and course.instructor_id != actor.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Instructors can only reopen their own courses")
    if actor.role not in ("instructor", "super_admin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient permissions to reopen course")
    if (course.status or "").lower() != PUBLISHED:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only published courses can be reopened for editing")
    log_approval(db, course, actor, "unpublished", PUBLISHED, "draft", "Reopened for editing")
    course.status = "draft"
    course.updated_at = datetime.utcnow()
    try:
        db.commit()
        db.refresh(course)
    except Exception:
        db.rollback()
        raise
    return course
