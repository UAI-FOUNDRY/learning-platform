import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.connection import Base

class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    enrollment_id = Column(String(64), ForeignKey("enrollments.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(String(64), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    verification_code = Column(String(128), unique=True, nullable=False, index=True)
    issued_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    enrollment = relationship("Enrollment", back_populates="certificates")
    user = relationship("User", back_populates="certificates")
    course = relationship("Course", back_populates="certificates")
