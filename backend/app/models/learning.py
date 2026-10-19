"""
Learner-side extras around the course player: notes, bookmarks, subtitles and the wishlist.
(PROJECT.md sections 9 and 10.)
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from app.database.connection import Base


class LectureNote(Base):
    """A learner's private note on a lecture, optionally pinned to a video timestamp."""
    __tablename__ = "lecture_notes"
    __table_args__ = (Index("ix_lecture_notes_user_lecture", "user_id", "lecture_id"),)

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    lecture_id = Column(String(64), ForeignKey("lectures.id", ondelete="CASCADE"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    timestamp_seconds = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")
    lecture = relationship("Lecture")


class LectureBookmark(Base):
    """A saved position in a lecture. A learner may bookmark several moments of one lecture."""
    __tablename__ = "lecture_bookmarks"
    __table_args__ = (Index("ix_lecture_bookmarks_user_lecture", "user_id", "lecture_id"),)

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    lecture_id = Column(String(64), ForeignKey("lectures.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp_seconds = Column(Integer, nullable=False, default=0, server_default="0")
    label = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    user = relationship("User")
    lecture = relationship("Lecture")


class LectureSubtitle(Base):
    """Subtitle / caption track (e.g. a .vtt file) for a video lecture, one per language."""
    __tablename__ = "lecture_subtitles"
    __table_args__ = (UniqueConstraint("lecture_id", "language_code", name="uq_lecture_subtitle_language"),)

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    lecture_id = Column(String(64), ForeignKey("lectures.id", ondelete="CASCADE"), nullable=False, index=True)
    language_code = Column(String(16), nullable=False)  # BCP-47, e.g. "en", "hi"
    label = Column(String(64), nullable=True)  # e.g. "English (auto)"
    url = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    lecture = relationship("Lecture")


class WishlistItem(Base):
    """A course a learner saved for later."""
    __tablename__ = "wishlist_items"
    __table_args__ = (UniqueConstraint("user_id", "course_id", name="uq_wishlist_user_course"),)

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(String(64), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    user = relationship("User")
    course = relationship("Course")
