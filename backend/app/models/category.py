import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.connection import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    name = Column(String(128), nullable=False)
    slug = Column(String(128), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    # Subcategories: NULL = top-level category. Deleting a parent promotes its children.
    parent_id = Column(String(64), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    courses = relationship("Course", back_populates="category")
    parent = relationship("Category", remote_side=[id], back_populates="children")
    children = relationship("Category", back_populates="parent")
