from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_enrollments_placeholder():
    return {"module": "enrollments", "description": "Course enrollment endpoints"}
