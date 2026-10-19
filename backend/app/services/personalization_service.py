"""Personalized learning: topics and mastery, goals, learning paths and recommendations."""
import logging
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.coding import CodingExercise, CodingSubmission
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.learning import WishlistItem
from app.models.lecture import Lecture
from app.models.personalization import (
    LearningActivityDaily, LearningGoal, LearningPath, LearningPathCourse, LearningPathEnrollment,
    Recommendation, Topic, UserTopicMastery, coding_exercise_topics, course_topics, question_topics,
)
from app.models.progress import Progress
from app.models.question import Question
from app.models.quiz import Quiz
from app.models.review import Review
from app.models.section import Section
from app.models.user import User
from app.schemas import personalization as s
from app.services import course_policy

logger = logging.getLogger(__name__)

WEAK_MASTERY = 60.0
WEAK_MIN_ATTEMPTS = 3
RECOMMENDATION_TTL = timedelta(hours=1)


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")
    return slug[:100] or "item"


def _404(label: str) -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, f"{label} not found")


class PersonalizationService:
    # ================================================================== topics
    def _unique_slug(self, db: Session, model, base: str, exclude_id: Optional[str] = None) -> str:
        slug, n = base, 2
        while True:
            q = db.query(model.id).filter(model.slug == slug)
            if exclude_id:
                q = q.filter(model.id != exclude_id)
            if not q.first():
                return slug
            slug, n = f"{base}-{n}", n + 1

    def list_topics(self, db: Session) -> List[Topic]:
        return db.query(Topic).order_by(Topic.name).all()

    def create_topic(self, db: Session, body: s.TopicCreate) -> Topic:
        if body.parent_id and not db.get(Topic, body.parent_id):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "parent topic not found")
        if db.query(Topic.id).filter(func.lower(Topic.name) == body.name.lower()).first():
            raise HTTPException(status.HTTP_409_CONFLICT, "A topic with this name already exists")
        topic = Topic(name=body.name, slug=self._unique_slug(db, Topic, slugify(body.name)),
                      description=body.description, parent_id=body.parent_id)
        db.add(topic)
        db.commit()
        db.refresh(topic)
        return topic

    def update_topic(self, db: Session, topic_id: str, body: s.TopicUpdate) -> Topic:
        topic = db.get(Topic, topic_id)
        if not topic:
            raise _404("Topic")
        data = body.model_dump(exclude_unset=True)
        if "parent_id" in data and data["parent_id"]:
            if data["parent_id"] == topic.id or not db.get(Topic, data["parent_id"]):
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "invalid parent topic")
        if data.get("name"):
            clash = db.query(Topic.id).filter(func.lower(Topic.name) == data["name"].lower(), Topic.id != topic.id).first()
            if clash:
                raise HTTPException(status.HTTP_409_CONFLICT, "A topic with this name already exists")
            topic.name = data["name"]
            topic.slug = self._unique_slug(db, Topic, slugify(data["name"]), topic.id)
        if "description" in data:
            topic.description = data["description"]
        if "parent_id" in data:
            topic.parent_id = data["parent_id"]
        db.commit()
        db.refresh(topic)
        return topic

    def delete_topic(self, db: Session, topic_id: str) -> None:
        topic = db.get(Topic, topic_id)
        if not topic:
            raise _404("Topic")
        db.delete(topic)
        db.commit()

    def _topics_by_ids(self, db: Session, ids: List[str]) -> List[Topic]:
        topics = db.query(Topic).filter(Topic.id.in_(ids)).all() if ids else []
        if len(topics) != len(ids):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "One or more topic ids do not exist")
        return topics

    def _tag(self, db: Session, table, key_col: str, key_id: str, topic_ids: List[str]) -> List[Topic]:
        topics = self._topics_by_ids(db, topic_ids)
        db.execute(table.delete().where(table.c[key_col] == key_id))
        if topics:
            db.execute(table.insert(), [{key_col: key_id, "topic_id": t.id} for t in topics])
        db.commit()
        return topics

    def _tags(self, db: Session, table, key_col: str, key_id: str) -> List[Topic]:
        ids = [r[0] for r in db.execute(table.select().with_only_columns(table.c.topic_id).where(table.c[key_col] == key_id)).all()]
        return db.query(Topic).filter(Topic.id.in_(ids)).order_by(Topic.name).all() if ids else []

    def _course_or_404(self, db: Session, course_id: str) -> Course:
        course = db.get(Course, course_id)
        if not course:
            raise _404("Course")
        return course

    def _require_manager(self, course: Course, user: User) -> None:
        if not course_policy.is_course_manager(user, course):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the course instructor or a Super Admin can do this")

    def tag_course(self, db: Session, course_id: str, body: s.TopicTagRequest, user: User) -> List[Topic]:
        course = self._course_or_404(db, course_id)
        self._require_manager(course, user)
        return self._tag(db, course_topics, "course_id", course_id, body.topic_ids)

    def course_topics(self, db: Session, course_id: str) -> List[Topic]:
        course = self._course_or_404(db, course_id)
        if (course.status or "").lower() != "published":
            raise _404("Course")
        return self._tags(db, course_topics, "course_id", course_id)

    def tag_question(self, db: Session, question_id: str, body: s.TopicTagRequest, user: User) -> List[Topic]:
        question = db.get(Question, question_id)
        quiz = db.get(Quiz, question.quiz_id) if question else None
        section = db.get(Section, quiz.section_id) if quiz else None
        course = db.get(Course, section.course_id) if section else None
        if not course:
            raise _404("Question")
        self._require_manager(course, user)
        return self._tag(db, question_topics, "question_id", question_id, body.topic_ids)

    def tag_exercise(self, db: Session, exercise_id: str, body: s.TopicTagRequest, user: User) -> List[Topic]:
        exercise = db.get(CodingExercise, exercise_id)
        course = db.get(Course, exercise.course_id) if exercise else None
        if not course:
            raise _404("Exercise")
        self._require_manager(course, user)
        return self._tag(db, coding_exercise_topics, "exercise_id", exercise_id, body.topic_ids)

    # ================================================================== mastery
    def _bump(self, db: Session, user_id: str, topic_id: str, attempts: int, correct: int) -> None:
        row = db.query(UserTopicMastery).filter(UserTopicMastery.user_id == user_id, UserTopicMastery.topic_id == topic_id).first()
        if row is None:
            row = UserTopicMastery(user_id=user_id, topic_id=topic_id, attempts=0, correct=0, mastery_score=0.0)
            db.add(row)
        row.attempts = (row.attempts or 0) + attempts
        row.correct = (row.correct or 0) + correct
        row.mastery_score = round(100.0 * (row.correct + 1) / (row.attempts + 2), 1)   # smoothed: starts at 50
        row.last_practiced_at = datetime.utcnow()

    def record_quiz_attempt(self, db: Session, user_id: str, answers) -> None:
        """answers: iterable of QuizAttemptAnswer. Best effort."""
        try:
            by_question = {a.question_id: bool(a.is_correct) for a in answers}
            if not by_question:
                return
            rows = db.execute(question_topics.select().where(question_topics.c.question_id.in_(list(by_question)))).all()
            per_topic: Dict[str, List[int]] = {}
            for question_id, topic_id in rows:
                stats = per_topic.setdefault(topic_id, [0, 0])
                stats[0] += 1
                stats[1] += 1 if by_question[question_id] else 0
            for topic_id, (attempts, correct) in per_topic.items():
                self._bump(db, user_id, topic_id, attempts, correct)
            if per_topic:
                db.commit()
        except Exception:
            logger.exception("Could not update topic mastery")
            db.rollback()

    def record_coding_submit(self, db: Session, user_id: str, exercise_id: str, accepted: bool) -> None:
        try:
            topic_ids = [r[0] for r in db.execute(coding_exercise_topics.select().with_only_columns(coding_exercise_topics.c.topic_id)
                                                  .where(coding_exercise_topics.c.exercise_id == exercise_id)).all()]
            for topic_id in topic_ids:
                self._bump(db, user_id, topic_id, 1, 1 if accepted else 0)
            if topic_ids:
                db.commit()
        except Exception:
            logger.exception("Could not update topic mastery")
            db.rollback()

    def mastery(self, db: Session, user: User) -> List[s.MasteryResponse]:
        rows = (db.query(UserTopicMastery, Topic).join(Topic, Topic.id == UserTopicMastery.topic_id)
                .filter(UserTopicMastery.user_id == user.id).order_by(UserTopicMastery.mastery_score.asc()).all())
        return [s.MasteryResponse(topic_id=t.id, topic_name=t.name, attempts=m.attempts, correct=m.correct,
                                  mastery_score=m.mastery_score, last_practiced_at=m.last_practiced_at,
                                  is_weak=self._is_weak(m)) for m, t in rows]

    def _is_weak(self, m: UserTopicMastery) -> bool:
        return (m.attempts or 0) >= WEAK_MIN_ATTEMPTS and (m.mastery_score or 0) < WEAK_MASTERY

    def weak_topics(self, db: Session, user: User) -> List[s.MasteryResponse]:
        return [m for m in self.mastery(db, user) if m.is_weak]

    # ================================================================== goals
    def _course_progress(self, db: Session, user_id: str, course_id: str) -> Optional[int]:
        enrollment = db.query(Enrollment).filter(Enrollment.user_id == user_id, Enrollment.course_id == course_id,
                                                 Enrollment.status.in_(["ACTIVE", "COMPLETED"])).first()
        if enrollment is None:
            return None
        total = (db.query(func.count(Lecture.id)).join(Section, Section.id == Lecture.section_id)
                 .filter(Section.course_id == course_id).scalar() or 0)
        if enrollment.status == "COMPLETED":
            return 100
        if not total:
            return 0
        done = (db.query(func.count(Progress.id)).join(Lecture, Lecture.id == Progress.lecture_id)
                .join(Section, Section.id == Lecture.section_id)
                .filter(Progress.enrollment_id == enrollment.id, Progress.is_completed.is_(True), Section.course_id == course_id).scalar() or 0)
        return min(100, round(done * 100 / total))

    def _goal_view(self, db: Session, goal: LearningGoal) -> s.GoalResponse:
        view = s.GoalResponse.model_validate(goal)
        current: Optional[int] = None
        if goal.goal_type == "weekly_minutes" and goal.target_value:
            since = datetime.utcnow().date() - timedelta(days=6)
            current = int(db.query(func.coalesce(func.sum(LearningActivityDaily.minutes_learned), 0)).filter(
                LearningActivityDaily.user_id == goal.user_id, LearningActivityDaily.activity_date >= since).scalar() or 0)
            view.progress_percent = min(100, round(current * 100 / goal.target_value))
        elif goal.goal_type == "complete_course" and goal.course_id:
            current = self._course_progress(db, goal.user_id, goal.course_id) or 0
            view.progress_percent = current
        elif goal.goal_type == "master_topic" and goal.topic_id:
            row = db.query(UserTopicMastery).filter(UserTopicMastery.user_id == goal.user_id,
                                                    UserTopicMastery.topic_id == goal.topic_id).first()
            current = round(row.mastery_score) if row else 0
            view.progress_percent = min(100, round(current * 100 / (goal.target_value or 80)))
        elif goal.status == "completed":
            view.progress_percent = 100
        view.current_value = current
        return view

    def create_goal(self, db: Session, user: User, body: s.GoalCreate) -> s.GoalResponse:
        title = body.title
        if body.goal_type == "weekly_minutes":
            if not body.target_value:
                raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "target_value (minutes per week) is required")
            title = title or f"Learn {body.target_value} minutes a week"
        elif body.goal_type == "complete_course":
            course = db.get(Course, body.course_id) if body.course_id else None
            if not course:
                raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "course_id of an existing course is required")
            title = title or f"Complete {course.title}"
        elif body.goal_type == "master_topic":
            topic = db.get(Topic, body.topic_id) if body.topic_id else None
            if not topic:
                raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "topic_id of an existing topic is required")
            if body.target_value is not None and body.target_value > 100:
                raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "target_value is a mastery percentage (1-100)")
            title = title or f"Master {topic.name}"
            body.target_value = body.target_value or 80
        if not title:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "title is required for a custom goal")
        goal = LearningGoal(user_id=user.id, goal_type=body.goal_type, title=title, target_value=body.target_value,
                            course_id=body.course_id if body.goal_type == "complete_course" else None,
                            topic_id=body.topic_id if body.goal_type == "master_topic" else None, target_date=body.target_date)
        db.add(goal)
        db.commit()
        db.refresh(goal)
        return self._goal_view(db, goal)

    def list_goals(self, db: Session, user: User, status_filter: Optional[str]) -> List[s.GoalResponse]:
        q = db.query(LearningGoal).filter(LearningGoal.user_id == user.id)
        if status_filter:
            q = q.filter(LearningGoal.status == status_filter)
        goals = q.order_by(LearningGoal.created_at.desc()).all()
        views = []
        for goal in goals:
            view = self._goal_view(db, goal)
            if goal.status == "active" and goal.goal_type != "custom" and view.progress_percent >= 100:
                goal.status, goal.completed_at = "completed", datetime.utcnow()
                db.commit()
                view = self._goal_view(db, goal)
            views.append(view)
        return views

    def _own_goal(self, db: Session, goal_id: str, user: User) -> LearningGoal:
        goal = db.get(LearningGoal, goal_id)
        if not goal or goal.user_id != user.id:
            raise _404("Goal")
        return goal

    def update_goal(self, db: Session, goal_id: str, user: User, body: s.GoalUpdate) -> s.GoalResponse:
        goal = self._own_goal(db, goal_id, user)
        data = body.model_dump(exclude_unset=True)
        for key in ("title", "target_value", "target_date"):
            if key in data and data[key] is not None:
                setattr(goal, key, data[key])
        if data.get("status"):
            goal.status = data["status"]
            goal.completed_at = datetime.utcnow() if data["status"] == "completed" else None
        db.commit()
        db.refresh(goal)
        return self._goal_view(db, goal)

    def delete_goal(self, db: Session, goal_id: str, user: User) -> None:
        db.delete(self._own_goal(db, goal_id, user))
        db.commit()

    # ================================================================== learning paths
    def _path_courses(self, db: Session, path: LearningPath, user: Optional[User]) -> List[s.PathCourse]:
        out = []
        for link in path.courses:
            course = db.get(Course, link.course_id)
            if not course:
                continue
            progress = self._course_progress(db, user.id, course.id) if user else None
            out.append(s.PathCourse(course_id=course.id, title=course.title, thumbnail_url=course.thumbnail_url,
                                    order_index=link.order_index, status=course.status, enrolled=progress is not None,
                                    completed=progress == 100, progress_percent=progress or 0))
        return out

    def _path_view(self, db: Session, path: LearningPath, user: User, with_courses: bool = True) -> s.PathResponse:
        courses = self._path_courses(db, path, user)
        enrollment = db.query(LearningPathEnrollment).filter(LearningPathEnrollment.user_id == user.id,
                                                             LearningPathEnrollment.path_id == path.id).first()
        percent = round(sum(c.progress_percent for c in courses) / len(courses)) if courses else 0
        if enrollment and not enrollment.completed_at and courses and all(c.completed for c in courses):
            enrollment.completed_at = datetime.utcnow()
            db.commit()
        view = s.PathResponse(id=path.id, title=path.title, slug=path.slug, description=path.description, level=path.level,
                              status=path.status, course_count=len(courses), enrolled=enrollment is not None,
                              progress_percent=percent, completed_at=enrollment.completed_at if enrollment else None)
        if with_courses:
            view.courses = courses
        return view

    def _set_path_courses(self, db: Session, path: LearningPath, course_ids: List[str]) -> None:
        ids = list(dict.fromkeys(course_ids))
        found = {c.id for c in db.query(Course.id).filter(Course.id.in_(ids)).all()} if ids else set()
        if found != set(ids):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "One or more course ids do not exist")
        for link in list(path.courses):
            db.delete(link)
        db.flush()
        for index, course_id in enumerate(ids):
            db.add(LearningPathCourse(path_id=path.id, course_id=course_id, order_index=index))

    def create_path(self, db: Session, user: User, body: s.PathCreate) -> s.PathResponse:
        path = LearningPath(title=body.title, slug=self._unique_slug(db, LearningPath, slugify(body.title)),
                            description=body.description, level=body.level, created_by=user.id, status="draft")
        db.add(path)
        db.flush()
        self._set_path_courses(db, path, body.course_ids)
        db.commit()
        db.refresh(path)
        return self._path_view(db, path, user)

    def update_path(self, db: Session, path_id: str, user: User, body: s.PathUpdate) -> s.PathResponse:
        path = db.get(LearningPath, path_id)
        if not path:
            raise _404("Learning path")
        data = body.model_dump(exclude_unset=True)
        if data.get("title"):
            path.title = data["title"]
        for key in ("description", "level"):
            if key in data:
                setattr(path, key, data[key])
        if data.get("course_ids") is not None:
            self._set_path_courses(db, path, data["course_ids"])
        if data.get("status"):
            if data["status"] == "published":
                db.flush()
                db.refresh(path)
                unpublished = [l.course_id for l in path.courses
                               if (db.get(Course, l.course_id).status or "").lower() != "published"]
                if not path.courses or unpublished:
                    raise HTTPException(status.HTTP_409_CONFLICT, "A published path needs at least one course and all its courses must be published")
            path.status = data["status"]
        db.commit()
        db.refresh(path)
        return self._path_view(db, path, user)

    def delete_path(self, db: Session, path_id: str) -> None:
        path = db.get(LearningPath, path_id)
        if not path:
            raise _404("Learning path")
        db.delete(path)
        db.commit()

    def list_paths(self, db: Session, user: User, mine: bool = False, include_all: bool = False) -> List[s.PathResponse]:
        q = db.query(LearningPath)
        if not (include_all and user.role == "super_admin"):
            q = q.filter(LearningPath.status == "published")
        if mine:
            q = q.join(LearningPathEnrollment, LearningPathEnrollment.path_id == LearningPath.id).filter(
                LearningPathEnrollment.user_id == user.id)
        return [self._path_view(db, p, user, with_courses=False) for p in q.order_by(LearningPath.title).all()]

    def get_path(self, db: Session, path_id: str, user: User) -> s.PathResponse:
        path = db.get(LearningPath, path_id)
        if not path or (path.status != "published" and user.role != "super_admin"):
            raise _404("Learning path")
        return self._path_view(db, path, user)

    def enroll_path(self, db: Session, path_id: str, user: User) -> s.PathResponse:
        path = db.get(LearningPath, path_id)
        if not path or path.status != "published":
            raise _404("Learning path")
        if not db.query(LearningPathEnrollment.id).filter(LearningPathEnrollment.user_id == user.id,
                                                          LearningPathEnrollment.path_id == path_id).first():
            db.add(LearningPathEnrollment(user_id=user.id, path_id=path_id))
            db.commit()
        return self._path_view(db, path, user)

    def leave_path(self, db: Session, path_id: str, user: User) -> None:
        row = db.query(LearningPathEnrollment).filter(LearningPathEnrollment.user_id == user.id,
                                                      LearningPathEnrollment.path_id == path_id).first()
        if not row:
            raise _404("Path enrollment")
        db.delete(row)
        db.commit()

    # ================================================================== recommendations
    def _published_courses(self, db: Session):
        return db.query(Course).filter(func.lower(Course.status) == "published")

    def _candidates(self, db: Session, user: User) -> Dict[tuple, dict]:
        out: Dict[tuple, dict] = {}

        def offer(item_type: str, item_id: str, reason: str, score: float) -> None:
            key = (item_type, item_id)
            if key not in out or out[key]["score"] < score:
                out[key] = {"reason": reason, "score": score}

        enrollments = db.query(Enrollment).filter(Enrollment.user_id == user.id, Enrollment.status.in_(["ACTIVE", "COMPLETED"])).all()
        enrolled_ids = {e.course_id for e in enrollments}

        # 1. keep going
        active = sorted([e for e in enrollments if e.status == "ACTIVE"],
                        key=lambda e: e.last_accessed_at or e.enrolled_at or datetime.min, reverse=True)
        for rank, e in enumerate(active[:3]):
            course = db.get(Course, e.course_id)
            if course and course_policy.is_live_for_enrolled(course):
                progress = self._course_progress(db, user.id, e.course_id) or 0
                offer("course", e.course_id, f"Continue where you left off ({progress}% done)", 100 - rank)

        # 2. weak topics -> courses and exercises that practise them
        weak = self.weak_topics(db, user)
        for rank, w in enumerate(weak[:3]):
            course_ids = [r[0] for r in db.execute(course_topics.select().with_only_columns(course_topics.c.course_id)
                                                   .where(course_topics.c.topic_id == w.topic_id)).all()]
            for course in self._published_courses(db).filter(Course.id.in_(course_ids or [""])).all():
                if course.id not in enrolled_ids:
                    offer("course", course.id, f"Because you struggled with {w.topic_name}", 85 - rank)
            ex_ids = [r[0] for r in db.execute(coding_exercise_topics.select().with_only_columns(coding_exercise_topics.c.exercise_id)
                                               .where(coding_exercise_topics.c.topic_id == w.topic_id)).all()]
            if ex_ids:
                solved = {r[0] for r in db.query(CodingSubmission.exercise_id).filter(
                    CodingSubmission.user_id == user.id, CodingSubmission.status == "accepted", CodingSubmission.kind == "submit").all()}
                for ex in db.query(CodingExercise).filter(CodingExercise.id.in_(ex_ids), CodingExercise.status == "published",
                                                          CodingExercise.course_id.in_(enrolled_ids or [""])).all():
                    if ex.id not in solved:
                        offer("coding_exercise", ex.id, f"Practise {w.topic_name}", 88 - rank)

        # 3. next course in an enrolled learning path
        for pe in db.query(LearningPathEnrollment).filter(LearningPathEnrollment.user_id == user.id).all():
            path = db.get(LearningPath, pe.path_id)
            if not path or path.status != "published":
                continue
            for link in path.courses:
                if link.course_id not in enrolled_ids:
                    course = db.get(Course, link.course_id)
                    if course and (course.status or "").lower() == "published":
                        offer("course", course.id, f"Next in your path: {path.title}", 90)
                    break

        # 4. wishlist
        for item in db.query(WishlistItem).filter(WishlistItem.user_id == user.id).all():
            course = db.get(Course, item.course_id)
            if course and (course.status or "").lower() == "published" and course.id not in enrolled_ids:
                offer("course", course.id, "In your wishlist", 60)

        # 5. popular in categories I already study (or everywhere, for new learners)
        popularity = dict(db.query(Enrollment.course_id, func.count(Enrollment.id)).group_by(Enrollment.course_id).all())
        ratings = dict(db.query(Review.course_id, func.avg(Review.rating)).filter(Review.status == "visible").group_by(Review.course_id).all())
        category_ids = {c.category_id for c in db.query(Course).filter(Course.id.in_(enrolled_ids or [""])).all() if c.category_id}
        pool = self._published_courses(db).filter(~Course.id.in_(enrolled_ids or [""]))
        if category_ids:
            for course in pool.filter(Course.category_id.in_(category_ids)).all():
                cat = db.get(Category, course.category_id)
                offer("course", course.id, f"Popular in {cat.name if cat else 'your categories'}",
                      40 + min(popularity.get(course.id, 0), 20) + float(ratings.get(course.id) or 0) * 2)
        if not enrolled_ids:
            for course in pool.all():
                offer("course", course.id, "Popular on the platform",
                      30 + min(popularity.get(course.id, 0), 20) + float(ratings.get(course.id) or 0) * 2)
        return out

    def recommendations(self, db: Session, user: User, refresh: bool = False, limit: int = 10) -> List[s.RecommendationResponse]:
        rows = db.query(Recommendation).filter(Recommendation.user_id == user.id, Recommendation.dismissed_at.is_(None)).all()
        newest = max((r.created_at for r in rows if r.created_at), default=None)
        if refresh or not rows or newest is None or datetime.utcnow() - newest.replace(tzinfo=None) > RECOMMENDATION_TTL:
            self._regenerate(db, user)
        rows = (db.query(Recommendation).filter(Recommendation.user_id == user.id, Recommendation.dismissed_at.is_(None))
                .order_by(Recommendation.score.desc()).limit(limit).all())
        out = []
        for r in rows:
            title, thumb = self._item_label(db, r.item_type, r.item_id)
            if title is None:
                continue
            out.append(s.RecommendationResponse(id=r.id, item_type=r.item_type, item_id=r.item_id, title=title,
                                                thumbnail_url=thumb, reason=r.reason, score=r.score, source=r.source,
                                                created_at=r.created_at))
        return out

    def _regenerate(self, db: Session, user: User) -> None:
        recently_dismissed = {(r.item_type, r.item_id) for r in db.query(Recommendation).filter(
            Recommendation.user_id == user.id, Recommendation.dismissed_at >= datetime.utcnow() - timedelta(days=30)).all()}
        db.query(Recommendation).filter(Recommendation.user_id == user.id, Recommendation.dismissed_at.is_(None)).delete()
        for (item_type, item_id), info in sorted(self._candidates(db, user).items(), key=lambda kv: -kv[1]["score"])[:30]:
            if (item_type, item_id) in recently_dismissed:
                continue
            db.add(Recommendation(user_id=user.id, item_type=item_type, item_id=item_id, reason=info["reason"],
                                  score=round(info["score"], 1), source="rules"))
        db.commit()

    def _item_label(self, db: Session, item_type: str, item_id: str):
        if item_type == "course":
            course = db.get(Course, item_id)
            return (course.title, course.thumbnail_url) if course else (None, None)
        if item_type == "coding_exercise":
            ex = db.get(CodingExercise, item_id)
            return (ex.title, None) if ex else (None, None)
        if item_type == "learning_path":
            path = db.get(LearningPath, item_id)
            return (path.title, None) if path else (None, None)
        return (None, None)

    def mark(self, db: Session, rec_id: str, user: User, action: str) -> None:
        rec = db.get(Recommendation, rec_id)
        if not rec or rec.user_id != user.id:
            raise _404("Recommendation")
        if action == "click":
            rec.clicked_at = datetime.utcnow()
        else:
            rec.dismissed_at = datetime.utcnow()
        db.commit()


personalization_service = PersonalizationService()
