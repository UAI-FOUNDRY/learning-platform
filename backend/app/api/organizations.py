from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_organizations_placeholder():
    return {"module": "organizations", "description": "Organization association endpoints"}
