from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.schemas.course import (
    CourseCreate,
    CourseUpdate,
    CourseResponse,
    CourseApprovalLogResponse,
)
from app.schemas.common import MessageResponse
from app.schemas.enrollment import EnrollmentResponse, EnrollmentWithUserResponse
from app.services.course_service import course_service
from app.services.enrollment_service import enrollment_service
from app.api.deps import get_optional_user, require_role

router = APIRouter()

@router.post("", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=CourseResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_course(
    course_in: CourseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "instructor")),
):
    """
    Creates a new course with initial 'draft' status.
    Accessible to Super Admin and Instructors.
    """
    return course_service.create_course(db, course_in, current_user)


@router.get("", response_model=List[CourseResponse])
@router.get("/", response_model=List[CourseResponse], include_in_schema=False)
def list_courses(
    page: Optional[int] = Query(None, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    skip: int = Query(0, ge=0, description="Records to skip"),
    category_id: Optional[str] = Query(None, description="Filter courses by category ID"),
    instructor_id: Optional[str] = Query(None, description="Filter courses by instructor ID"),
    status: Optional[str] = Query(None, description="Filter courses by status (e.g. draft, published)"),
    search: Optional[str] = Query(None, description="Search courses by keyword in title or description"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Lists courses with pagination and optional filtering.
    **Public**: anyone can browse; visitors and learners only see published courses.
    """
    offset = (page - 1) * limit if page is not None else skip
    return course_service.list_courses(
        db=db,
        skip=offset,
        limit=limit,
        category_id=category_id,
        instructor_id=instructor_id,
        status_filter=status,
        search=search,
        current_user=current_user,
    )


@router.get("/{course_id}", response_model=CourseResponse)
def get_course(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Retrieves a specific course by ID.
    **Public** for published courses; other statuses need a Super Admin/Instructor login.
    """
    return course_service.get_course(db, course_id, current_user)


@router.put("/{course_id}", response_model=CourseResponse)
def update_course(
    course_id: str,
    course_in: CourseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "instructor")),
):
    """
    Updates an existing course.
    Super Admin can update any course; Instructors can only update their own courses.
    """
    return course_service.update_course(db, course_id, course_in, current_user)


@router.delete("/{course_id}", response_model=MessageResponse)
def delete_course(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "instructor")),
):
    """
    Deletes an unused course.
    Super Admin can delete any course; Instructors can only delete their own courses.
    """
    course_service.delete_course(db, course_id, current_user)
    return MessageResponse(message="Course deleted successfully")


@router.post("/{course_id}/submit", response_model=CourseResponse)
def submit_course(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "instructor")),
):
    """
    Submits a draft or changes_requested course for Super Admin review.
    Accessible to Super Admin and course owner Instructor.
    """
    return course_service.submit_course_for_approval(db, course_id, current_user)


@router.get("/{course_id}/approval-history", response_model=List[CourseApprovalLogResponse])
def course_approval_history(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "instructor")),
):
    """Every submit / approve / changes-requested / reject / reopen decision on this course."""
    return course_service.approval_history(db, course_id, current_user)


@router.post("/{course_id}/reopen", response_model=CourseResponse)
def reopen_course(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "instructor")),
):
    """
    Moves a published course back to 'draft' so it can be edited and re-reviewed.
    The course leaves the public catalog; learners already enrolled keep access.
    """
    return course_service.reopen_course(db, course_id, current_user)


@router.post("/{course_id}/enroll", response_model=EnrollmentResponse, status_code=status.HTTP_201_CREATED)
def enroll_in_course(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("learner")),
):
    """
    Enrolls the authenticated learner in a published course.
    Accessible only to learners.
    """
    return enrollment_service.enroll_in_course(db, course_id, current_user)


@router.get("/{course_id}/enrollments", response_model=List[EnrollmentWithUserResponse])
def get_course_enrollments(
    course_id: str,
    page: Optional[int] = Query(None, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    skip: int = Query(0, ge=0, description="Records to skip"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "instructor")),
):
    """
    Retrieves the enrollment roster for a specific course.
    Accessible to Super Admin and the course instructor owner.
    """
    offset = (page - 1) * limit if page is not None else skip
    return enrollment_service.get_course_enrollments(
        db=db,
        course_id=course_id,
        current_user=current_user,
        skip=offset,
        limit=limit,
    )
