"""Platform-wide numbers for the Super Admin dashboard."""
from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import Certificate, ContentReport, Course, Enrollment, Organization, Review, User


def _counts(db: Session, column) -> dict:
    return {str(key): count for key, count in db.query(column, func.count()).group_by(column).all() if key is not None}


class AdminService:
    def overview(self, db: Session) -> dict:
        week_ago = datetime.utcnow() - timedelta(days=7)
        courses = {k.lower(): v for k, v in _counts(db, Course.status).items()}
        enrollments = {k.upper(): v for k, v in _counts(db, Enrollment.status).items()}
        return {
            "users": {
                "total": db.query(func.count(User.id)).scalar() or 0,
                "by_role": _counts(db, User.role),
                "by_status": _counts(db, User.status),
                "new_last_7_days": db.query(func.count(User.id)).filter(User.created_at >= week_ago).scalar() or 0,
            },
            "courses": {
                "total": sum(courses.values()),
                "by_status": courses,
                "pending_review": courses.get("pending_review", 0),
            },
            "enrollments": {
                "total": sum(enrollments.values()),
                "active": enrollments.get("ACTIVE", 0),
                "completed": enrollments.get("COMPLETED", 0),
                "new_last_7_days": db.query(func.count(Enrollment.id)).filter(Enrollment.enrolled_at >= week_ago).scalar() or 0,
            },
            "certificates_issued": db.query(func.count(Certificate.id)).filter(Certificate.status == "issued").scalar() or 0,
            "reviews": {
                "total": db.query(func.count(Review.id)).scalar() or 0,
                "visible": db.query(func.count(Review.id)).filter(Review.status == "visible").scalar() or 0,
            },
            "organizations": db.query(func.count(Organization.id)).scalar() or 0,
            "open_reports": db.query(func.count(ContentReport.id)).filter(ContentReport.status.in_(["open", "reviewing"])).scalar() or 0,
        }


admin_service = AdminService()
