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
