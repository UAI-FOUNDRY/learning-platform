import uuid
from datetime import datetime
from sqlalchemy import text, Column, String, Integer, BigInteger, Boolean, Text, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.database.connection import Base

LECTURE_TYPES = ("video", "article", "pdf", "document", "link")


class Lecture(Base):
    __tablename__ = "lectures"
    __table_args__ = (
        CheckConstraint(
            "lecture_type IN ('video', 'article', 'pdf', 'document', 'link')",
            name="ck_lectures_lecture_type",
        ),
    )

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    section_id = Column(String(64), ForeignKey("sections.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    lecture_type = Column(String(16), nullable=False, default="video", server_default="video")
    content_url = Column(Text, nullable=True)       # video / pdf / document / external link
    article_content = Column(Text, nullable=True)   # body for 'article' lectures
    duration = Column(Integer, nullable=False, default=0)  # seconds
    is_preview = Column(Boolean, nullable=False, default=False, server_default=text("false"))  # free preview before enrolling
    order_index = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    section = relationship("Section", back_populates="lectures")
    progress = relationship("Progress", back_populates="lecture", cascade="all, delete-orphan")
    resources = relationship("LectureResource", back_populates="lecture", cascade="all, delete-orphan")


class LectureResource(Base):
    """Downloadable files and external links attached to a lecture."""
    __tablename__ = "lecture_resources"
    __table_args__ = (
        CheckConstraint("resource_type IN ('file', 'link')", name="ck_lecture_resources_resource_type"),
    )

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    lecture_id = Column(String(64), ForeignKey("lectures.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    resource_type = Column(String(16), nullable=False, default="file", server_default="file")
    url = Column(Text, nullable=False)
    file_size_bytes = Column(BigInteger, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    lecture = relationship("Lecture", back_populates="resources")
