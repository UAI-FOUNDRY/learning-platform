from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_admin_placeholder():
    return {"module": "admin", "description": "Platform administration and approval endpoints"}
