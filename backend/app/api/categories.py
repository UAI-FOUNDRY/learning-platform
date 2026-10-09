from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_categories_placeholder():
    return {"module": "categories", "description": "Category taxonomy endpoints"}
