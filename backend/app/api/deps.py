from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import Callable, List, Optional
from app.database.session import get_db
from app.utils.security import decode_access_token
from app.services.auth_service import auth_service
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/token",  # form-based login used by the /docs "Authorize" button
    auto_error=False
)

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency that extracts, verifies the JWT access token, and returns the current User.
    Raises 401 Unauthorized if missing, expired, invalid, or if user is not found.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id: str = payload.get("sub")
    if not user_id:
        raise credentials_exception

    user = auth_service.get_user_by_id(db, user_id=user_id)
    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This account is {user.status}",
        )

    return user

def require_role(*allowed_roles: str) -> Callable[..., User]:
    """
    Reusable role-based authorization dependency factory.
    Restricts endpoint access to users possessing one of the specified roles.
    Raises 403 Forbidden if current user lacks required role.
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions for this action. Required role: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker


def get_optional_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Like get_current_user, but anonymous visitors get None instead of a 401.

    A token that is present but invalid still returns None (treated as anonymous), so the
    public catalog never breaks because of a stale token in the browser.
    """
    if not token:
        return None
    try:
        return get_current_user(token=token, db=db)
    except HTTPException as exc:
        if exc.status_code == status.HTTP_403_FORBIDDEN:
            raise  # suspended / inactive accounts are told so
        return None
