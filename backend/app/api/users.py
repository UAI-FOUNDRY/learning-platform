from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.schemas.user import (
    UserResponse,
    UserProfileUpdate,
    AdminUserUpdate,
    UserListResponse,
)
from app.schemas.common import MessageResponse
from app.services.user_service import user_service
from app.api.deps import get_current_user, require_role

router = APIRouter()

# -------------------------------------------------------------
# User Profile Endpoints
# -------------------------------------------------------------

@router.get("/me", response_model=UserResponse)
def get_my_profile(current_user: User = Depends(get_current_user)):
    """
    Returns the authenticated user's safe profile.
    Requires a valid Bearer JWT access token.
    """
    return current_user


@router.put("/me", response_model=UserResponse)
def update_my_profile(
    profile_in: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Updates the authenticated user's own profile information (e.g. full_name).
    Restricted: Users cannot update their role, email, password, or id.
    """
    return user_service.update_profile(db, current_user, profile_in)


# -------------------------------------------------------------
# Admin User Management Endpoints
# -------------------------------------------------------------

@router.get("", response_model=UserListResponse)
@router.get("/", response_model=UserListResponse, include_in_schema=False)
def list_users(
    search: Optional[str] = Query(None, description="Search users by full name or email"),
    role: Optional[str] = Query(None, description="Filter users by role (e.g. learner, instructor, super_admin)"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(require_role("super_admin")),
    db: Session = Depends(get_db),
):
    """
    Lists users with pagination, search, and role filtering.
    Restricted to Super Admin (super_admin).
    """
    users, total, total_pages = user_service.list_users(
        db, page=page, limit=limit, search=search, role=role
    )
    return UserListResponse(
        users=users,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.get("/{user_id}", response_model=UserResponse)
def get_user_details(
    user_id: str,
    current_user: User = Depends(require_role("super_admin")),
    db: Session = Depends(get_db),
):
    """
    Returns the safe profile of a specific user.
    Restricted to Super Admin (super_admin).
    """
    user = user_service.get_user_by_id(db, user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.put("/{user_id}", response_model=UserResponse)
def admin_update_user(
    user_id: str,
    update_in: AdminUserUpdate,
    current_user: User = Depends(require_role("super_admin")),
    db: Session = Depends(get_db),
):
    """
    Updates a user's details or role.
    Restricted to Super Admin (super_admin).
    """
    user = user_service.get_user_by_id(db, user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user_service.admin_update_user(db, user, update_in)


@router.delete("/{user_id}", response_model=MessageResponse)
def delete_user(
    user_id: str,
    current_user: User = Depends(require_role("super_admin")),
    db: Session = Depends(get_db),
):
    """
    Safely deletes a user from the system.
    Restricted to Super Admin (super_admin).
    """
    user = user_service.get_user_by_id(db, user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    user_service.delete_user(db, user, current_user=current_user)
    return MessageResponse(
        message="User deleted successfully",
        detail=f"User {user_id} has been deleted."
    )
