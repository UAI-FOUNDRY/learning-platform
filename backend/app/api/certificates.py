from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_role
from app.database.session import get_db
from app.models.user import User
from app.schemas.certificate import CertificateResponse, CertificateRevokeRequest, CertificateVerification
from app.services.certificate_service import certificate_service

router = APIRouter()


@router.get("/my", response_model=List[CertificateResponse])
def list_my_certificates(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """All certificates earned by the logged-in user (issued and revoked)."""
    return certificate_service.list_my_certificates(db, current_user)


@router.get("/verify/{code}", response_model=CertificateVerification)
def verify_certificate(code: str, db: Session = Depends(get_db)):
    """
    **Public** (no login): check a certificate's verification code, e.g. from an employer.
    Shows the learner's name, course and dates; never ids or emails.
    """
    cert = certificate_service.verify(db, code)
    return CertificateVerification(
        valid=cert.status == "issued",
        status=cert.status,
        verification_code=cert.verification_code,
        learner_name=cert.learner_name,
        course_title=cert.course_title,
        issued_at=cert.issued_at,
        revoked_at=cert.revoked_at,
    )


@router.post("/courses/{course_id}/claim", response_model=CertificateResponse)
def claim_certificate(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("learner")),
):
    """
    Issue the logged-in learner's certificate for a completed course.
    Safe to call repeatedly: returns the existing certificate if there is one.
    (Certificates are also issued automatically when the last lecture is completed.)
    """
    return certificate_service.claim_for_course(db, course_id, current_user)


@router.get("", response_model=List[CertificateResponse])
@router.get("/", response_model=List[CertificateResponse], include_in_schema=False)
def list_certificates(
    course_id: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None, description="issued | revoked"),
    page: Optional[int] = Query(None, ge=1),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "instructor")),
):
    """Super Admin: all certificates. Instructors: pass course_id of one of their own courses."""
    offset = (page - 1) * limit if page is not None else skip
    return certificate_service.list_certificates(
        db, current_user, course_id=course_id, user_id=user_id, status_filter=status, skip=offset, limit=limit,
    )


@router.get("/{certificate_id}", response_model=CertificateResponse)
def get_certificate(
    certificate_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    """The certificate's owner, the course instructor, or Super Admin."""
    return certificate_service.get_certificate(db, certificate_id, current_user)


@router.get("/{certificate_id}/pdf", response_class=Response,
            responses={200: {"content": {"application/pdf": {}}}})
def download_certificate_pdf(
    certificate_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    """Download the certificate as a PDF (owner, course instructor or Super Admin)."""
    cert = certificate_service.get_certificate(db, certificate_id, current_user)
    pdf_bytes = certificate_service.render_pdf(db, cert)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="certificate-{cert.verification_code}.pdf"'},
    )


@router.post("/{certificate_id}/revoke", response_model=CertificateResponse)
def revoke_certificate(
    certificate_id: str,
    body: CertificateRevokeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin")),
):
    """Super Admin: revoke a certificate (e.g. academic misconduct). Verification then shows it as revoked."""
    return certificate_service.revoke(db, certificate_id, body.reason, current_user)
