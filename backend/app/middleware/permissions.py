from fastapi import HTTPException, status
from app.api.deps import require_role

def check_role(required_role: str, user_role: str):
    if user_role != required_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions for this action"
        )

__all__ = ["check_role", "require_role"]
