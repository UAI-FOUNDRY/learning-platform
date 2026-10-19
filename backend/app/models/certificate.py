import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import relationship
from app.database.connection import Base


class Certificate(Base):
    __tablename__ = "certificates"
    __table_args__ = (
        UniqueConstraint("user_id", "course_id", name="uq_certificate_user_course"),
        CheckConstraint("status IN ('issued', 'revoked')", name="ck_certificates_status"),
    )

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    enrollment_id = Column(String(64), ForeignKey("enrollments.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(String(64), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    # Public code printed on the certificate and used by the verification page.
    verification_code = Column(String(128), unique=True, nullable=False, index=True)
    # Snapshots, so the certificate still reads correctly if the name or title changes later.
    learner_name = Column(String(255), nullable=True)
    course_title = Column(String(255), nullable=True)
    status = Column(String(16), nullable=False, default="issued", server_default="issued")
    pdf_url = Column(Text, nullable=True)
    issued_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    revoked_reason = Column(Text, nullable=True)

    # Relationships
    enrollment = relationship("Enrollment", back_populates="certificates")
    user = relationship("User", back_populates="certificates")
    course = relationship("Course", back_populates="certificates")
