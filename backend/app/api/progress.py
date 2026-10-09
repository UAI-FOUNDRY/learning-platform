from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_progress_placeholder():
    return {"module": "progress", "description": "Lecture and course progress tracking endpoints"}
