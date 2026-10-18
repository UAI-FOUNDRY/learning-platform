from typing import List, Union, Optional
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import User
from app.api.deps import get_current_user, require_role
from app.schemas.common import MessageResponse
from app.schemas.assignment import (
    AssignmentCreate,
    AssignmentUpdate,
    AssignmentResponse,
    AssignmentDetailResponse,
    AssignmentLearnerDetailResponse,
    SubmissionCreate,
    SubmissionGrade,
    SubmissionResponse,
)
from app.services.assignment_service import assignment_service

router = APIRouter()
section_assignments_router = APIRouter()


# =========================================================
# Section-scoped Assignment Endpoints (/api/v1/sections/{section_id}/assignments)
# =========================================================

@section_assignments_router.post(
    "/sections/{section_id}/assignments",
    response_model=AssignmentResponse,
    status_code=status.HTTP_201_CREATED,
)
@section_assignments_router.post(
    "/sections/{section_id}/assignments/",
    response_model=AssignmentResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
def create_assignment_for_section(
    section_id: str,
    assignment_in: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "instructor")),
):
    """
    Creates a new assignment within a course section.
    Accessible to course owner instructors and super admins.
    """
    return assignment_service.create_assignment(db, section_id, assignment_in, current_user)


@section_assignments_router.get(
    "/sections/{section_id}/assignments",
    response_model=List[AssignmentResponse],
)
@section_assignments_router.get(
    "/sections/{section_id}/assignments/",
    response_model=List[AssignmentResponse],
    include_in_schema=False,
)
def list_assignments_for_section(
    section_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lists all assignments for a section.
    Accessible to enrolled learners in published courses, course owner instructors, and super admins.
    """
    return assignment_service.list_assignments_for_section(db, section_id, current_user)


# =========================================================
# Standalone Submission / Grading Aliases (/api/v1/submissions/...)
# =========================================================

@section_assignments_router.get(
    "/submissions/{submission_id}",
    response_model=SubmissionResponse,
)
@section_assignments_router.get(
    "/submissions/{submission_id}/",
    response_model=SubmissionResponse,
    include_in_schema=False,
)
def get_submission_direct(
    submission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Direct standalone route to retrieve student submission by submission_id.
    Learners can view only their own submission; course instructors and super admins can view any.
    """
    return assignment_service.get_submission(db, submission_id, current_user)


@section_assignments_router.put(
    "/submissions/{submission_id}/grade",
    response_model=SubmissionResponse,
)
@section_assignments_router.put(
    "/submissions/{submission_id}/grade/",
    response_model=SubmissionResponse,
    include_in_schema=False,
)
def grade_submission_direct(
    submission_id: str,
    grade_in: SubmissionGrade,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "instructor")),
):
    """
    Direct alias for grading a student submission by submission_id.
    Accessible to course owner instructors and super admins.
    """
    return assignment_service.grade_submission(db, submission_id, grade_in, current_user)


# =========================================================
# Assignment Resource Endpoints (/api/v1/assignments/...)
# =========================================================

@router.get("", include_in_schema=False)
@router.get("/")
def get_assignments_root():
    """
    Status / probe endpoint for the assignments module.
    """
    return {"module": "assignments", "description": "Assignment and submission endpoints"}


@router.post(
    "",
    response_model=AssignmentResponse,
    status_code=status.HTTP_201_CREATED,
)
@router.post(
    "/",
    response_model=AssignmentResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
def create_assignment_root(
    assignment_in: AssignmentCreate,
    section_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "instructor")),
):
    """
    Creates a new assignment directly, accepting section_id via body or query param.
    Accessible to course owner instructors and admins.
    """
    target_section_id = section_id or assignment_in.section_id
    if not target_section_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="section_id is required to create an assignment"
        )
    return assignment_service.create_assignment(db, target_section_id, assignment_in, current_user)


@router.get(
    "/{assignment_id}",
    response_model=Union[AssignmentDetailResponse, AssignmentLearnerDetailResponse],
)
@router.get(
    "/{assignment_id}/",
    response_model=Union[AssignmentDetailResponse, AssignmentLearnerDetailResponse],
    include_in_schema=False,
)
def get_assignment_detail(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves assignment details.
    Learners receive assignment data with their personal submission if present.
    Instructors receive assignment data with all submitted student submissions.
    """
    return assignment_service.get_assignment_detail(db, assignment_id, current_user)


@router.put(
    "/{assignment_id}",
    response_model=AssignmentResponse,
)
@router.put(
    "/{assignment_id}/",
    response_model=AssignmentResponse,
    include_in_schema=False,
)
def update_assignment(
    assignment_id: str,
    assignment_in: AssignmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "instructor")),
):
    """
    Updates assignment title, instructions, or deadline.
    Accessible to course owner instructors and admins.
    """
    return assignment_service.update_assignment(db, assignment_id, assignment_in, current_user)


@router.delete(
    "/{assignment_id}",
    response_model=MessageResponse,
)
@router.delete(
    "/{assignment_id}/",
    response_model=MessageResponse,
    include_in_schema=False,
)
def delete_assignment(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "instructor")),
):
    """
    Deletes an assignment if no learner submissions exist.
    Accessible to course owner instructors and admins.
    """
    assignment_service.delete_assignment(db, assignment_id, current_user)
    return MessageResponse(message="Assignment deleted successfully")


# =========================================================
# Submission & Grading Endpoints (/api/v1/assignments/{assignment_id}/...)
# =========================================================

@router.post(
    "/{assignment_id}/submit",
    response_model=SubmissionResponse,
    status_code=status.HTTP_201_CREATED,
)
@router.post(
    "/{assignment_id}/submit/",
    response_model=SubmissionResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
@router.post(
    "/{assignment_id}/submissions",
    response_model=SubmissionResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
@router.post(
    "/{assignment_id}/submissions/",
    response_model=SubmissionResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
def submit_assignment(
    assignment_id: str,
    submission_in: SubmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Submits or resubmits assignment deliverable URL.
    Accessible to actively enrolled learners in published courses before deadline.
    """
    return assignment_service.submit_assignment(db, assignment_id, submission_in, current_user)


@router.get(
    "/{assignment_id}/my-submission",
    response_model=SubmissionResponse,
)
@router.get(
    "/{assignment_id}/my-submission/",
    response_model=SubmissionResponse,
    include_in_schema=False,
)
def get_my_submission(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves the current learner's own submission and grade status for an assignment.
    """
    return assignment_service.get_learner_submission(db, assignment_id, current_user)


@router.get(
    "/{assignment_id}/submissions",
    response_model=List[SubmissionResponse],
)
@router.get(
    "/{assignment_id}/submissions/",
    response_model=List[SubmissionResponse],
    include_in_schema=False,
)
def list_assignment_submissions(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "instructor")),
):
    """
    Lists all learner submissions for an assignment.
    Accessible to course owner instructors and admins.
    """
    return assignment_service.list_submissions_for_assignment(db, assignment_id, current_user)


@router.get(
    "/{assignment_id}/submissions/{submission_id}",
    response_model=SubmissionResponse,
)
@router.get(
    "/{assignment_id}/submissions/{submission_id}/",
    response_model=SubmissionResponse,
    include_in_schema=False,
)
def get_assignment_submission_by_id(
    assignment_id: str,
    submission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves a specific student submission by submission_id under assignment_id.
    Learners can only view their own submission; course instructors can view any.
    """
    return assignment_service.get_assignment_submission(db, assignment_id, submission_id, current_user)


@router.put(
    "/{assignment_id}/submissions/{submission_id}/grade",
    response_model=SubmissionResponse,
)
@router.put(
    "/{assignment_id}/submissions/{submission_id}/grade/",
    response_model=SubmissionResponse,
    include_in_schema=False,
)
def grade_assignment_submission(
    assignment_id: str,
    submission_id: str,
    grade_in: SubmissionGrade,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "instructor")),
):
    """
    Assigns or updates a grade on a student submission.
    Accessible to course owner instructors and admins.
    """
    # Verify consistency of assignment and submission
    assignment_service.get_assignment_submission(db, assignment_id, submission_id, current_user)
    return assignment_service.grade_submission(db, submission_id, grade_in, current_user)
