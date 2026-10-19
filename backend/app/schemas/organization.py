import re
from datetime import datetime
from typing import Dict, Optional

from pydantic import field_validator, model_validator

from app.schemas.common import BaseSchema

ORG_TYPES = ("university", "college", "school", "training_institute", "company", "other")
ORG_STATUSES = ("active", "inactive")
MEMBER_ROLES = ("admin", "instructor", "learner", "member")
_SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
_DOMAIN_RE = re.compile(r"^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$")


def _check_choice(value: Optional[str], allowed, label: str) -> Optional[str]:
    if value is None:
        return None
    cleaned = value.strip().lower()
    if cleaned not in allowed:
        raise ValueError(f"{label} must be one of: {', '.join(allowed)}")
    return cleaned


def _check_domain(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    cleaned = value.strip().lower().removeprefix("@")
    if not cleaned:
        return None
    if not _DOMAIN_RE.match(cleaned):
        raise ValueError("Domain must look like 'uaiu.ac.in' (no http://, no @)")
    return cleaned


def _check_name(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("Name cannot be empty")
    if len(cleaned) > 255:
        raise ValueError("Name must be at most 255 characters")
    return cleaned


class OrganizationCreate(BaseSchema):
    name: str
    slug: Optional[str] = None  # generated from the name when omitted
    org_type: str = "other"
    domain: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None

    check_name = field_validator("name")(lambda v: _check_name(v))
    check_type = field_validator("org_type")(lambda v: _check_choice(v, ORG_TYPES, "org_type"))
    check_domain = field_validator("domain")(lambda v: _check_domain(v))

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip().lower()
        if not _SLUG_RE.match(cleaned):
            raise ValueError("Slug may contain only lowercase letters, numbers and single hyphens")
        return cleaned


class OrganizationUpdate(BaseSchema):
    name: Optional[str] = None
    org_type: Optional[str] = None
    domain: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    status: Optional[str] = None  # Super Admin only

    check_name = field_validator("name")(lambda v: _check_name(v))
    check_type = field_validator("org_type")(lambda v: _check_choice(v, ORG_TYPES, "org_type"))
    check_status = field_validator("status")(lambda v: _check_choice(v, ORG_STATUSES, "status"))
    check_domain = field_validator("domain")(lambda v: _check_domain(v))


class OrganizationResponse(BaseSchema):
    id: str
    name: str
    slug: Optional[str] = None
    org_type: str
    domain: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    status: str
    member_count: int = 0
    course_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class MyOrganizationResponse(OrganizationResponse):
    my_member_role: str
    my_designation: Optional[str] = None


class MemberAdd(BaseSchema):
    """Add a member by user_id or by email (exactly one)."""
    user_id: Optional[str] = None
    email: Optional[str] = None
    member_role: str = "member"
    designation: Optional[str] = None

    check_role = field_validator("member_role")(lambda v: _check_choice(v, MEMBER_ROLES, "member_role"))

    @model_validator(mode="after")
    def one_identifier(self) -> "MemberAdd":
        if bool(self.user_id) == bool(self.email):
            raise ValueError("Provide exactly one of user_id or email")
        if self.email:
            self.email = self.email.strip().lower()
        return self


class MemberUpdate(BaseSchema):
    member_role: Optional[str] = None
    designation: Optional[str] = None

    check_role = field_validator("member_role")(lambda v: _check_choice(v, MEMBER_ROLES, "member_role"))


class MemberResponse(BaseSchema):
    id: str
    organization_id: str
    user_id: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    platform_role: Optional[str] = None
    member_role: str
    designation: Optional[str] = None
    created_at: Optional[datetime] = None


class OrganizationStats(BaseSchema):
    organization_id: str
    members_total: int
    members_by_role: Dict[str, int]
    courses_total: int
    courses_published: int
    enrollments_total: int
    enrollments_completed: int
    certificates_issued: int
