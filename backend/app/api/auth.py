from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.config.settings import settings
from app.schemas.common import MessageResponse
from app.schemas.user import (
    UserRegister, UserLogin, UserResponse, TokenResponse, RefreshRequest, LogoutRequest,
    ForgotPasswordRequest, ResetPasswordRequest, ChangePasswordRequest, VerifyEmailRequest,
)
from app.services.email_service import email_service
from app.services.notification_service import notification_service
from app.services.platform_settings_service import get_setting
from app.services.session_service import (
    session_service, REFRESH, PASSWORD_RESET, EMAIL_VERIFICATION,
)
from app.utils.security import get_password_hash, verify_password
from app.services.auth_service import auth_service
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/", include_in_schema=False)
def get_auth_placeholder():
    return {"module": "auth", "description": "Authentication endpoints"}

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, request: Request, db: Session = Depends(get_db)):
    """
    Registers a new user and returns the safe user profile, then emails a verification link.
    Rejects privileged roles (e.g. super_admin) to prevent privilege escalation.
    """
    user = auth_service.register_user(db, user_in)
    _send_verification(db, user, _client_ip(request))
    notification_service.notify(
        db, user.id, "welcome", "Welcome to the platform",
        "Your account is ready. Browse the catalog and start learning." if user.role == "learner"
        else "Your account is ready. Create your first course from the instructor area.",
        "/", None,
    )
    return user


def _send_verification(db: Session, user: User, ip: Optional[str]) -> None:
    try:
        session_service.revoke_all(db, user.id, EMAIL_VERIFICATION)
        token = session_service.issue_token(
            db, user, EMAIL_VERIFICATION, timedelta(hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS), ip
        )
        email_service.send_verification(user.email, user.full_name, token)
    except Exception:  # never fail registration because of email
        db.rollback()

def _client_ip(request: Request) -> Optional[str]:
    return request.client.host if request.client else None


def _login(db: Session, request: Request, email: str, password: str) -> TokenResponse:
    ip, ua = _client_ip(request), request.headers.get("user-agent")
    session_service.assert_not_locked(db, email)
    user = auth_service.authenticate_user(db, email=email, password=password)
    if not user:
        existing = auth_service.get_user_by_email(db, email)
        session_service.record_attempt(
            db, email, existing, False, "bad_password" if existing else "unknown_email", ip, ua
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        session_service.record_attempt(db, email, user, False, user.status, ip, ua)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This account is {user.status}. Please contact the platform administrator.",
        )
    if (
        user.role != "super_admin"
        and not user.is_email_verified
        and get_setting(db, "users.require_email_verification", False)
    ):
        session_service.record_attempt(db, email, user, False, "email_not_verified", ip, ua)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address first. Check your inbox or request a new link.",
        )
    session_service.record_attempt(db, email, user, True, None, ip, ua)
    auth_service.record_login(db, user)
    return session_service.start_session(db, user, ip)


@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, request: Request, db: Session = Depends(get_db)):
    """
    Authenticates a user (JSON body: email + password). Returns a short-lived `access_token`
    and a `refresh_token` to get new access tokens via `/auth/refresh`.
    Returns a generic 401 for any invalid credentials and 429 after too many failures.
    """
    return _login(db, request, credentials.email, credentials.password)


@router.post("/token", response_model=TokenResponse)
def login_for_docs(request: Request, form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Same login, but as an OAuth2 form (username + password) so the **Authorize** button in
    /docs works. Type your **email in the username field**; leave client_id/secret empty.
    """
    return _login(db, request, form.username, form.password)


@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest, request: Request, db: Session = Depends(get_db)):
    """Swap a refresh token for a new access + refresh token (each refresh token works once)."""
    return session_service.refresh_session(db, body.refresh_token, _client_ip(request))


@router.post("/logout", response_model=MessageResponse)
def logout(body: LogoutRequest, db: Session = Depends(get_db)):
    """Ends this session by revoking its refresh token. The frontend then forgets both tokens."""
    session_service.end_session(db, body.refresh_token)
    return MessageResponse(message="Logged out")


@router.post("/logout-all", response_model=MessageResponse)
def logout_all(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Revokes every refresh token of the current user (all devices)."""
    session_service.revoke_all(db, current_user.id, REFRESH)
    return MessageResponse(message="Logged out of all devices")


GENERIC_RESET_MESSAGE = "If an account exists for that email, we have sent instructions to it."


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(body: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    """Emails a password-reset link. Always answers the same way so emails cannot be probed."""
    user = auth_service.get_user_by_email(db, body.email)
    if user is not None and user.is_active:
        session_service.revoke_all(db, user.id, PASSWORD_RESET)
        token = session_service.issue_token(
            db, user, PASSWORD_RESET, timedelta(minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES), _client_ip(request)
        )
        email_service.send_password_reset(user.email, user.full_name, token)
    return MessageResponse(message=GENERIC_RESET_MESSAGE)


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Sets a new password using the emailed token, and signs the user out everywhere."""
    auth_service.check_new_password(db, body.new_password)
    user = session_service.consume_token(db, body.token, PASSWORD_RESET)
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, f"This account is {user.status}")
    user.hashed_password = get_password_hash(body.new_password)
    db.commit()
    session_service.revoke_all(db, user.id, REFRESH)
    return MessageResponse(message="Password updated. You can log in now.")


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    body: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Change your own password (needs the current one). Other devices are signed out."""
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Current password is incorrect")
    auth_service.check_new_password(db, body.new_password)
    if verify_password(body.new_password, current_user.hashed_password):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "New password must be different from the current one")
    current_user.hashed_password = get_password_hash(body.new_password)
    db.commit()
    session_service.revoke_all(db, current_user.id, REFRESH)
    return MessageResponse(message="Password changed")


@router.post("/resend-verification", response_model=MessageResponse)
def resend_verification(body: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    """Sends a new verification link (same generic answer whether or not the account exists)."""
    user = auth_service.get_user_by_email(db, body.email)
    if user is not None and user.is_active and not user.is_email_verified:
        _send_verification(db, user, _client_ip(request))
    return MessageResponse(message="If that account needs verification, we have sent a new link.")


@router.post("/verify-email", response_model=MessageResponse)
def verify_email(body: VerifyEmailRequest, db: Session = Depends(get_db)):
    """Confirms an email address using the emailed token."""
    user = session_service.consume_token(db, body.token, EMAIL_VERIFICATION)
    user.is_email_verified = True
    db.commit()
    return MessageResponse(message="Email verified")


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Returns the authenticated user's safe profile.
    Requires a valid Bearer JWT access token.
    """
    return current_user
