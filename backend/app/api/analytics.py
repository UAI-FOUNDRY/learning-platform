from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.database.session import get_db
from app.models.user import User
from app.services.analytics_service import analytics_service

router = APIRouter()

DAYS = Query(30, ge=7, le=365, description="How many days back (including today) the time series covers")


@router.get("/platform")
def platform_analytics(
    days: int = DAYS,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin")),
):
    """Super Admin: daily sign-ups / enrollments / completions / certificates, top courses, categories, top instructors."""
    return analytics_service.platform(db, days)


@router.get("/instructor")
def instructor_analytics(
    days: int = DAYS,
    instructor_id: Optional[str] = Query(None, description="Super Admin only: look at one instructor"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "instructor")),
):
    """Instructor: totals and per-course numbers for my courses, plus a daily enrollments/completions series."""
    if current_user.role == "instructor":
        target = current_user.id
    elif instructor_id:
        target = instructor_id
    else:
        raise HTTPException(400, "Super Admins must pass instructor_id (or use /analytics/platform)")
    return analytics_service.instructor(db, target, days)


@router.get("/courses/{course_id}")
def course_analytics(
    course_id: str,
    days: int = DAYS,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "instructor")),
):
    """One course: lecture drop-off, quiz and per-question results, assignment grading status, ratings."""
    return analytics_service.course(db, course_id, days, current_user)
