from fastapi import HTTPException, status

def check_role(required_role: str, user_role: str):
    if user_role != required_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions for this action"
        )
