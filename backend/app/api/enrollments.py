from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.schemas.enrollment import (
    EnrollmentResponse,
    EnrollmentWithCourseResponse,
    EnrollmentDetailResponse,
)
from app.schemas.common import MessageResponse
from app.services.enrollment_service import enrollment_service
from app.api.deps import get_current_user, require_role

router = APIRouter()

@router.get("", response_model=List[EnrollmentDetailResponse])
@router.get("/", response_model=List[EnrollmentDetailResponse], include_in_schema=False)
def list_enrollments(
    course_id: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None, description="ACTIVE or COMPLETED"),
    page: Optional[int] = Query(None, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    skip: int = Query(0, ge=0, description="Records to skip"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "instructor")),
):
    """
    Enrollments across the platform with the learner and course attached.
    Super Admin sees all; an Instructor sees only enrollments in their own courses.
    """
    offset = (page - 1) * limit if page is not None else skip
    return enrollment_service.list_enrollments(
        db, current_user, course_id=course_id, user_id=user_id, status_filter=status, skip=offset, limit=limit
    )


@router.get("/my", response_model=List[EnrollmentWithCourseResponse])
def get_my_enrollments(
    page: Optional[int] = Query(None, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    skip: int = Query(0, ge=0, description="Records to skip"),
    status: Optional[str] = Query(None, description="Filter by enrollment status (e.g. ACTIVE, COMPLETED)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("learner")),
):
    """
    Retrieves all enrolled courses for the currently authenticated learner.
    Accessible only to learners.
    """
    offset = (page - 1) * limit if page is not None else skip
    return enrollment_service.get_my_enrollments(
        db=db,
        current_user=current_user,
        skip=offset,
        limit=limit,
        status_filter=status,
    )


@router.get("/{enrollment_id}", response_model=EnrollmentWithCourseResponse)
def get_enrollment(
    enrollment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves a single enrollment record by ID.
    Accessible to Super Admin, the course instructor, or the enrolled learner.
    """
    return enrollment_service.get_enrollment_by_id(db, enrollment_id, current_user)


@router.delete("/{enrollment_id}", response_model=MessageResponse)
def unenroll_course(
    enrollment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Unenrolls a learner from a course.
    Accessible to the enrolled learner or Super Admin.
    """
    enrollment_service.unenroll_course(db, enrollment_id, current_user)
    return MessageResponse(message="Successfully unenrolled from course")
