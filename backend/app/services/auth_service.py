from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User
from app.schemas.user import UserRegister, TokenResponse
from app.utils.security import verify_password, get_password_hash, create_access_token
from app.services.platform_settings_service import get_setting

class AuthService:
    def get_user_by_email(self, db: Session, email: str) -> Optional[User]:
        if not email:
            return None
        return db.query(User).filter(User.email == email.lower().strip()).first()

    def get_user_by_id(self, db: Session, user_id: str) -> Optional[User]:
        if not user_id:
            return None
        return db.query(User).filter(User.id == user_id).first()

    def check_new_password(self, db: Session, password: str) -> None:
        minimum = int(get_setting(db, "security.password_min_length", 8) or 8)
        if len(password or "") < minimum:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Password must be at least {minimum} characters long",
            )

    def register_user(self, db: Session, user_in: UserRegister) -> User:
        if not get_setting(db, "users.allow_public_registration", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Public registration is currently disabled",
            )
        clean_email = user_in.email.lower().strip()
        existing_user = self.get_user_by_email(db, clean_email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists"
            )

        clean_role = (user_in.role or "learner").lower().strip()
        if clean_role == "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Public registration cannot assign administrative roles"
            )
        if clean_role not in ["learner", "instructor"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role '{clean_role}'. Valid roles are: learner, instructor"
            )
        if clean_role == "instructor" and not get_setting(db, "users.allow_instructor_self_signup", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Instructor accounts are created by an administrator",
            )

        hashed_password = get_password_hash(user_in.password)
        db_user = User(
            email=clean_email,
            hashed_password=hashed_password,
            full_name=user_in.full_name.strip(),
            role=clean_role
        )
        try:
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
            return db_user
        except Exception:
            db.rollback()
            raise

    def authenticate_user(self, db: Session, email: str, password: str) -> Optional[User]:
        if not email or not password:
            return None
        user = self.get_user_by_email(db, email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    def record_login(self, db: Session, user: User) -> None:
        """Stores the time of the last successful login (best effort; never blocks login)."""
        try:
            user.last_login_at = datetime.utcnow()
            db.commit()
        except Exception:
            db.rollback()

    def create_user_token(self, user: User) -> TokenResponse:
        access_token = create_access_token(
            data={"sub": user.id, "email": user.email, "role": user.role}
        )
        return TokenResponse(access_token=access_token, token_type="bearer")

auth_service = AuthService()
