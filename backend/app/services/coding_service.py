"""Coding exercises: authoring, drafts, Run / Submit evaluation and results."""
import logging
from contextlib import contextmanager
from datetime import datetime, timedelta
from typing import List, Optional, Tuple

from fastapi import BackgroundTasks, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.models.coding import (
    CodingDraft, CodingExercise, CodingSubmission, CodingSubmissionResult, CodingTestCase,
)
from app.models.course import Course
from app.models.lecture import Lecture
from app.models.section import Section
from app.models.user import User
from app.schemas import coding as s
from app.services import course_policy
from app.services.code_runner import (
    COMPILE_ERROR, INTERNAL, MEMORY_LIMIT, OK, RUNTIME_ERROR, TIME_LIMIT, RunnerUnavailable, code_runner,
)
from app.services.gamification_service import gamification_service
from app.services.platform_settings_service import get_setting

logger = logging.getLogger(__name__)

MAX_TEST_CASES = 50
FAILURE_PRIORITY = [COMPILE_ERROR, TIME_LIMIT, MEMORY_LIMIT, RUNTIME_ERROR, INTERNAL, "wrong_answer"]


@contextmanager
def background_session():
    """A fresh database session for work that continues after the HTTP response (tests replace this)."""
    from app.database.session import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _same_output(actual: str, expected: str) -> bool:
    def norm(text: str) -> List[str]:
        lines = [line.rstrip() for line in (text or "").replace("\r\n", "\n").split("\n")]
        while lines and not lines[-1]:
            lines.pop()
        return lines
    return norm(actual) == norm(expected)


class CodingService:
    # ------------------------------------------------------------------ access helpers
    def _course(self, db: Session, course_id: str) -> Course:
        course = db.get(Course, course_id)
        if not course:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Course not found")
        return course

    def _load(self, db: Session, exercise_id: str, user: User) -> Tuple[CodingExercise, Course, bool]:
        """The exercise, its course and whether the caller is staff for it. Learners only reach published exercises
        of courses they are enrolled in."""
        exercise = db.get(CodingExercise, exercise_id)
        course = db.get(Course, exercise.course_id) if exercise else None
        if not exercise or not course:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Exercise not found")
        staff = course_policy.is_course_manager(user, course)
        if not staff:
            if exercise.status != "published":
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Exercise not found")
            if not course_policy.has_course_access(db, user, course):
                raise HTTPException(status.HTTP_403_FORBIDDEN, "You need to be enrolled in this course")
        return exercise, course, staff

    def _author(self, db: Session, exercise_id: str, user: User) -> Tuple[CodingExercise, Course]:
        exercise = db.get(CodingExercise, exercise_id)
        course = db.get(Course, exercise.course_id) if exercise else None
        if not exercise or not course:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Exercise not found")
        self._require_author(db, course, user)
        return exercise, course

    def _require_author(self, db: Session, course: Course, user: User) -> None:
        if not course_policy.is_course_manager(user, course):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the course instructor or a Super Admin can do this")
        if user.role == "instructor":
            if (course.status or "").lower() == "pending_review":
                raise HTTPException(status.HTTP_409_CONFLICT, "Cannot modify exercises while the course is pending review")
            course_policy.apply_published_edit_policy(db, course, user)

    def _check_lecture(self, db: Session, lecture_id: Optional[str], course_id: str) -> None:
        if lecture_id is None:
            return
        row = (db.query(Lecture.id).join(Section, Section.id == Lecture.section_id)
               .filter(Lecture.id == lecture_id, Section.course_id == course_id).first())
        if not row:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "lecture_id does not belong to this course")

    # ------------------------------------------------------------------ views
    def _solved_info(self, db: Session, user_id: str, exercise_ids: List[str]) -> dict:
        if not exercise_ids:
            return {}
        info = {}
        for ex_id, best, accepted in (
            db.query(CodingSubmission.exercise_id, func.max(CodingSubmission.score),
                     func.count(CodingSubmission.id).filter(CodingSubmission.status == "accepted"))
            .filter(CodingSubmission.user_id == user_id, CodingSubmission.kind == "submit",
                    CodingSubmission.exercise_id.in_(exercise_ids))
            .group_by(CodingSubmission.exercise_id).all()
        ):
            info[ex_id] = (bool(accepted), best)
        return info

    def _summary(self, ex: CodingExercise, solved=None, best=None, cases=None) -> s.ExerciseSummary:
        data = s.ExerciseSummary.model_validate(ex)
        data.solved, data.best_score, data.test_case_count = solved, best, cases
        return data

    def staff_view(self, db: Session, ex: CodingExercise) -> s.ExerciseStaffResponse:
        data = s.ExerciseStaffResponse.model_validate(ex)
        data.test_case_count = len(ex.test_cases)
        return data

    def learner_view(self, db: Session, ex: CodingExercise, user: User) -> s.ExerciseLearnerResponse:
        solved, best = self._solved_info(db, user.id, [ex.id]).get(ex.id, (False, None))
        data = s.ExerciseLearnerResponse.model_validate(ex)
        data.hints_count = len(ex.hints or [])
        data.solved, data.best_score = solved, best
        data.explanation = ex.explanation if solved else None
        data.sample_test_cases = [s.CaseLearnerResponse.model_validate(c) for c in ex.test_cases if not c.is_hidden]
        return data

    def get_exercise(self, db: Session, exercise_id: str, user: User):
        ex, course, staff = self._load(db, exercise_id, user)
        return self.staff_view(db, ex) if staff else self.learner_view(db, ex, user)

    def list_for_course(self, db: Session, course_id: str, user: User, status_filter: Optional[str] = None):
        course = self._course(db, course_id)
        staff = course_policy.is_course_manager(user, course)
        q = db.query(CodingExercise).filter(CodingExercise.course_id == course_id)
        if staff:
            if status_filter:
                q = q.filter(CodingExercise.status == status_filter)
        else:
            if not course_policy.has_course_access(db, user, course):
                raise HTTPException(status.HTTP_403_FORBIDDEN, "You need to be enrolled in this course")
            q = q.filter(CodingExercise.status == "published")
        rows = q.order_by(CodingExercise.order_index, CodingExercise.created_at).all()
        if staff:
            return [self._summary(r, cases=len(r.test_cases)) for r in rows]
        info = self._solved_info(db, user.id, [r.id for r in rows])
        return [self._summary(r, *info.get(r.id, (False, None))) for r in rows]

    def hint(self, db: Session, exercise_id: str, number: int, user: User) -> s.HintResponse:
        ex, _, _ = self._load(db, exercise_id, user)
        hints = ex.hints or []
        if number < 1 or number > len(hints):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "No such hint")
        return s.HintResponse(number=number, total=len(hints), hint=hints[number - 1])

    # ------------------------------------------------------------------ authoring
    def create_exercise(self, db: Session, course_id: str, body: s.ExerciseCreate, user: User) -> s.ExerciseStaffResponse:
        course = self._course(db, course_id)
        self._require_author(db, course, user)
        self._check_lecture(db, body.lecture_id, course_id)
        data = body.model_dump(exclude_unset=True)
        ex = CodingExercise(course_id=course_id, created_by=user.id, status="draft", **data)
        if ex.order_index is None:
            ex.order_index = (db.query(func.max(CodingExercise.order_index)).filter(CodingExercise.course_id == course_id).scalar() or -1) + 1
        db.add(ex)
        db.commit()
        db.refresh(ex)
        return self.staff_view(db, ex)

    def update_exercise(self, db: Session, exercise_id: str, body: s.ExerciseUpdate, user: User) -> s.ExerciseStaffResponse:
        ex, course = self._author(db, exercise_id, user)
        data = body.model_dump(exclude_unset=True)
        if "lecture_id" in data:
            self._check_lecture(db, data["lecture_id"], course.id)
        new_status = data.pop("status", None)
        for key, value in data.items():
            if value is None and key in ("title", "problem_statement", "language", "difficulty", "time_limit_ms",
                                         "memory_limit_mb", "max_score", "order_index"):
                continue
            setattr(ex, key, value)
        if new_status is not None:
            if new_status == "published" and not ex.test_cases:
                raise HTTPException(status.HTTP_409_CONFLICT, "Add at least one test case before publishing")
            ex.status = new_status
        db.commit()
        db.refresh(ex)
        return self.staff_view(db, ex)

    def delete_exercise(self, db: Session, exercise_id: str, user: User) -> str:
        ex, _ = self._author(db, exercise_id, user)
        if db.query(CodingSubmission.id).filter(CodingSubmission.exercise_id == ex.id).first():
            ex.status = "archived"
            db.commit()
            return "archived"      # keep learners' history
        db.delete(ex)
        db.commit()
        return "deleted"

    def add_case(self, db: Session, exercise_id: str, body: s.CaseCreate, user: User) -> s.CaseStaffResponse:
        ex, _ = self._author(db, exercise_id, user)
        if len(ex.test_cases) >= MAX_TEST_CASES:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"An exercise can have at most {MAX_TEST_CASES} test cases")
        order = body.order_index if body.order_index is not None else len(ex.test_cases)
        case = CodingTestCase(exercise_id=ex.id, input=body.input, expected_output=body.expected_output,
                              is_hidden=body.is_hidden, weight=body.weight, order_index=order)
        db.add(case)
        db.commit()
        db.refresh(case)
        return s.CaseStaffResponse.model_validate(case)

    def list_cases(self, db: Session, exercise_id: str, user: User):
        ex, _, staff = self._load(db, exercise_id, user)
        if staff:
            return [s.CaseStaffResponse.model_validate(c) for c in ex.test_cases]
        return [s.CaseLearnerResponse.model_validate(c) for c in ex.test_cases if not c.is_hidden]

    def _case(self, db: Session, exercise_id: str, case_id: str, user: User):
        ex, _ = self._author(db, exercise_id, user)
        case = db.get(CodingTestCase, case_id)
        if not case or case.exercise_id != ex.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Test case not found")
        return ex, case

    def update_case(self, db: Session, exercise_id: str, case_id: str, body: s.CaseUpdate, user: User):
        _, case = self._case(db, exercise_id, case_id, user)
        for key, value in body.model_dump(exclude_unset=True).items():
            if value is not None:
                setattr(case, key, value)
        db.commit()
        db.refresh(case)
        return s.CaseStaffResponse.model_validate(case)

    def delete_case(self, db: Session, exercise_id: str, case_id: str, user: User) -> None:
        ex, case = self._case(db, exercise_id, case_id, user)
        if ex.status == "published" and len(ex.test_cases) <= 1:
            raise HTTPException(status.HTTP_409_CONFLICT, "A published exercise needs at least one test case")
        db.delete(case)
        db.commit()

    # ------------------------------------------------------------------ drafts
    def save_draft(self, db: Session, exercise_id: str, body: s.DraftSave, user: User) -> s.DraftResponse:
        ex, _, _ = self._load(db, exercise_id, user)
        self._check_source(body.source_code)
        language = self._language(ex, body.language)
        draft = db.query(CodingDraft).filter(CodingDraft.user_id == user.id, CodingDraft.exercise_id == ex.id).first()
        if draft:
            draft.source_code, draft.language = body.source_code, language
        else:
            draft = CodingDraft(user_id=user.id, exercise_id=ex.id, language=language, source_code=body.source_code)
            db.add(draft)
        db.commit()
        db.refresh(draft)
        return s.DraftResponse.model_validate(draft)

    def get_draft(self, db: Session, exercise_id: str, user: User) -> s.DraftResponse:
        ex, _, _ = self._load(db, exercise_id, user)
        draft = db.query(CodingDraft).filter(CodingDraft.user_id == user.id, CodingDraft.exercise_id == ex.id).first()
        if draft:
            return s.DraftResponse.model_validate(draft)
        return s.DraftResponse(exercise_id=ex.id, language=ex.language, source_code=ex.starter_code or "")

    # ------------------------------------------------------------------ running code
    def _check_source(self, source: str) -> None:
        if len(source.encode()) > settings.CODE_MAX_SOURCE_KB * 1024:
            raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, f"Code is larger than {settings.CODE_MAX_SOURCE_KB} KB")

    def _language(self, ex: CodingExercise, requested: Optional[str]) -> str:
        if requested and requested != ex.language:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"This exercise is in {ex.language}")
        return ex.language

    def enqueue(self, db: Session, exercise_id: str, user: User, kind: str, source: str, language: Optional[str],
                custom_input: Optional[str], background: BackgroundTasks) -> CodingSubmission:
        ex, _, staff = self._load(db, exercise_id, user)
        if ex.status == "archived":
            raise HTTPException(status.HTTP_409_CONFLICT, "This exercise is archived")
        self._check_source(source)
        if not source.strip():
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Write some code first")
        if custom_input is not None and len(custom_input) > 10240:
            raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Custom input is larger than 10 KB")
        lang = self._language(ex, language)
        enabled = get_setting(db, "courses.coding_languages_enabled", ["python"])
        if lang not in enabled:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"{lang} is not enabled on this platform")
        if not code_runner.available():
            raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Code execution is not set up on this server yet")
        if not code_runner.supports(lang):
            raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, f"The code runner cannot run {lang}")
        limit = int(get_setting(db, "coding.submissions_per_minute", 6))
        recent = db.query(func.count(CodingSubmission.id)).filter(
            CodingSubmission.user_id == user.id,
            CodingSubmission.created_at >= datetime.utcnow() - timedelta(minutes=1)).scalar() or 0
        if limit and recent >= limit:
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Slow down: too many runs in the last minute")
        sub = CodingSubmission(exercise_id=ex.id, user_id=user.id, kind=kind, language=lang, source_code=source,
                               custom_input=custom_input if kind == "run" else None, status="queued")
        db.add(sub)
        db.commit()
        db.refresh(sub)
        gamification_service.touch_activity(db, user.id, "coding", coding_submissions=1)
        background.add_task(self.evaluate, sub.id)
        return sub

    # ---- runs in the background -------------------------------------------------------------
    def evaluate(self, submission_id: str) -> None:
        try:
            with background_session() as db:
                self._evaluate(db, submission_id)
        except Exception:
            logger.exception("Evaluation of coding submission %s crashed", submission_id)

    def _evaluate(self, db: Session, submission_id: str) -> None:
        sub = db.get(CodingSubmission, submission_id)
        if sub is None or sub.status not in ("queued", "running"):
            return
        ex = db.get(CodingExercise, sub.exercise_id)
        sub.status = "running"
        db.commit()
        try:
            if sub.kind == "run":
                self._evaluate_run(db, sub, ex)
            else:
                self._evaluate_submit(db, sub, ex)
        except RunnerUnavailable as exc:
            sub = db.get(CodingSubmission, submission_id)
            sub.status, sub.stderr, sub.evaluated_at = INTERNAL, str(exc), datetime.utcnow()
            db.commit()
        except Exception:
            logger.exception("Coding evaluation failed")
            db.rollback()
            sub = db.get(CodingSubmission, submission_id)
            sub.status, sub.stderr, sub.evaluated_at = INTERNAL, "Something went wrong while running your code", datetime.utcnow()
            db.commit()

    def _evaluate_run(self, db: Session, sub: CodingSubmission, ex: CodingExercise) -> None:
        stdin = sub.custom_input if sub.custom_input is not None else (ex.sample_input or "")
        result = code_runner.execute(sub.language, sub.source_code, stdin, ex.time_limit_ms, ex.memory_limit_mb)
        sub.status, sub.stdout, sub.stderr = result.status, result.stdout, result.stderr
        sub.execution_time_ms, sub.memory_kb, sub.evaluated_at = result.time_ms, result.memory_kb, datetime.utcnow()
        db.commit()

    def _evaluate_submit(self, db: Session, sub: CodingSubmission, ex: CodingExercise) -> None:
        cases = list(ex.test_cases)
        total_weight = sum(c.weight for c in cases) or 1
        passed_weight = passed = 0
        worst_time = worst_memory = 0
        outcomes = []
        stop_status = None
        for case in cases:
            if stop_status:
                outcomes.append((case, stop_status, "", None, None, "Not run"))
                continue
            result = code_runner.execute(sub.language, sub.source_code, case.input, ex.time_limit_ms, ex.memory_limit_mb)
            case_status = result.status
            if case_status == OK:
                case_status = "accepted" if _same_output(result.stdout, case.expected_output) else "wrong_answer"
            if case_status == "accepted":
                passed += 1
                passed_weight += case.weight
            if case_status in (COMPILE_ERROR, INTERNAL):
                stop_status = case_status
            worst_time = max(worst_time, result.time_ms or 0)
            worst_memory = max(worst_memory, result.memory_kb or 0)
            outcomes.append((case, case_status, result.stdout, result.time_ms, result.memory_kb, result.stderr))
        for case, case_status, stdout, time_ms, memory_kb, stderr in outcomes:
            db.add(CodingSubmissionResult(submission_id=sub.id, test_case_id=case.id, status=case_status,
                                          actual_output=stdout[:20000], execution_time_ms=time_ms, memory_kb=memory_kb,
                                          error_message=(stderr or None) if case_status != "accepted" else None))
        failures = [o for o in outcomes if o[1] != "accepted"]
        if not failures:
            final = "accepted"
        else:
            kinds = {o[1] for o in failures}
            final = next(k for k in FAILURE_PRIORITY if k in kinds)
        sub.status, sub.passed_count, sub.failed_count, sub.total_count = final, passed, len(cases) - passed, len(cases)
        sub.score = round(ex.max_score * passed_weight / total_weight)
        sub.execution_time_ms, sub.memory_kb, sub.evaluated_at = worst_time or None, worst_memory or None, datetime.utcnow()
        first_bad = next((o for o in failures if o[1] == final), None)
        if first_bad:
            case, _, _, _, _, stderr = first_bad
            sub.stderr = (stderr or None) if (not case.is_hidden or final == COMPILE_ERROR) else None
        db.commit()
        from app.services.personalization_service import personalization_service
        personalization_service.record_coding_submit(db, sub.user_id, ex.id, final == "accepted")
        if final == "accepted":
            gamification_service.touch_activity(db, sub.user_id, "coding", exercises=1)
            gamification_service.record(db, sub.user_id, "exercise_solved", ex.id, "coding_exercise")

    # ------------------------------------------------------------------ reading results
    def _detail(self, db: Session, sub: CodingSubmission, staff: bool) -> s.SubmissionDetailResponse:
        data = s.SubmissionDetailResponse(**s.SubmissionResponse.model_validate(sub).model_dump(),
                                          source_code=sub.source_code, custom_input=sub.custom_input, results=[])
        cases = {c.id: c for c in db.query(CodingTestCase).filter(CodingTestCase.exercise_id == sub.exercise_id).all()}
        order = sorted(sub.results, key=lambda r: (cases[r.test_case_id].order_index if r.test_case_id in cases else 0))
        views = []
        for number, r in enumerate(order, 1):
            case = cases.get(r.test_case_id)
            hidden = bool(case and case.is_hidden)
            view = s.CaseResultView(test_case_id=r.test_case_id, number=number, status=r.status, is_hidden=hidden,
                                    execution_time_ms=r.execution_time_ms, memory_kb=r.memory_kb)
            if staff or not hidden:
                view.error_message = r.error_message
                view.actual_output = r.actual_output
                if case:
                    view.input, view.expected_output = case.input, case.expected_output
            views.append(view)
        data.results = views
        return data

    def get_submission(self, db: Session, submission_id: str, user: User) -> s.SubmissionDetailResponse:
        sub = db.get(CodingSubmission, submission_id)
        ex = db.get(CodingExercise, sub.exercise_id) if sub else None
        course = db.get(Course, ex.course_id) if ex else None
        if not sub or not course:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Submission not found")
        staff = course_policy.is_course_manager(user, course)
        if sub.user_id != user.id and not staff:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Submission not found")
        return self._detail(db, sub, staff)

    def list_submissions(self, db: Session, exercise_id: str, user: User, kind: Optional[str], user_id: Optional[str],
                         skip: int, limit: int) -> List[CodingSubmission]:
        ex, _, staff = self._load(db, exercise_id, user)
        q = db.query(CodingSubmission).filter(CodingSubmission.exercise_id == ex.id)
        if staff and user_id:
            q = q.filter(CodingSubmission.user_id == user_id)
        elif not staff:
            q = q.filter(CodingSubmission.user_id == user.id)
        if kind:
            q = q.filter(CodingSubmission.kind == kind)
        return q.order_by(CodingSubmission.created_at.desc()).offset(skip).limit(limit).all()

    def stats(self, db: Session, exercise_id: str, user: User) -> s.ExerciseStats:
        ex, _ = self._author_view(db, exercise_id, user)
        subs = db.query(CodingSubmission).filter(CodingSubmission.exercise_id == ex.id, CodingSubmission.kind == "submit").all()
        by_user = {}
        breakdown = {}
        for sub in subs:
            breakdown[sub.status] = breakdown.get(sub.status, 0) + 1
            best = by_user.setdefault(sub.user_id, {"score": 0, "solved": False})
            best["score"] = max(best["score"], sub.score or 0)
            best["solved"] = best["solved"] or sub.status == "accepted"
        attempted = len(by_user)
        solved = sum(1 for b in by_user.values() if b["solved"])
        return s.ExerciseStats(
            exercise_id=ex.id, submissions=len(subs), learners_attempted=attempted, learners_solved=solved,
            acceptance_rate_percent=round(solved * 100 / attempted, 1) if attempted else 0.0,
            average_best_score=round(sum(b["score"] for b in by_user.values()) / attempted, 1) if attempted else 0.0,
            status_breakdown=breakdown)

    def _author_view(self, db: Session, exercise_id: str, user: User):
        """Staff access without the edit-policy side effects (used for read-only staff views)."""
        ex = db.get(CodingExercise, exercise_id)
        course = db.get(Course, ex.course_id) if ex else None
        if not ex or not course:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Exercise not found")
        if not course_policy.is_course_manager(user, course):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the course instructor or a Super Admin can do this")
        return ex, course

    def runner_status(self, db: Session) -> s.RunnerStatus:
        languages = [l for l in s.LANGUAGES if code_runner.supports(l)]
        return s.RunnerStatus(runner=code_runner.name, available=code_runner.available(), languages=languages,
                              enabled_in_settings=list(get_setting(db, "courses.coding_languages_enabled", ["python"])))

    # ------------------------------------------------------------------ worker support
    def requeue_stuck(self, db: Session, older_than_seconds: int = 120) -> List[str]:
        """Ids of submissions that were queued/running for too long (e.g. the server restarted mid-run)."""
        cutoff = datetime.utcnow() - timedelta(seconds=older_than_seconds)
        rows = db.query(CodingSubmission.id).filter(CodingSubmission.status.in_(["queued", "running"]),
                                                    CodingSubmission.created_at <= cutoff).all()
        ids = [r[0] for r in rows]
        if ids:
            db.query(CodingSubmission).filter(CodingSubmission.id.in_(ids)).update({"status": "queued"}, synchronize_session=False)
            db.commit()
        return ids


coding_service = CodingService()
