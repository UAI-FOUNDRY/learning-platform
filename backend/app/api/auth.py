from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_auth_placeholder():
    return {"module": "auth", "description": "Authentication endpoints"}
