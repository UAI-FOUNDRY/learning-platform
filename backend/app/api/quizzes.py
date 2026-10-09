from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_quizzes_placeholder():
    return {"module": "quizzes", "description": "Quiz assessment endpoints"}
