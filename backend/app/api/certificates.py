from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_certificates_placeholder():
    return {"module": "certificates", "description": "Certificate generation and verification endpoints"}
