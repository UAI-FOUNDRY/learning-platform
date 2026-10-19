from typing import List, Optional, Union

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas import coding as s
from app.schemas.common import MessageResponse
from app.services.coding_service import coding_service

router = APIRouter()


@router.get("/runner", response_model=s.RunnerStatus)
def runner_status(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Is code execution set up, and for which languages? The frontend can hide Run/Submit when `available` is false."""
    return coding_service.runner_status(db)


# ------------------------------------------------------------------ exercises
@router.post("/courses/{course_id}/exercises", response_model=s.ExerciseStaffResponse, status_code=201)
def create_exercise(course_id: str, body: s.ExerciseCreate, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    """Create a coding exercise (course instructor / Super Admin). It starts as a draft."""
    return coding_service.create_exercise(db, course_id, body, current_user)


@router.get("/courses/{course_id}/exercises", response_model=List[s.ExerciseSummary])
def list_exercises(course_id: str, status: Optional[str] = Query(None, pattern="^(draft|published|archived)$"),
                   db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Learners get the published exercises with their own solved/score; staff get all, with test case counts."""
    return coding_service.list_for_course(db, course_id, current_user, status)


@router.get("/exercises/{exercise_id}", response_model=Union[s.ExerciseStaffResponse, s.ExerciseLearnerResponse])
def get_exercise(exercise_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """The problem. Learners never receive the solution or hidden test cases."""
    return coding_service.get_exercise(db, exercise_id, current_user)


@router.put("/exercises/{exercise_id}", response_model=s.ExerciseStaffResponse)
def update_exercise(exercise_id: str, body: s.ExerciseUpdate, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    """Edit an exercise. Set `status` to publish (needs a test case), unpublish or archive."""
    return coding_service.update_exercise(db, exercise_id, body, current_user)


@router.delete("/exercises/{exercise_id}", response_model=MessageResponse)
def delete_exercise(exercise_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Deletes an exercise; if learners already submitted code it is archived instead so their history survives."""
    outcome = coding_service.delete_exercise(db, exercise_id, current_user)
    return MessageResponse(message=f"Exercise {outcome}")


@router.get("/exercises/{exercise_id}/hints/{number}", response_model=s.HintResponse)
def get_hint(exercise_id: str, number: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Reveal hint number `number` (1-based). The exercise tells how many hints exist (`hints_count`)."""
    return coding_service.hint(db, exercise_id, number, current_user)


@router.get("/exercises/{exercise_id}/stats", response_model=s.ExerciseStats)
def exercise_stats(exercise_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Attempts, solvers and acceptance rate (course instructor / Super Admin)."""
    return coding_service.stats(db, exercise_id, current_user)


# ------------------------------------------------------------------ test cases
@router.post("/exercises/{exercise_id}/test-cases", response_model=s.CaseStaffResponse, status_code=201)
def add_test_case(exercise_id: str, body: s.CaseCreate, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    return coding_service.add_case(db, exercise_id, body, current_user)


@router.get("/exercises/{exercise_id}/test-cases", response_model=Union[List[s.CaseStaffResponse], List[s.CaseLearnerResponse]])
def list_test_cases(exercise_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Staff see every case; learners only the visible (non-hidden) examples."""
    return coding_service.list_cases(db, exercise_id, current_user)


@router.put("/exercises/{exercise_id}/test-cases/{case_id}", response_model=s.CaseStaffResponse)
def update_test_case(exercise_id: str, case_id: str, body: s.CaseUpdate, db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    return coding_service.update_case(db, exercise_id, case_id, body, current_user)


@router.delete("/exercises/{exercise_id}/test-cases/{case_id}", response_model=MessageResponse)
def delete_test_case(exercise_id: str, case_id: str, db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    coding_service.delete_case(db, exercise_id, case_id, current_user)
    return MessageResponse(message="Test case deleted")


# ------------------------------------------------------------------ the learner's editor
@router.put("/exercises/{exercise_id}/draft", response_model=s.DraftResponse)
def save_draft(exercise_id: str, body: s.DraftSave, db: Session = Depends(get_db),
               current_user: User = Depends(get_current_user)):
    """Autosave the editor ("Save code")."""
    return coding_service.save_draft(db, exercise_id, body, current_user)


@router.get("/exercises/{exercise_id}/draft", response_model=s.DraftResponse)
def get_draft(exercise_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """My saved code, or the starter code if I have not saved yet."""
    return coding_service.get_draft(db, exercise_id, current_user)


@router.post("/exercises/{exercise_id}/run", response_model=s.SubmissionResponse, status_code=202)
def run_code(exercise_id: str, body: s.RunRequest, background: BackgroundTasks, db: Session = Depends(get_db),
             current_user: User = Depends(get_current_user)):
    """Run my code on my own input (not scored). Returns immediately with status `queued`; poll
    GET /coding/submissions/{id} until the status is no longer queued/running."""
    return coding_service.enqueue(db, exercise_id, current_user, "run", body.source_code, body.language,
                                  body.custom_input, background)


@router.post("/exercises/{exercise_id}/submit", response_model=s.SubmissionResponse, status_code=202)
def submit_code(exercise_id: str, body: s.SubmitRequest, background: BackgroundTasks, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    """Submit for grading against all test cases (hidden ones included). Poll GET /coding/submissions/{id}."""
    return coding_service.enqueue(db, exercise_id, current_user, "submit", body.source_code, body.language,
                                  None, background)


@router.get("/exercises/{exercise_id}/submissions", response_model=List[s.SubmissionResponse])
def list_submissions(exercise_id: str, kind: Optional[str] = Query(None, pattern="^(run|submit)$"),
                     user_id: Optional[str] = Query(None, description="Staff only"),
                     limit: int = Query(50, ge=1, le=200), skip: int = Query(0, ge=0),
                     db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """My submission history for this exercise (staff can see everyone's, or one learner's with user_id)."""
    return coding_service.list_submissions(db, exercise_id, current_user, kind, user_id, skip, limit)


@router.get("/submissions/{submission_id}", response_model=s.SubmissionDetailResponse)
def get_submission(submission_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """One submission with per-test-case results. Hidden test cases show only pass/fail."""
    return coding_service.get_submission(db, submission_id, current_user)
