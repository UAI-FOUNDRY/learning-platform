from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User
from app.schemas.user import UserCreate, Token
from app.utils.security import verify_password, get_password_hash, create_access_token

class AuthService:
    def get_user_by_email(self, db: Session, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email.lower().strip()).first()

    def get_user_by_id(self, db: Session, user_id: str) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()

    def register_user(self, db: Session, user_in: UserCreate) -> User:
        clean_email = user_in.email.lower().strip()
        existing_user = self.get_user_by_email(db, clean_email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email already exists"
            )

        hashed_password = get_password_hash(user_in.password)
        db_user = User(
            email=clean_email,
            hashed_password=hashed_password,
            full_name=user_in.full_name.strip(),
            role=user_in.role or "learner"
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    def authenticate_user(self, db: Session, email: str, password: str) -> Optional[User]:
        user = self.get_user_by_email(db, email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    def create_user_token(self, user: User) -> Token:
        access_token = create_access_token(
            data={"sub": user.id, "email": user.email, "role": user.role}
        )
        return Token(access_token=access_token, token_type="bearer")

auth_service = AuthService()
