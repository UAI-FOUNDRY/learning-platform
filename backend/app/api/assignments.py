from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_assignments_placeholder():
    return {"module": "assignments", "description": "Assignment and submission endpoints"}
