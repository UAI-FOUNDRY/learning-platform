from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_courses_placeholder():
    return {"module": "courses", "description": "Course catalog and management endpoints"}
