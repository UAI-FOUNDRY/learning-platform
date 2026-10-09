from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_users_placeholder():
    return {"module": "users", "description": "User profile and settings endpoints"}
