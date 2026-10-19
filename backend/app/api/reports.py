from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_role
from app.database.session import get_db
from app.models.user import User
from app.schemas.qa import ReportCreate, ReportResolve, ReportResponse
from app.services.report_service import report_service

router = APIRouter()


@router.post("", response_model=ReportResponse, status_code=201)
@router.post("/", response_model=ReportResponse, status_code=201, include_in_schema=False)
def report_content(body: ReportCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Report a course, review, Q&A question/answer or user. `reason`: spam, abuse, inappropriate, copyright, other.
    You can't report your own content, or the same thing twice while it is still open.
    """
    return report_service.create(db, body, current_user)


@router.get("/my", response_model=List[ReportResponse])
def my_reports(limit: int = Query(50, ge=1, le=100), skip: int = Query(0, ge=0),
               db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return report_service.my_reports(db, current_user, skip, limit)


@router.get("", response_model=List[ReportResponse])
@router.get("/", response_model=List[ReportResponse], include_in_schema=False)
def list_reports(
    status: Optional[str] = Query(None, pattern="^(open|reviewing|resolved|dismissed)$"),
    target_type: Optional[str] = Query(None, pattern="^(course|review|qa_question|qa_answer|user)$"),
    reason: Optional[str] = Query(None, pattern="^(spam|abuse|inappropriate|copyright|other)$"),
    page: Optional[int] = Query(None, ge=1),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin")),
):
    """Super Admin moderation queue (newest first) with a preview of the reported content."""
    offset = (page - 1) * limit if page is not None else skip
    return report_service.list(db, status, target_type, reason, offset, limit)


@router.get("/{report_id}", response_model=ReportResponse)
def get_report(report_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_role("super_admin"))):
    return report_service.get(db, report_id)


@router.patch("/{report_id}", response_model=ReportResponse)
def update_report(report_id: str, body: ReportResolve, db: Session = Depends(get_db),
                  current_user: User = Depends(require_role("super_admin"))):
    """
    Move a report to `reviewing`, `resolved` or `dismissed`. `action` applies to the reported
    review / Q&A content: `hide`, `remove` or `restore`. Other open reports about the same
    content are closed with it.
    """
    return report_service.resolve(db, report_id, body, current_user)
