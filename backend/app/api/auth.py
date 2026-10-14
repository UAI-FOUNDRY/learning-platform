from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.user import UserRegister, UserLogin, UserResponse, TokenResponse
from app.services.auth_service import auth_service
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/")
def get_auth_placeholder():
    return {"module": "auth", "description": "Authentication endpoints"}

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    """
    Registers a new user and returns the safe user profile.
    Rejects privileged roles (e.g. super_admin) to prevent privilege escalation.
    """
    return auth_service.register_user(db, user_in)

@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticates a user and issues a JWT access token.
    Returns generic 401 response for any invalid credentials.
    """
    user = auth_service.authenticate_user(db, email=credentials.email, password=credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return auth_service.create_user_token(user)

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Returns the authenticated user's safe profile.
    Requires a valid Bearer JWT access token.
    """
    return current_user
