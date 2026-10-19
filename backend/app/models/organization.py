import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, CheckConstraint
from sqlalchemy.orm import relationship
from app.database.connection import Base

ORGANIZATION_TYPES = ("university", "college", "school", "training_institute", "company", "other")


class Organization(Base):
    __tablename__ = "organizations"
    __table_args__ = (
        CheckConstraint(
            "org_type IN ('university', 'college', 'school', 'training_institute', 'company', 'other')",
            name="ck_organizations_org_type",
        ),
        CheckConstraint("status IN ('active', 'inactive')", name="ck_organizations_status"),
    )

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(128), unique=True, nullable=True, index=True)
    org_type = Column(String(32), nullable=False, default="other", server_default="other")
    domain = Column(String(255), nullable=True)  # e.g. uaiu.ac.in, used to match members by email
    description = Column(Text, nullable=True)
    logo_url = Column(Text, nullable=True)
    status = Column(String(16), nullable=False, default="active", server_default="active")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    members = relationship("OrganizationMember", back_populates="organization", cascade="all, delete-orphan")
    courses = relationship("Course", back_populates="organization")
