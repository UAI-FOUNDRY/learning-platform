from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.schemas.section import (
    SectionCreate,
    SectionUpdate,
    SectionResponse,
)
from app.schemas.common import MessageResponse
from app.services.section_service import section_service
from app.api.deps import get_current_user, require_role

router = APIRouter()

@router.post("/courses/{course_id}/sections", response_model=SectionResponse, status_code=status.HTTP_201_CREATED)
@router.post("/courses/{course_id}/sections/", response_model=SectionResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_section(
    course_id: str,
    section_in: SectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "instructor")),
):
    """
    Creates a new section within a course.
    Accessible to Super Admin and Instructors (owner of the course).
    """
    return section_service.create_section(db, course_id, section_in, current_user)


@router.get("/courses/{course_id}/sections", response_model=List[SectionResponse])
@router.get("/courses/{course_id}/sections/", response_model=List[SectionResponse], include_in_schema=False)
def list_sections_for_course(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lists all sections for a course, ordered by order_index.
    Accessible to all authenticated users.
    """
    return section_service.list_sections_for_course(db, course_id, current_user)


@router.get("/sections/{section_id}", response_model=SectionResponse)
def get_section(
    section_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves a section by ID.
    Accessible to all authenticated users.
    """
    return section_service.get_section(db, section_id, current_user)


@router.put("/sections/{section_id}", response_model=SectionResponse)
def update_section(
    section_id: str,
    section_in: SectionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "instructor")),
):
    """
    Updates a section's title and/or order_index.
    Accessible to Super Admin and Course Owner Instructor.
    """
    return section_service.update_section(db, section_id, section_in, current_user)


@router.delete("/sections/{section_id}", response_model=MessageResponse)
def delete_section(
    section_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "instructor")),
):
    """
    Deletes a section if no learner activity records exist.
    Accessible to Super Admin and Course Owner Instructor.
    """
    section_service.delete_section(db, section_id, current_user)
    return MessageResponse(message="Section deleted successfully")
