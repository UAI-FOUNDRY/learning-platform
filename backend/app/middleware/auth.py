from fastapi import Request
from app.api.deps import get_current_user

async def auth_middleware(request: Request, call_next):
    # Pass-through middleware for request interception
    response = await call_next(request)
    return response

__all__ = ["auth_middleware", "get_current_user"]
