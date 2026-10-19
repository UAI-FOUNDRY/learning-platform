from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.schemas.course import (
    CourseResponse,
    CourseReviewRequest,
    CourseRejectRequest,
)
from app.services.course_service import course_service
from app.services.admin_service import admin_service
from app.services.audit_service import audit_service
from app.schemas.settings import AuditLogResponse, LoginHistoryResponse
from app.models.security import LoginHistory
from app.api.deps import require_role

router = APIRouter()

@router.get("/overview")
def admin_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin")),
):
    """Counts for the Super Admin dashboard: users, courses, enrollments, certificates, reviews, organizations."""
    return admin_service.overview(db)


@router.get("/courses/pending", response_model=List[CourseResponse])
def list_pending_courses(
    page: Optional[int] = Query(None, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    skip: int = Query(0, ge=0, description="Records to skip"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin")),
):
    """
    Lists courses currently awaiting Super Admin review, sorted by submitted_at ASC.
    Accessible only to Super Admin.
    """
    offset = (page - 1) * limit if page is not None else skip
    return course_service.list_pending_courses(
        db=db,
        skip=offset,
        limit=limit,
        current_user=current_user,
    )


@router.post("/courses/{course_id}/approve", response_model=CourseResponse)
def approve_course(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin")),
):
    """
    Approves a course in 'pending_review' status and publishes it.
    Self-approval by the course instructor is strictly forbidden.
    Accessible only to Super Admin.
    """
    return course_service.approve_course(db, course_id, current_user)


@router.post("/courses/{course_id}/request-changes", response_model=CourseResponse)
def request_changes(
    course_id: str,
    review_in: CourseReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin")),
):
    """
    Requests changes for a course in 'pending_review' status with feedback notes.
    Transitions status to 'changes_requested'.
    Accessible only to Super Admin.
    """
    return course_service.request_changes(db, course_id, review_in.feedback, current_user)


@router.post("/courses/{course_id}/reject", response_model=CourseResponse)
def reject_course(
    course_id: str,
    reject_in: CourseRejectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin")),
):
    """
    Rejects a course in 'pending_review' status with a rejection reason.
    Transitions status to 'rejected'.
    Accessible only to Super Admin.
    """
    return course_service.reject_course(db, course_id, reject_in.reason, current_user)


@router.get("/audit-logs", response_model=List[AuditLogResponse])
def list_audit_logs(
    action: Optional[str] = Query(None, description="Prefix match, e.g. 'course.' or 'user.status_changed'"),
    actor_id: Optional[str] = None,
    entity_type: Optional[str] = Query(None, description="user, course, review, certificate, platform_settings"),
    entity_id: Optional[str] = None,
    page: Optional[int] = Query(None, ge=1),
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin")),
):
    """Who did what: user changes, course decisions, review moderation, revoked certificates, settings edits."""
    offset = (page - 1) * limit if page is not None else skip
    rows = audit_service.list(db, action, actor_id, entity_type, entity_id, offset, limit)
    return [
        AuditLogResponse(
            id=r.id, actor_id=r.actor_id, actor_name=r.actor.full_name if r.actor else None,
            action=r.action, entity_type=r.entity_type, entity_id=r.entity_id,
            changes=r.changes, ip_address=r.ip_address, created_at=r.created_at,
        )
        for r in rows
    ]


@router.get("/login-history", response_model=List[LoginHistoryResponse])
def list_login_history(
    email: Optional[str] = None,
    success: Optional[bool] = None,
    page: Optional[int] = Query(None, ge=1),
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin")),
):
    """Every login attempt (successful or not) for security monitoring."""
    offset = (page - 1) * limit if page is not None else skip
    q = db.query(LoginHistory)
    if email:
        q = q.filter(LoginHistory.email == email.strip().lower())
    if success is not None:
        q = q.filter(LoginHistory.success.is_(success))
    return q.order_by(LoginHistory.created_at.desc()).offset(offset).limit(limit).all()
