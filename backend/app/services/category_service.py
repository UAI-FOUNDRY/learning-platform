from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from app.models.category import Category
from app.models.course import Course
from app.schemas.category import CategoryCreate, CategoryUpdate

class CategoryService:
    def get_by_id(self, db: Session, category_id: str) -> Optional[Category]:
        if not category_id:
            return None
        return db.query(Category).filter(Category.id == category_id).first()

    def get_by_name(self, db: Session, name: str) -> Optional[Category]:
        if not name:
            return None
        return db.query(Category).filter(func.lower(Category.name) == name.strip().lower()).first()

    def get_by_slug(self, db: Session, slug: str) -> Optional[Category]:
        if not slug:
            return None
        return db.query(Category).filter(Category.slug == slug.strip().lower()).first()

    def list_categories(self, db: Session, skip: int = 0, limit: int = 50) -> List[Category]:
        return db.query(Category).order_by(Category.name.asc()).offset(skip).limit(limit).all()

    def create_category(self, db: Session, category_in: CategoryCreate) -> Category:
        clean_name = category_in.name.strip()
        clean_slug = category_in.slug.strip().lower()

        # Prevent duplicate category name
        if self.get_by_name(db, clean_name):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Category with name '{clean_name}' already exists"
            )

        # Prevent duplicate category slug
        if self.get_by_slug(db, clean_slug):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Category with slug '{clean_slug}' already exists"
            )

        category = Category(
            name=clean_name,
            slug=clean_slug,
            description=category_in.description.strip() if category_in.description else None,
        )

        try:
            db.add(category)
            db.commit()
            db.refresh(category)
            return category
        except Exception:
            db.rollback()
            raise

    def update_category(self, db: Session, category: Category, category_in: CategoryUpdate) -> Category:
        # Validate name update
        if category_in.name is not None:
            clean_name = category_in.name.strip()
            if clean_name.lower() != category.name.lower():
                existing = self.get_by_name(db, clean_name)
                if existing and existing.id != category.id:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"Category with name '{clean_name}' already exists"
                    )
            category.name = clean_name

        # Validate slug update
        if category_in.slug is not None:
            clean_slug = category_in.slug.strip().lower()
            if clean_slug != category.slug:
                existing = self.get_by_slug(db, clean_slug)
                if existing and existing.id != category.id:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"Category with slug '{clean_slug}' already exists"
                    )
            category.slug = clean_slug

        # Validate description update
        if category_in.description is not None:
            category.description = category_in.description.strip() if category_in.description else None

        try:
            db.commit()
            db.refresh(category)
            return category
        except HTTPException:
            raise
        except Exception:
            db.rollback()
            raise

    def delete_category(self, db: Session, category: Category) -> None:
        """
        Deletes a category. Prevents deletion if any courses reference it.
        """
        # Inspect existing Course relationships
        course_count = db.query(Course).filter(Course.category_id == category.id).count()
        if course_count > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot delete category '{category.name}' because {course_count} course(s) reference it. Please reassign or delete the courses first."
            )

        try:
            db.delete(category)
            db.commit()
        except HTTPException:
            raise
        except Exception:
            db.rollback()
            raise

category_service = CategoryService()
