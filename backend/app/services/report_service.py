"""Content reports: anyone can report; Super Admin reviews and can hide/remove/restore the content.

If a question, answer or review collects `content.auto_hide_report_threshold` open reports
from different people, it is hidden automatically until a Super Admin decides.
"""
from datetime import datetime
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import Course, Review, User
from app.models.content_report import ContentReport
from app.models.qa import QAAnswer, QAQuestion
from app.services.audit_service import audit_service
from app.services.platform_settings_service import get_setting

# Content types whose visibility we can change from a report
MODERATABLE = {"review": Review, "qa_question": QAQuestion, "qa_answer": QAAnswer}
ALL_TYPES = {"course": Course, "user": User, **MODERATABLE}
ACTION_TO_STATUS = {"hide": "hidden", "remove": "removed", "restore": "visible"}


class ReportService:
    # ------------------------------------------------------------------ helpers
    def _target(self, db: Session, target_type: str, target_id: str):
        return db.query(ALL_TYPES[target_type]).filter_by(id=target_id).first()

    def _author_id(self, target_type: str, target) -> Optional[str]:
        if target_type == "user":
            return target.id
        if target_type == "course":
            return target.instructor_id
        return target.user_id

    def _preview(self, target_type: str, target) -> Optional[str]:
        if target is None:
            return None
        text = {
            "course": getattr(target, "title", None),
            "user": getattr(target, "full_name", None),
            "review": getattr(target, "review_text", None) or f"{getattr(target, 'rating', '')}-star review",
            "qa_question": getattr(target, "title", None),
            "qa_answer": getattr(target, "body", None),
        }[target_type]
        return (text or "")[:200]

    def _out(self, db: Session, r: ContentReport) -> dict:
        target = self._target(db, r.target_type, r.target_id)
        return {
            "id": r.id, "reporter_id": r.reporter_id,
            "reporter_name": r.reporter.full_name if r.reporter else None,
            "target_type": r.target_type, "target_id": r.target_id,
            "target_preview": self._preview(r.target_type, target) if target else "(deleted)",
            "target_status": getattr(target, "status", None) if target else None,
            "reason": r.reason, "details": r.details, "status": r.status, "resolved_by": r.resolved_by,
            "resolution_note": r.resolution_note, "resolved_at": r.resolved_at, "created_at": r.created_at,
        }

    # ------------------------------------------------------------------ reporting
    def create(self, db: Session, data, user: User) -> dict:
        target = self._target(db, data.target_type, data.target_id)
        if target is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "The content you are reporting was not found")
        if self._author_id(data.target_type, target) == user.id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot report your own content")
        duplicate = db.query(ContentReport.id).filter(
            ContentReport.reporter_id == user.id, ContentReport.target_type == data.target_type,
            ContentReport.target_id == data.target_id, ContentReport.status.in_(["open", "reviewing"])).first()
        if duplicate:
            raise HTTPException(status.HTTP_409_CONFLICT, "You have already reported this and it is still being reviewed")

        report = ContentReport(reporter_id=user.id, target_type=data.target_type, target_id=data.target_id,
                               reason=data.reason, details=data.details)
        db.add(report)
        db.flush()
        self._auto_hide_if_needed(db, data.target_type, target)
        db.commit()
        db.refresh(report)
        return self._out(db, report)

    def _auto_hide_if_needed(self, db: Session, target_type: str, target) -> None:
        if target_type not in MODERATABLE or getattr(target, "status", None) != "visible":
            return
        threshold = int(get_setting(db, "content.auto_hide_report_threshold", 5) or 0)
        if threshold <= 0:
            return
        reporters = db.query(func.count(func.distinct(ContentReport.reporter_id))).filter(
            ContentReport.target_type == target_type, ContentReport.target_id == target.id,
            ContentReport.status.in_(["open", "reviewing"])).scalar() or 0
        if reporters >= threshold:
            audit_service.log(db, None, "content.auto_hidden", target_type, target.id,
                              {"status": ["visible", "hidden"], "open_reports": [None, int(reporters)]})
            target.status = "hidden"

    def my_reports(self, db: Session, user: User, skip: int = 0, limit: int = 50) -> List[dict]:
        rows = db.query(ContentReport).filter(ContentReport.reporter_id == user.id) \
            .order_by(ContentReport.created_at.desc()).offset(skip).limit(limit).all()
        return [self._out(db, r) for r in rows]

    # ------------------------------------------------------------------ admin
    def list(self, db: Session, status_filter=None, target_type=None, reason=None, skip=0, limit=50) -> List[dict]:
        q = db.query(ContentReport)
        if status_filter:
            q = q.filter(ContentReport.status == status_filter)
        if target_type:
            q = q.filter(ContentReport.target_type == target_type)
        if reason:
            q = q.filter(ContentReport.reason == reason)
        rows = q.order_by(ContentReport.created_at.desc()).offset(skip).limit(limit).all()
        return [self._out(db, r) for r in rows]

    def _get(self, db: Session, report_id: str) -> ContentReport:
        r = db.query(ContentReport).filter(ContentReport.id == report_id).first()
        if r is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Report not found")
        return r

    def get(self, db: Session, report_id: str) -> dict:
        return self._out(db, self._get(db, report_id))

    def resolve(self, db: Session, report_id: str, data, admin: User) -> dict:
        r = self._get(db, report_id)
        if r.status in ("resolved", "dismissed") and data.status == "reviewing":
            raise HTTPException(status.HTTP_409_CONFLICT, "This report is already closed")
        changes = {"status": [r.status, data.status]}

        if data.action != "none":
            if r.target_type not in MODERATABLE:
                raise HTTPException(status.HTTP_400_BAD_REQUEST,
                                    "Content actions work for reviews and Q&A. Handle courses and users from their own screens.")
            target = self._target(db, r.target_type, r.target_id)
            if target is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "The reported content no longer exists")
            new_status = ACTION_TO_STATUS[data.action]
            if target.status != new_status:
                audit_service.log(db, admin, f"{r.target_type}.moderated", r.target_type, target.id,
                                  {"status": [target.status, new_status], "report_id": [None, r.id]})
                target.status = new_status
                if r.target_type == "qa_answer":
                    q = db.query(QAQuestion).filter_by(id=target.question_id).first()
                    if q:
                        db.flush()
                        q.answer_count = db.query(func.count(QAAnswer.id)).filter(
                            QAAnswer.question_id == q.id, QAAnswer.status == "visible").scalar() or 0
                if r.target_type == "review":
                    target.moderated_by, target.moderated_at = admin.id, datetime.utcnow()
            changes["action"] = [None, data.action]

        r.status = data.status
        if data.resolution_note is not None:
            r.resolution_note = data.resolution_note
        if data.status in ("resolved", "dismissed"):
            r.resolved_by, r.resolved_at = admin.id, datetime.utcnow()
            # close the other open reports about the same content with the same decision
            for other in db.query(ContentReport).filter(
                    ContentReport.target_type == r.target_type, ContentReport.target_id == r.target_id,
                    ContentReport.id != r.id, ContentReport.status.in_(["open", "reviewing"])).all():
                other.status, other.resolved_by, other.resolved_at = data.status, admin.id, datetime.utcnow()
                other.resolution_note = other.resolution_note or data.resolution_note
        audit_service.log(db, admin, "report.updated", "content_report", r.id, changes)
        db.commit()
        db.refresh(r)
        return self._out(db, r)


report_service = ReportService()
