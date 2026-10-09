from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_reviews_placeholder():
    return {"module": "reviews", "description": "Course rating and review endpoints"}
