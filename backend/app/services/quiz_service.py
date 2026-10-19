from datetime import datetime
from typing import Optional, List, Tuple, Union, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from app.services import course_policy
from sqlalchemy.orm import object_session

from app.models.quiz import Quiz
from app.models.question import Question
from app.models.quiz_attempt import QuizAttempt, QuizAttemptAnswer
from app.models.section import Section
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.user import User
from app.schemas.quiz import (
    QuizCreate,
    QuizUpdate,
    QuizResponse,
    QuizDetailResponse,
    QuizLearnerDetailResponse,
    QuestionCreate,
    QuestionUpdate,
    QuestionResponse,
    QuestionLearnerResponse,
    QuizSubmitRequest,
    QuizAttemptResponse,
    check_option_match,
)


def _is_option_valid(selected: str, options: Any) -> bool:
    """
    Checks if a selected option is present in the question options.
    Case-insensitive matching for string options.
    """
    cleaned = selected.strip().lower()
    if isinstance(options, list):
        return any(cleaned == str(opt).strip().lower() for opt in options)
    elif isinstance(options, dict):
        return (
            any(cleaned == str(k).strip().lower() for k in options.keys())
            or any(cleaned == str(v).strip().lower() for v in options.values())
        )
    return False


def _is_answer_correct(selected: str, correct_option: str, options: Any) -> bool:
    """
    Determines whether a learner's selected option is correct.
    Supports list equality and dict key/value correspondence.
    """
    sel = selected.strip().lower()
    corr = correct_option.strip().lower()
    if sel == corr:
        return True
    if isinstance(options, dict):
        for k, v in options.items():
            k_clean = str(k).strip().lower()
            v_clean = str(v).strip().lower()
            if (sel == k_clean and corr == v_clean) or (sel == v_clean and corr == k_clean):
                return True
    return False


class QuizService:
    # ---------------------------------------------------------
    # Helper & Validation Methods
    # ---------------------------------------------------------

    def get_by_id(self, db: Session, quiz_id: str) -> Optional[Quiz]:
        if not quiz_id:
            return None
        return db.query(Quiz).filter(Quiz.id == quiz_id).first()

    def _get_section_and_course(self, db: Session, section_id: str) -> Tuple[Section, Course]:
        section = db.query(Section).filter(Section.id == section_id).first()
        if not section:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Section with id '{section_id}' not found"
            )
        course = db.query(Course).filter(Course.id == section.course_id).first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent course not found"
            )
        return section, course

    def _get_quiz_section_and_course(self, db: Session, quiz_id: str) -> Tuple[Quiz, Section, Course]:
        quiz = self.get_by_id(db, quiz_id)
        if not quiz:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quiz not found"
            )
        section = db.query(Section).filter(Section.id == quiz.section_id).first()
        if not section:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Section not found"
            )
        course = db.query(Course).filter(Course.id == section.course_id).first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent course not found"
            )
        return quiz, section, course

    def _check_author_permission(self, course: Course, current_user: User, content_edit: bool = True) -> None:
        """
        Enforces authoring access control:
        - Super Admin: global access
        - Instructor: only owned courses, blocked if course is pending review
        - Learner: forbidden
        """
        if current_user.role == "learner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Learners are not permitted to manage quiz content"
            )
        elif current_user.role == "instructor":
            if course.instructor_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Instructors can only manage quizzes in their own courses"
                )
            if content_edit and course.status.lower() == "pending_review":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Cannot modify quiz content while course is pending review"
                )
            if content_edit:
                course_policy.apply_published_edit_policy(object_session(course), course, current_user)
        elif current_user.role != "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to manage quiz content"
            )

    def _check_learner_access(self, db: Session, course: Course, current_user: User) -> None:
        """
        Validates learner access:
        - Course must be published
        - Learner must be actively enrolled
        """
        if current_user.role == "learner":
            if not course_policy.is_live_for_enrolled(course):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot access quizzes for an unpublished course"
                )
            enrollment = (
                db.query(Enrollment)
                .filter(
                    Enrollment.user_id == current_user.id,
                    Enrollment.course_id == course.id,
                    Enrollment.status == "ACTIVE"
                )
                .first()
            )
            if not enrollment:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Learner must be actively enrolled in the course to access quizzes"
                )

    # ---------------------------------------------------------
    # Quiz Management Operations
    # ---------------------------------------------------------

    def create_quiz(
        self,
        db: Session,
        section_id: str,
        quiz_in: QuizCreate,
        current_user: User
    ) -> Quiz:
        section, course = self._get_section_and_course(db, section_id)
        self._check_author_permission(course, current_user)

        quiz = Quiz(
            section_id=section.id,
            title=quiz_in.title.strip(),
            passing_score=quiz_in.passing_score if quiz_in.passing_score is not None else 70,
        )

        try:
            db.add(quiz)
            db.commit()
            db.refresh(quiz)
            return quiz
        except HTTPException:
            raise
        except Exception:
            db.rollback()
            raise

    def get_quiz(self, db: Session, quiz_id: str, current_user: User) -> Quiz:
        quiz, _, course = self._get_quiz_section_and_course(db, quiz_id)

        if current_user.role == "learner":
            self._check_learner_access(db, course, current_user)
        elif current_user.role == "instructor":
            if course.instructor_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Instructors can only view quizzes in their own courses"
                )

        return quiz

    def get_quiz_detail(
        self,
        db: Session,
        quiz_id: str,
        current_user: User
    ) -> Union[QuizDetailResponse, QuizLearnerDetailResponse]:
        quiz = self.get_quiz(db, quiz_id, current_user)
        questions = (
            db.query(Question)
            .filter(Question.quiz_id == quiz.id)
            .order_by(Question.created_at.asc())
            .all()
        )

        if current_user.role == "learner":
            # SECURITY REQUIREMENT: Never expose correct_option to learners
            learner_questions = [
                QuestionLearnerResponse(
                    id=q.id,
                    quiz_id=q.quiz_id,
                    prompt=q.prompt,
                    options=q.options,
                    created_at=q.created_at
                )
                for q in questions
            ]
            return QuizLearnerDetailResponse(
                id=quiz.id,
                section_id=quiz.section_id,
                title=quiz.title,
                passing_score=quiz.passing_score,
                created_at=quiz.created_at,
                question_count=len(questions),
                questions=learner_questions
            )
        else:
            instructor_questions = [
                QuestionResponse(
                    id=q.id,
                    quiz_id=q.quiz_id,
                    prompt=q.prompt,
                    options=q.options,
                    correct_option=q.correct_option,
                    created_at=q.created_at
                )
                for q in questions
            ]
            return QuizDetailResponse(
                id=quiz.id,
                section_id=quiz.section_id,
                title=quiz.title,
                passing_score=quiz.passing_score,
                created_at=quiz.created_at,
                question_count=len(questions),
                questions=instructor_questions
            )

    def list_quizzes_for_section(
        self,
        db: Session,
        section_id: str,
        current_user: User
    ) -> List[Quiz]:
        section, course = self._get_section_and_course(db, section_id)

        if current_user.role == "learner":
            self._check_learner_access(db, course, current_user)
        elif current_user.role == "instructor":
            if course.instructor_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Instructors can only list quizzes in their own courses"
                )

        return (
            db.query(Quiz)
            .filter(Quiz.section_id == section.id)
            .order_by(Quiz.created_at.asc())
            .all()
        )

    def update_quiz(
        self,
        db: Session,
        quiz_id: str,
        quiz_in: QuizUpdate,
        current_user: User
    ) -> Quiz:
        quiz, _, course = self._get_quiz_section_and_course(db, quiz_id)
        self._check_author_permission(course, current_user)

        if quiz_in.title is not None:
            quiz.title = quiz_in.title.strip()

        if quiz_in.passing_score is not None:
            quiz.passing_score = quiz_in.passing_score

        try:
            db.commit()
            db.refresh(quiz)
            return quiz
        except HTTPException:
            raise
        except Exception:
            db.rollback()
            raise

    def delete_quiz(self, db: Session, quiz_id: str, current_user: User) -> None:
        quiz, _, course = self._get_quiz_section_and_course(db, quiz_id)
        self._check_author_permission(course, current_user)

        # Integrity Check: Block deletion if learner attempts exist
        attempt_count = (
            db.query(QuizAttempt)
            .filter(QuizAttempt.quiz_id == quiz.id)
            .count()
        )
        if attempt_count > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot delete quiz '{quiz.title}' because learner attempts exist."
            )

        try:
            db.delete(quiz)
            db.commit()
        except HTTPException:
            raise
        except Exception:
            db.rollback()
            raise

    # ---------------------------------------------------------
    # Question Management Operations
    # ---------------------------------------------------------

    def add_question(
        self,
        db: Session,
        quiz_id: str,
        question_in: QuestionCreate,
        current_user: User
    ) -> Question:
        quiz, _, course = self._get_quiz_section_and_course(db, quiz_id)
        self._check_author_permission(course, current_user)

        if not check_option_match(question_in.correct_option, question_in.options):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"correct_option '{question_in.correct_option}' must match one of the provided options"
            )

        question = Question(
            quiz_id=quiz.id,
            prompt=question_in.prompt.strip(),
            options=question_in.options,
            correct_option=question_in.correct_option.strip(),
        )

        try:
            db.add(question)
            db.commit()
            db.refresh(question)
            return question
        except HTTPException:
            raise
        except Exception:
            db.rollback()
            raise

    def get_question(self, db: Session, question_id: str, current_user: User) -> Question:
        question = db.query(Question).filter(Question.id == question_id).first()
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found"
            )
        quiz, _, course = self._get_quiz_section_and_course(db, question.quiz_id)

        if current_user.role == "learner":
            self._check_learner_access(db, course, current_user)
        elif current_user.role == "instructor":
            if course.instructor_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Instructors can only view questions in their own courses"
                )

        return question

    def update_question(
        self,
        db: Session,
        question_id: str,
        question_in: QuestionUpdate,
        current_user: User
    ) -> Question:
        question = db.query(Question).filter(Question.id == question_id).first()
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found"
            )
        quiz, _, course = self._get_quiz_section_and_course(db, question.quiz_id)
        self._check_author_permission(course, current_user)

        # Validate options and correct_option combinations
        target_options = question_in.options if question_in.options is not None else question.options
        target_correct = question_in.correct_option if question_in.correct_option is not None else question.correct_option

        if not check_option_match(target_correct, target_options):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"correct_option '{target_correct}' must match one of the provided options"
            )

        if question_in.prompt is not None:
            question.prompt = question_in.prompt.strip()

        if question_in.options is not None:
            question.options = question_in.options

        if question_in.correct_option is not None:
            question.correct_option = question_in.correct_option.strip()

        try:
            db.commit()
            db.refresh(question)
            return question
        except HTTPException:
            raise
        except Exception:
            db.rollback()
            raise

    def delete_question(self, db: Session, question_id: str, current_user: User) -> None:
        question = db.query(Question).filter(Question.id == question_id).first()
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found"
            )
        quiz, _, course = self._get_quiz_section_and_course(db, question.quiz_id)
        self._check_author_permission(course, current_user)

        # Integrity Check: Block question deletion if quiz attempts already exist
        attempt_count = (
            db.query(QuizAttempt)
            .filter(QuizAttempt.quiz_id == quiz.id)
            .count()
        )
        if attempt_count > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot delete question because learner attempts exist for this quiz."
            )

        try:
            db.delete(question)
            db.commit()
        except HTTPException:
            raise
        except Exception:
            db.rollback()
            raise

    # ---------------------------------------------------------
    # Quiz Attempt & Evaluation Operations
    # ---------------------------------------------------------

    def submit_quiz_attempt(
        self,
        db: Session,
        quiz_id: str,
        submit_in: QuizSubmitRequest,
        current_user: User
    ) -> QuizAttemptResponse:
        """
        Evaluates a learner's quiz attempt:
        - Restricts to learners with active enrollment in published courses
        - Validates submitted answers against quiz questions
        - Calculates score and pass/fail status strictly on the server
        - Persists QuizAttempt record and returns QuizAttemptResponse
        """
        if current_user.role != "learner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only learners are permitted to submit quiz attempts"
            )

        quiz, _, course = self._get_quiz_section_and_course(db, quiz_id)

        if not course_policy.is_live_for_enrolled(course):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot attempt quiz for an unpublished course"
            )

        # Active enrollment verification
        enrollment = (
            db.query(Enrollment)
            .filter(
                Enrollment.user_id == current_user.id,
                Enrollment.course_id == course.id,
                Enrollment.status == "ACTIVE"
            )
            .first()
        )
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Learner must be actively enrolled in the course to attempt quizzes"
            )

        # Check that quiz has questions
        questions = (
            db.query(Question)
            .filter(Question.quiz_id == quiz.id)
            .order_by(Question.created_at.asc())
            .all()
        )
        if not questions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot attempt a quiz that has no questions"
            )

        # Validate submitted answers
        submitted_qids = [a.question_id for a in submit_in.answers]
        if len(submitted_qids) != len(set(submitted_qids)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Duplicate question answers submitted"
            )

        questions_by_id = {q.id: q for q in questions}
        for ans in submit_in.answers:
            if ans.question_id not in questions_by_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Question with ID '{ans.question_id}' does not belong to this quiz"
                )
            target_q = questions_by_id[ans.question_id]
            if not _is_option_valid(ans.selected_option, target_q.options):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Selected option '{ans.selected_option}' is not a valid option for question '{target_q.prompt}'"
                )

        # Server-side score evaluation
        submitted_answers_map = {a.question_id: a.selected_option for a in submit_in.answers}
        correct_count = 0
        total_questions = len(questions)

        for q in questions:
            selected = submitted_answers_map.get(q.id)
            if selected is not None and _is_answer_correct(selected, q.correct_option, q.options):
                correct_count += 1

        score = round((correct_count / total_questions) * 100)
        passed = score >= quiz.passing_score

        # Persist attempt record
        previous_attempts = (
            db.query(QuizAttempt)
            .filter(QuizAttempt.quiz_id == quiz.id, QuizAttempt.user_id == current_user.id)
            .count()
        )
        now = datetime.utcnow()
        attempt = QuizAttempt(
            quiz_id=quiz.id,
            user_id=current_user.id,
            score=score,
            passed=passed,
            status="submitted",
            attempt_number=previous_attempts + 1,
            correct_count=correct_count,
            total_questions=total_questions,
            started_at=now,
            attempted_at=now,
        )
        # One row per question: powers answer review and per-question statistics
        for q in questions:
            selected = submitted_answers_map.get(q.id)
            is_correct = selected is not None and _is_answer_correct(selected, q.correct_option, q.options)
            attempt.answers.append(
                QuizAttemptAnswer(
                    question_id=q.id,
                    selected_options=[selected] if selected is not None else [],
                    is_correct=bool(is_correct),
                    points_awarded=(q.points or 1) if is_correct else 0,
                )
            )

        try:
            db.add(attempt)
            db.commit()
            db.refresh(attempt)
        except HTTPException:
            raise
        except Exception:
            db.rollback()
            raise

        return QuizAttemptResponse(
            id=attempt.id,
            quiz_id=attempt.quiz_id,
            user_id=attempt.user_id,
            score=attempt.score,
            passed=attempt.passed,
            attempted_at=attempt.attempted_at,
            total_questions=total_questions,
            correct_count=correct_count
        )

    def list_quiz_attempts(
        self,
        db: Session,
        quiz_id: str,
        current_user: User
    ) -> List[QuizAttempt]:
        """
        Lists attempts for a quiz:
        - Learners can view only their own attempt history
        - Instructors can view all attempts for quizzes in their own courses
        - Super admins can view all attempts
        """
        quiz, _, course = self._get_quiz_section_and_course(db, quiz_id)

        query = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz.id)

        if current_user.role == "learner":
            self._check_learner_access(db, course, current_user)
            query = query.filter(QuizAttempt.user_id == current_user.id)
        elif current_user.role == "instructor":
            if course.instructor_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Instructors can only view attempts for quizzes in their own courses"
                )
        elif current_user.role != "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to view quiz attempts"
            )

        return query.order_by(QuizAttempt.attempted_at.desc()).all()

    def get_quiz_attempt(
        self,
        db: Session,
        attempt_id: str,
        current_user: User
    ) -> QuizAttempt:
        attempt = db.query(QuizAttempt).filter(QuizAttempt.id == attempt_id).first()
        if not attempt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quiz attempt not found"
            )

        quiz, _, course = self._get_quiz_section_and_course(db, attempt.quiz_id)

        if current_user.role == "learner":
            if attempt.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Learners can only view their own quiz attempts"
                )
        elif current_user.role == "instructor":
            if course.instructor_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Instructors can only view attempts for their own courses"
                )
        elif current_user.role != "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to view this quiz attempt"
            )

        return attempt


quiz_service = QuizService()
