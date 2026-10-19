"""
Organizations: universities, colleges, schools, training institutes and companies.

Who can do what
- Super Admin: everything (create / delete organizations, change status, manage anyone).
- Organization admin (organization_members.member_role = 'admin'): edit their organization's
  profile, manage its members, link / unlink courses, see its stats.
- Any member: see their organization and its course list.
"""
import re
from typing import Dict, List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.certificate import Certificate
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.organization import Organization
from app.models.organization_member import OrganizationMember
from app.models.user import User
from app.schemas.organization import (
    MEMBER_ROLES, MemberAdd, MemberResponse, MemberUpdate, MyOrganizationResponse,
    OrganizationCreate, OrganizationResponse, OrganizationStats, OrganizationUpdate,
)


def _slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug[:100] or "organization"


class OrganizationService:
    # ------------------------------------------------------------ helpers
    def _get_or_404(self, db: Session, org_id: str) -> Organization:
        org = db.query(Organization).filter(Organization.id == org_id).first()
        if org is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
        return org

    def _membership(self, db: Session, org_id: str, user_id: str) -> Optional[OrganizationMember]:
        return (
            db.query(OrganizationMember)
            .filter(OrganizationMember.organization_id == org_id, OrganizationMember.user_id == user_id)
            .first()
        )

    def _require_member(self, db: Session, org: Organization, user: User) -> None:
        if user.role == "super_admin":
            return
        if self._membership(db, org.id, user.id) is None:
            # 404, not 403: don't reveal which organizations exist
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    def _require_manager(self, db: Session, org: Organization, user: User) -> None:
        if user.role == "super_admin":
            return
        membership = self._membership(db, org.id, user.id)
        if membership is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
        if membership.member_role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="Only organization admins can do this")

    def _unique_slug(self, db: Session, base: str, exclude_id: Optional[str] = None) -> str:
        slug, n = base, 2
        while True:
            q = db.query(Organization).filter(Organization.slug == slug)
            if exclude_id:
                q = q.filter(Organization.id != exclude_id)
            if q.first() is None:
                return slug
            slug, n = f"{base}-{n}", n + 1

    def _counts(self, db: Session, org_ids: List[str]) -> Tuple[Dict[str, int], Dict[str, int]]:
        if not org_ids:
            return {}, {}
        members = dict(
            db.query(OrganizationMember.organization_id, func.count(OrganizationMember.id))
            .filter(OrganizationMember.organization_id.in_(org_ids))
            .group_by(OrganizationMember.organization_id).all()
        )
        courses = dict(
            db.query(Course.organization_id, func.count(Course.id))
            .filter(Course.organization_id.in_(org_ids))
            .group_by(Course.organization_id).all()
        )
        return members, courses

    def to_response(self, db: Session, org: Organization) -> OrganizationResponse:
        members, courses = self._counts(db, [org.id])
        data = OrganizationResponse.model_validate(org).model_dump()
        data.update(member_count=members.get(org.id, 0), course_count=courses.get(org.id, 0))
        return OrganizationResponse(**data)

    def _member_response(self, m: OrganizationMember) -> MemberResponse:
        return MemberResponse(
            id=m.id, organization_id=m.organization_id, user_id=m.user_id,
            full_name=m.user.full_name if m.user else None, email=m.user.email if m.user else None,
            platform_role=m.user.role if m.user else None, member_role=m.member_role,
            designation=m.designation, created_at=m.created_at,
        )

    # ------------------------------------------------------------ organizations
    def create(self, db: Session, org_in: OrganizationCreate) -> OrganizationResponse:
        if org_in.slug:
            if db.query(Organization).filter(Organization.slug == org_in.slug).first():
                raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                    detail=f"An organization with slug '{org_in.slug}' already exists")
            slug = org_in.slug
        else:
            slug = self._unique_slug(db, _slugify(org_in.name))
        org = Organization(
            name=org_in.name, slug=slug, org_type=org_in.org_type, domain=org_in.domain,
            description=org_in.description, logo_url=org_in.logo_url, status="active",
        )
        try:
            db.add(org)
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Organization slug already exists")
        db.refresh(org)
        return self.to_response(db, org)

    def list(self, db: Session, search: Optional[str] = None, org_type: Optional[str] = None,
             status_filter: Optional[str] = None, skip: int = 0, limit: int = 50) -> List[OrganizationResponse]:
        query = db.query(Organization)
        if search:
            term = f"%{search.strip().lower()}%"
            query = query.filter(
                func.lower(Organization.name).like(term) | func.lower(func.coalesce(Organization.domain, "")).like(term)
            )
        if org_type:
            query = query.filter(Organization.org_type == org_type.strip().lower())
        if status_filter:
            query = query.filter(Organization.status == status_filter.strip().lower())
        orgs = query.order_by(Organization.name.asc()).offset(skip).limit(limit).all()
        members, courses = self._counts(db, [o.id for o in orgs])
        out = []
        for org in orgs:
            data = OrganizationResponse.model_validate(org).model_dump()
            data.update(member_count=members.get(org.id, 0), course_count=courses.get(org.id, 0))
            out.append(OrganizationResponse(**data))
        return out

    def list_mine(self, db: Session, user: User) -> List[MyOrganizationResponse]:
        memberships = (
            db.query(OrganizationMember).filter(OrganizationMember.user_id == user.id).all()
        )
        out = []
        for m in memberships:
            base = self.to_response(db, m.organization).model_dump()
            out.append(MyOrganizationResponse(**base, my_member_role=m.member_role, my_designation=m.designation))
        return sorted(out, key=lambda o: o.name.lower())

    def get(self, db: Session, org_id: str, user: User) -> OrganizationResponse:
        org = self._get_or_404(db, org_id)
        self._require_member(db, org, user)
        return self.to_response(db, org)

    def update(self, db: Session, org_id: str, update_in: OrganizationUpdate, user: User) -> OrganizationResponse:
        org = self._get_or_404(db, org_id)
        self._require_manager(db, org, user)
        fields = update_in.model_dump(exclude_unset=True)
        if "status" in fields and user.role != "super_admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="Only Super Admin can activate or deactivate an organization")
        if "name" in fields and fields["name"] is None:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Name cannot be empty")
        for key, value in fields.items():
            if key in ("org_type", "status") and value is None:
                continue
            setattr(org, key, value)
        db.commit()
        db.refresh(org)
        return self.to_response(db, org)

    def delete(self, db: Session, org_id: str) -> None:
        org = self._get_or_404(db, org_id)
        # Courses stay on the platform; they just stop belonging to this organization.
        db.query(Course).filter(Course.organization_id == org.id).update(
            {Course.organization_id: None}, synchronize_session=False
        )
        db.delete(org)
        db.commit()

    # ------------------------------------------------------------ members
    def list_members(self, db: Session, org_id: str, user: User,
                     member_role: Optional[str] = None) -> List[MemberResponse]:
        org = self._get_or_404(db, org_id)
        self._require_manager(db, org, user)
        query = db.query(OrganizationMember).filter(OrganizationMember.organization_id == org.id)
        if member_role:
            query = query.filter(OrganizationMember.member_role == member_role.strip().lower())
        return [self._member_response(m) for m in query.order_by(OrganizationMember.created_at.asc()).all()]

    def add_member(self, db: Session, org_id: str, member_in: MemberAdd, user: User) -> MemberResponse:
        org = self._get_or_404(db, org_id)
        self._require_manager(db, org, user)
        if member_in.user_id:
            target = db.query(User).filter(User.id == member_in.user_id).first()
        else:
            target = db.query(User).filter(User.email == member_in.email).first()
        if target is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="No user found. They must register on the platform first.")
        if self._membership(db, org.id, target.id) is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail="This user is already a member of the organization")
        member = OrganizationMember(
            organization_id=org.id, user_id=target.id,
            member_role=member_in.member_role, designation=member_in.designation,
        )
        try:
            db.add(member)
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail="This user is already a member of the organization")
        db.refresh(member)
        return self._member_response(member)

    def _get_member_or_404(self, db: Session, org_id: str, member_id: str) -> OrganizationMember:
        member = (
            db.query(OrganizationMember)
            .filter(OrganizationMember.id == member_id, OrganizationMember.organization_id == org_id)
            .first()
        )
        if member is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
        return member

    def _ensure_not_last_admin(self, db: Session, member: OrganizationMember) -> None:
        if member.member_role != "admin":
            return
        admins = (
            db.query(OrganizationMember)
            .filter(OrganizationMember.organization_id == member.organization_id,
                    OrganizationMember.member_role == "admin")
            .count()
        )
        if admins <= 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="An organization must keep at least one admin. Add another admin first.")

    def update_member(self, db: Session, org_id: str, member_id: str, update_in: MemberUpdate,
                      user: User) -> MemberResponse:
        org = self._get_or_404(db, org_id)
        self._require_manager(db, org, user)
        member = self._get_member_or_404(db, org.id, member_id)
        fields = update_in.model_dump(exclude_unset=True)
        new_role = fields.get("member_role")
        if new_role and new_role != member.member_role:
            if user.role != "super_admin":
                self._ensure_not_last_admin(db, member)
            member.member_role = new_role
        if "designation" in fields:
            member.designation = fields["designation"]
        db.commit()
        db.refresh(member)
        return self._member_response(member)

    def remove_member(self, db: Session, org_id: str, member_id: str, user: User) -> None:
        org = self._get_or_404(db, org_id)
        self._require_manager(db, org, user)
        member = self._get_member_or_404(db, org.id, member_id)
        if user.role != "super_admin":
            self._ensure_not_last_admin(db, member)
        db.delete(member)
        db.commit()

    # ------------------------------------------------------------ courses
    def list_courses(self, db: Session, org_id: str, user: User) -> List[Course]:
        org = self._get_or_404(db, org_id)
        self._require_member(db, org, user)
        query = db.query(Course).filter(Course.organization_id == org.id)
        membership = self._membership(db, org.id, user.id)
        is_manager = user.role == "super_admin" or (membership is not None and membership.member_role == "admin")
        if not is_manager:
            query = query.filter(func.lower(Course.status) == "published")
        return query.order_by(Course.title.asc()).all()

    def link_course(self, db: Session, org_id: str, course_id: str, user: User) -> Course:
        org = self._get_or_404(db, org_id)
        self._require_manager(db, org, user)
        course = db.query(Course).filter(Course.id == course_id).first()
        if course is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
        if course.organization_id and course.organization_id != org.id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail="This course already belongs to another organization. Unlink it there first.")
        if user.role != "super_admin":
            # Org admins can only link courses taught by a member of their organization.
            if course.instructor_id is None or self._membership(db, org.id, course.instructor_id) is None:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                    detail="The course's instructor must be a member of this organization")
        course.organization_id = org.id
        db.commit()
        db.refresh(course)
        return course

    def unlink_course(self, db: Session, org_id: str, course_id: str, user: User) -> None:
        org = self._get_or_404(db, org_id)
        self._require_manager(db, org, user)
        course = db.query(Course).filter(Course.id == course_id, Course.organization_id == org.id).first()
        if course is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Course not found in this organization")
        course.organization_id = None
        db.commit()

    # ------------------------------------------------------------ stats
    def stats(self, db: Session, org_id: str, user: User) -> OrganizationStats:
        org = self._get_or_404(db, org_id)
        self._require_manager(db, org, user)
        by_role = dict(
            db.query(OrganizationMember.member_role, func.count(OrganizationMember.id))
            .filter(OrganizationMember.organization_id == org.id)
            .group_by(OrganizationMember.member_role).all()
        )
        members_by_role = {role: int(by_role.get(role, 0)) for role in MEMBER_ROLES}
        course_ids = [cid for (cid,) in db.query(Course.id).filter(Course.organization_id == org.id).all()]
        published = (
            db.query(func.count(Course.id))
            .filter(Course.organization_id == org.id, func.lower(Course.status) == "published").scalar()
        )
        enrollments_total = enrollments_completed = certificates = 0
        if course_ids:
            enrollments_total = db.query(func.count(Enrollment.id)).filter(Enrollment.course_id.in_(course_ids)).scalar()
            enrollments_completed = (
                db.query(func.count(Enrollment.id))
                .filter(Enrollment.course_id.in_(course_ids), func.upper(Enrollment.status) == "COMPLETED").scalar()
            )
            certificates = (
                db.query(func.count(Certificate.id))
                .filter(Certificate.course_id.in_(course_ids), Certificate.status == "issued").scalar()
            )
        return OrganizationStats(
            organization_id=org.id,
            members_total=sum(members_by_role.values()),
            members_by_role=members_by_role,
            courses_total=len(course_ids),
            courses_published=int(published or 0),
            enrollments_total=int(enrollments_total or 0),
            enrollments_completed=int(enrollments_completed or 0),
            certificates_issued=int(certificates or 0),
        )


organization_service = OrganizationService()
