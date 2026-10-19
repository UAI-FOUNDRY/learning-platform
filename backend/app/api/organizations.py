from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_role
from app.database.session import get_db
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.course import CourseResponse
from app.schemas.organization import (
    MemberAdd, MemberResponse, MemberUpdate, MyOrganizationResponse,
    OrganizationCreate, OrganizationResponse, OrganizationStats, OrganizationUpdate,
)
from app.services.organization_service import organization_service

router = APIRouter()


# ---------------------------------------------------------------- organizations
@router.post("", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_organization(
    org_in: OrganizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin")),
):
    """Super Admin: create a university, college, school, training institute or company."""
    return organization_service.create(db, org_in)


@router.get("", response_model=List[OrganizationResponse])
@router.get("/", response_model=List[OrganizationResponse], include_in_schema=False)
def list_organizations(
    search: Optional[str] = Query(None, description="Matches name or domain"),
    org_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None, description="active | inactive"),
    page: Optional[int] = Query(None, ge=1),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin")),
):
    """Super Admin: all organizations with member and course counts."""
    offset = (page - 1) * limit if page is not None else skip
    return organization_service.list(db, search, org_type, status, offset, limit)


@router.get("/my", response_model=List[MyOrganizationResponse])
def list_my_organizations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Organizations the logged-in user belongs to, with their role in each."""
    return organization_service.list_mine(db, current_user)


@router.get("/{org_id}", response_model=OrganizationResponse)
def get_organization(org_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Super Admin or any member."""
    return organization_service.get(db, org_id, current_user)


@router.put("/{org_id}", response_model=OrganizationResponse)
def update_organization(
    org_id: str,
    update_in: OrganizationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Super Admin or organization admin. Only Super Admin can change `status`."""
    return organization_service.update(db, org_id, update_in, current_user)


@router.delete("/{org_id}", response_model=MessageResponse)
def delete_organization(
    org_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_role("super_admin")),
):
    """Super Admin: delete an organization. Its courses stay on the platform, unlinked."""
    organization_service.delete(db, org_id)
    return MessageResponse(message="Organization deleted")


@router.get("/{org_id}/stats", response_model=OrganizationStats)
def organization_stats(org_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Super Admin or organization admin: members, courses, enrollments and certificates."""
    return organization_service.stats(db, org_id, current_user)


# ---------------------------------------------------------------- members
@router.get("/{org_id}/members", response_model=List[MemberResponse])
def list_members(
    org_id: str,
    member_role: Optional[str] = Query(None, description="admin | instructor | learner | member"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Super Admin or organization admin."""
    return organization_service.list_members(db, org_id, current_user, member_role)


@router.post("/{org_id}/members", response_model=MemberResponse, status_code=status.HTTP_201_CREATED)
def add_member(
    org_id: str, member_in: MemberAdd, db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add an existing platform user by `user_id` or `email`. Super Admin or organization admin."""
    return organization_service.add_member(db, org_id, member_in, current_user)


@router.put("/{org_id}/members/{member_id}", response_model=MemberResponse)
def update_member(
    org_id: str, member_id: str, update_in: MemberUpdate, db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Change a member's role in the organization or their designation."""
    return organization_service.update_member(db, org_id, member_id, update_in, current_user)


@router.delete("/{org_id}/members/{member_id}", response_model=MessageResponse)
def remove_member(
    org_id: str, member_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    """Remove a member. Organization admins can't remove the last admin."""
    organization_service.remove_member(db, org_id, member_id, current_user)
    return MessageResponse(message="Member removed")


# ---------------------------------------------------------------- courses
@router.get("/{org_id}/courses", response_model=List[CourseResponse])
def list_organization_courses(
    org_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    """Members see published courses; organization admins and Super Admin see all."""
    return organization_service.list_courses(db, org_id, current_user)


@router.put("/{org_id}/courses/{course_id}", response_model=CourseResponse)
def link_course(
    org_id: str, course_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    """Attach a course to the organization. Org admins can only attach courses taught by their members."""
    return organization_service.link_course(db, org_id, course_id, current_user)


@router.delete("/{org_id}/courses/{course_id}", response_model=MessageResponse)
def unlink_course(
    org_id: str, course_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    """Detach a course from the organization (the course itself is not deleted)."""
    organization_service.unlink_course(db, org_id, course_id, current_user)
    return MessageResponse(message="Course removed from organization")
