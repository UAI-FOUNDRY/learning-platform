"""
Certificates: issuing on course completion, public verification, revocation and PDF output.

Rules
- A learner gets a certificate when their enrollment is COMPLETED (all lectures done).
  If the platform setting `certificates.require_all_quizzes_passed` is true, every graded
  quiz in the course must also have a passing attempt.
- One certificate per learner per course (database UNIQUE). Issuing is idempotent.
- The learner's name and course title are snapshotted at issue time.
- A revoked certificate stays revoked: it is never silently re-issued.
"""
import io
import secrets
from datetime import datetime
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.certificate import Certificate
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.quiz import Quiz
from app.models.quiz_attempt import QuizAttempt
from app.models.section import Section
from app.models.user import User
from app.services.platform_settings_service import get_setting

_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O/1/I, easy to read aloud


def _new_verification_code() -> str:
    body = "".join(secrets.choice(_CODE_ALPHABET) for _ in range(12))
    return f"LP-{body[:4]}-{body[4:8]}-{body[8:]}"

from app.services.audit_service import audit_service
from app.services.notification_service import notification_service


class CertificateService:
    # ------------------------------------------------------------------ helpers
    def _get_or_404(self, db: Session, certificate_id: str) -> Certificate:
        cert = db.query(Certificate).filter(Certificate.id == certificate_id).first()
        if cert is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificate not found")
        return cert

    def _can_view(self, cert: Certificate, user: User) -> bool:
        if user.role == "super_admin" or cert.user_id == user.id:
            return True
        return user.role == "instructor" and cert.course is not None and cert.course.instructor_id == user.id

    def _unpassed_quiz_titles(self, db: Session, user_id: str, course_id: str) -> List[str]:
        quizzes = (
            db.query(Quiz)
            .join(Section, Quiz.section_id == Section.id)
            .filter(Section.course_id == course_id, Quiz.quiz_type == "quiz")
            .all()
        )
        missing = []
        for quiz in quizzes:
            passed = (
                db.query(QuizAttempt)
                .filter(QuizAttempt.quiz_id == quiz.id, QuizAttempt.user_id == user_id,
                        QuizAttempt.passed.is_(True))
                .first()
            )
            if passed is None:
                missing.append(quiz.title)
        return missing

    # ------------------------------------------------------------------ issuing
    def issue_for_enrollment(self, db: Session, enrollment: Enrollment) -> Certificate:
        """
        Issues (or returns the existing) certificate for a completed enrollment.
        Raises 400 if the learner is not eligible yet, 409 if it was revoked.
        """
        existing = (
            db.query(Certificate)
            .filter(Certificate.user_id == enrollment.user_id, Certificate.course_id == enrollment.course_id)
            .first()
        )
        if existing is not None:
            if existing.status == "revoked":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="The certificate for this course was revoked. Contact the platform administrator.",
                )
            return existing

        if (enrollment.status or "").upper() != "COMPLETED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Complete every lecture in the course to earn the certificate",
            )
        if get_setting(db, "certificates.require_all_quizzes_passed", False):
            missing = self._unpassed_quiz_titles(db, enrollment.user_id, enrollment.course_id)
            if missing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Pass every quiz to earn the certificate. Not passed yet: {', '.join(missing)}",
                )

        learner = db.query(User).filter(User.id == enrollment.user_id).first()
        course = db.query(Course).filter(Course.id == enrollment.course_id).first()
        for _ in range(5):  # retry on the (astronomically unlikely) code collision
            cert = Certificate(
                enrollment_id=enrollment.id,
                user_id=enrollment.user_id,
                course_id=enrollment.course_id,
                verification_code=_new_verification_code(),
                learner_name=learner.full_name if learner else None,
                course_title=course.title if course else None,
                status="issued",
                issued_at=datetime.utcnow(),
            )
            try:
                db.add(cert)
                db.commit()
                db.refresh(cert)
                notification_service.notify(
                    db, cert.user_id, "certificate_issued", "Your certificate is ready",
                    f"You earned a certificate for {cert.course_title or 'your course'}.",
                    "/certificates", {"certificate_id": cert.id, "course_id": cert.course_id},
                )
                from app.services.gamification_service import gamification_service
                gamification_service.record(db, cert.user_id, "certificate_issued", cert.id, "certificate")
                return cert
            except IntegrityError:
                db.rollback()
                # Either a code collision or a concurrent request already issued it.
                concurrent = (
                    db.query(Certificate)
                    .filter(Certificate.user_id == enrollment.user_id,
                            Certificate.course_id == enrollment.course_id)
                    .first()
                )
                if concurrent is not None:
                    return concurrent
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Could not generate a unique certificate code")

    def claim_for_course(self, db: Session, course_id: str, current_user: User) -> Certificate:
        enrollment = (
            db.query(Enrollment)
            .filter(Enrollment.user_id == current_user.id, Enrollment.course_id == course_id)
            .first()
        )
        if enrollment is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="You are not enrolled in this course")
        return self.issue_for_enrollment(db, enrollment)

    def auto_issue_if_enabled(self, db: Session, enrollment: Enrollment) -> Optional[Certificate]:
        """
        Called when an enrollment becomes COMPLETED. Never raises: a certificate problem
        must not break marking a lecture complete. The learner can still claim manually.
        """
        try:
            if not get_setting(db, "certificates.auto_issue_on_completion", True):
                return None
            return self.issue_for_enrollment(db, enrollment)
        except HTTPException:
            return None
        except Exception:
            db.rollback()
            return None

    # ------------------------------------------------------------------ reading
    def list_my_certificates(self, db: Session, current_user: User) -> List[Certificate]:
        return (
            db.query(Certificate)
            .filter(Certificate.user_id == current_user.id)
            .order_by(Certificate.issued_at.desc())
            .all()
        )

    def list_certificates(
        self, db: Session, current_user: User, course_id: Optional[str] = None,
        user_id: Optional[str] = None, status_filter: Optional[str] = None,
        skip: int = 0, limit: int = 50,
    ) -> List[Certificate]:
        query = db.query(Certificate)
        if current_user.role == "instructor":
            if not course_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                    detail="course_id is required for instructors")
            course = db.query(Course).filter(Course.id == course_id).first()
            if course is None or course.instructor_id != current_user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                    detail="You can only view certificates for your own courses")
        if course_id:
            query = query.filter(Certificate.course_id == course_id)
        if user_id:
            query = query.filter(Certificate.user_id == user_id)
        if status_filter:
            query = query.filter(Certificate.status == status_filter.strip().lower())
        return query.order_by(Certificate.issued_at.desc()).offset(skip).limit(limit).all()

    def get_certificate(self, db: Session, certificate_id: str, current_user: User) -> Certificate:
        cert = self._get_or_404(db, certificate_id)
        if not self._can_view(cert, current_user):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificate not found")
        return cert

    def verify(self, db: Session, code: str) -> Certificate:
        cert = (
            db.query(Certificate)
            .filter(Certificate.verification_code == code.strip().upper())
            .first()
        )
        if cert is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="No certificate matches this verification code")
        return cert

    # ------------------------------------------------------------------ admin
    def revoke(self, db: Session, certificate_id: str, reason: str, actor=None) -> Certificate:
        cert = self._get_or_404(db, certificate_id)
        if cert.status == "revoked":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Certificate is already revoked")
        audit_service.log(db, actor, "certificate.revoked", "certificate", cert.id, {"reason": [None, reason]})
        cert.status = "revoked"
        cert.revoked_at = datetime.utcnow()
        cert.revoked_reason = reason
        db.commit()
        db.refresh(cert)
        return cert

    # ------------------------------------------------------------------ PDF
    def render_pdf(self, db: Session, cert: Certificate) -> bytes:
        if cert.status != "issued":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail="A revoked certificate cannot be downloaded")
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.pdfgen import canvas

        platform_name = get_setting(db, "general.platform_name", "Learning Platform")
        buf = io.BytesIO()
        width, height = landscape(A4)
        pdf = canvas.Canvas(buf, pagesize=(width, height))
        pdf.setTitle(f"Certificate {cert.verification_code}")

        pdf.setStrokeColor(colors.HexColor("#1f3a5f"))
        pdf.setLineWidth(4)
        pdf.rect(30, 30, width - 60, height - 60)
        pdf.setLineWidth(1)
        pdf.rect(40, 40, width - 80, height - 80)

        pdf.setFillColor(colors.HexColor("#1f3a5f"))
        pdf.setFont("Helvetica-Bold", 16)
        pdf.drawCentredString(width / 2, height - 100, str(platform_name).upper())
        pdf.setFont("Helvetica-Bold", 36)
        pdf.drawCentredString(width / 2, height - 165, "Certificate of Completion")

        pdf.setFillColor(colors.black)
        pdf.setFont("Helvetica", 14)
        pdf.drawCentredString(width / 2, height - 220, "This certifies that")
        pdf.setFont("Helvetica-Bold", 28)
        pdf.drawCentredString(width / 2, height - 262, cert.learner_name or "Learner")
        pdf.setFont("Helvetica", 14)
        pdf.drawCentredString(width / 2, height - 300, "has successfully completed the course")
        pdf.setFont("Helvetica-Bold", 20)
        pdf.drawCentredString(width / 2, height - 335, cert.course_title or "Course")

        issued = cert.issued_at.strftime("%d %B %Y") if cert.issued_at else ""
        pdf.setFont("Helvetica", 11)
        pdf.drawString(80, 90, f"Issued on {issued}")
        pdf.drawRightString(width - 80, 90, f"Verification code: {cert.verification_code}")
        pdf.setFont("Helvetica-Oblique", 9)
        pdf.drawCentredString(width / 2, 65, "Verify this certificate with its code on the platform's verification page.")

        pdf.showPage()
        pdf.save()
        return buf.getvalue()


certificate_service = CertificateService()
