from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.schemas.course import (
    CourseCreate,
    CourseUpdate,
    CourseResponse,
)
from app.schemas.common import MessageResponse
from app.services.course_service import course_service
from app.api.deps import get_current_user, require_role

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
    current_user: User = Depends(get_current_user),
):
    """
    Lists courses with pagination and optional filtering.
    Accessible to all authenticated users (super_admin, instructor, learner).
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
    )


@router.get("/{course_id}", response_model=CourseResponse)
def get_course(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves a specific course by ID.
    Accessible to all authenticated users (super_admin, instructor, learner).
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
