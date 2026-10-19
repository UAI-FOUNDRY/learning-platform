from datetime import datetime
from typing import Optional, Tuple, List
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from fastapi import HTTPException, status
from app.models.user import User
from app.services.audit_service import audit_service
from app.schemas.user import UserProfileUpdate, AdminUserUpdate

class UserService:
    def get_user_by_id(self, db: Session, user_id: str) -> Optional[User]:
        if not user_id:
            return None
        return db.query(User).filter(User.id == user_id).first()

    def get_user_by_email(self, db: Session, email: str) -> Optional[User]:
        if not email:
            return None
        return db.query(User).filter(User.email == email.lower().strip()).first()

    def update_profile(self, db: Session, user: User, profile_in: UserProfileUpdate) -> User:
        """
        Updates an authenticated user's own profile.
        Strictly prevents modifying email, role, id, or password.
        """
        if profile_in.full_name is not None:
            user.full_name = profile_in.full_name

        user.updated_at = datetime.utcnow()
        try:
            db.commit()
            db.refresh(user)
            return user
        except Exception:
            db.rollback()
            raise

    def list_users(
        self,
        db: Session,
        page: int = 1,
        limit: int = 20,
        search: Optional[str] = None,
        role: Optional[str] = None,
    ) -> Tuple[List[User], int, int]:
        """
        Returns paginated users with optional search and role filter.
        """
        query = db.query(User)

        if search:
            term = f"%{search.strip().lower()}%"
            query = query.filter(
                or_(
                    func.lower(User.email).like(term),
                    func.lower(User.full_name).like(term)
                )
            )

        if role:
            query = query.filter(User.role == role.strip().lower())

        total = query.count()
        total_pages = (total + limit - 1) // limit if total > 0 else 1
        offset = (page - 1) * limit
        users = query.order_by(User.created_at.desc()).offset(offset).limit(limit).all()

        return users, total, total_pages

    def admin_update_user(
        self, db: Session, target_user: User, update_in: AdminUserUpdate, current_user: Optional[User] = None
    ) -> User:
        """
        Updates a target user by an authorized administrator.
        Permits updating full_name, role, email and account status (activate / deactivate / suspend).
        Administrators cannot change their own status, so they cannot lock themselves out.
        """
        if (
            update_in.status is not None
            and current_user is not None
            and current_user.id == target_user.id
            and update_in.status != target_user.status
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Administrators cannot change their own account status"
            )
        changes = {}
        for field in ("email", "full_name", "role", "status"):
            new_value = getattr(update_in, field)
            if new_value is not None and new_value != getattr(target_user, field):
                changes[field] = [getattr(target_user, field), new_value]
        if update_in.email is not None and update_in.email != target_user.email:
            existing = self.get_user_by_email(db, update_in.email)
            if existing and existing.id != target_user.id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A user with this email already exists"
                )
            target_user.email = update_in.email

        if update_in.full_name is not None:
            target_user.full_name = update_in.full_name

        if update_in.role is not None:
            target_user.role = update_in.role

        if update_in.status is not None:
            target_user.status = update_in.status

        target_user.updated_at = datetime.utcnow()
        if changes:
            action = "user.status_changed" if set(changes) == {"status"} else "user.updated"
            audit_service.log(db, current_user, action, "user", target_user.id, changes)
        try:
            db.commit()
            db.refresh(target_user)
            return target_user
        except Exception:
            db.rollback()
            raise

    def delete_user(self, db: Session, target_user: User, current_user: Optional[User] = None) -> None:
        """
        Safely deletes a user without violating foreign key constraints.
        Disassociates user from courses (sets instructor_id=None).
        Prevents self-deletion by administrators.
        """
        if current_user and current_user.id == target_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Administrators cannot delete their own account"
            )

        try:
            # Set instructor_id = None on any courses instructed by this user
            if hasattr(target_user, "courses") and target_user.courses:
                for course in target_user.courses:
                    course.instructor_id = None

            audit_service.log(db, current_user, "user.deleted", "user", target_user.id,
                              {"email": [target_user.email, None], "role": [target_user.role, None]})
            db.delete(target_user)
            db.commit()
        except Exception:
            db.rollback()
            raise

user_service = UserService()
