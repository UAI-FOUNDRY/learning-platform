from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.schemas.category import (
    CategoryCreate,
    CategoryUpdate,
    CategoryResponse,
)
from app.schemas.common import MessageResponse
from app.services.category_service import category_service
from app.api.deps import get_current_user, require_role

router = APIRouter()

@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_category(
    category_in: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "super_admin")),
):
    """
    Creates a new category.
    Restricted to administrators (admin, super_admin).
    """
    return category_service.create_category(db, category_in)


@router.get("", response_model=List[CategoryResponse])
@router.get("/", response_model=List[CategoryResponse], include_in_schema=False)
def list_categories(
    page: Optional[int] = Query(None, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    skip: int = Query(0, ge=0, description="Records to skip"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lists categories with pagination.
    Accessible to all authenticated users.
    """
    offset = (page - 1) * limit if page is not None else skip
    return category_service.list_categories(db, skip=offset, limit=limit)


@router.get("/{category_id}", response_model=CategoryResponse)
def get_category(
    category_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves category details by ID.
    Accessible to all authenticated users.
    """
    category = category_service.get_by_id(db, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    return category


@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: str,
    category_in: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "super_admin")),
):
    """
    Updates category details.
    Restricted to administrators (admin, super_admin).
    """
    category = category_service.get_by_id(db, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    return category_service.update_category(db, category, category_in)


@router.delete("/{category_id}", response_model=MessageResponse)
def delete_category(
    category_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "super_admin")),
):
    """
    Deletes a category if not in use by courses.
    Restricted to administrators (admin, super_admin).
    """
    category = category_service.get_by_id(db, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    category_service.delete_category(db, category)
    return MessageResponse(
        message="Category deleted successfully",
        detail=f"Category '{category.name}' has been deleted."
    )
