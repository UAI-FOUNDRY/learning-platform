import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import relationship
from app.database.connection import Base


class OrganizationMember(Base):
    __tablename__ = "organization_members"
    __table_args__ = (
        UniqueConstraint("organization_id", "user_id", name="uq_organization_member"),
        CheckConstraint(
            "member_role IN ('admin', 'instructor', 'learner', 'member')",
            name="ck_organization_members_member_role",
        ),
    )

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    organization_id = Column(String(64), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    # Role inside the organization (separate from the platform-wide users.role).
    member_role = Column(String(32), nullable=False, default="member", server_default="member")
    designation = Column(String(128), nullable=True)  # free text, e.g. "Professor, CSE"
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    organization = relationship("Organization", back_populates="members")
    user = relationship("User", back_populates="organization_memberships")
