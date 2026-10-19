"""Read-only reporting: platform, instructor and per-course analytics."""
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.models import (
    Assignment, Category, Certificate, Course, Enrollment, Lecture, Progress, Question, Quiz,
    QuizAttempt, QuizAttemptAnswer, Review, Section, Submission, User,
)


def _pct(part: float, whole: float) -> float:
    return round(100.0 * part / whole, 1) if whole else 0.0


def _window(days: int):
    end = date.today()
    start = end - timedelta(days=days - 1)
    return start, end, datetime(start.year, start.month, start.day)


def _daily(db: Session, column, start_dt: datetime, *filters) -> Dict[str, int]:
    rows = (
        db.query(func.date(column), func.count())
        .filter(column >= start_dt, *filters)
        .group_by(func.date(column))
        .all()
    )
    return {str(d): int(n) for d, n in rows if d is not None}


def _series(start: date, end: date, **columns: Dict[str, int]) -> List[dict]:
    out, day = [], start
    while day <= end:
        key = day.isoformat()
        out.append({"date": key, **{name: data.get(key, 0) for name, data in columns.items()}})
        day += timedelta(days=1)
    return out


def _rating_map(db: Session, course_ids: List[str]) -> Dict[str, tuple]:
    if not course_ids:
        return {}
    rows = (
        db.query(Review.course_id, func.avg(Review.rating), func.count(Review.id))
        .filter(Review.course_id.in_(course_ids), Review.status == "visible")
        .group_by(Review.course_id)
        .all()
    )
    return {cid: (round(float(avg), 2), int(n)) for cid, avg, n in rows}


def _enrollment_counts(db: Session, course_ids: List[str]) -> Dict[str, dict]:
    if not course_ids:
        return {}
    rows = (
        db.query(
            Enrollment.course_id,
            func.count(Enrollment.id),
            func.sum(case((Enrollment.status == "COMPLETED", 1), else_=0)),
        )
        .filter(Enrollment.course_id.in_(course_ids))
        .group_by(Enrollment.course_id)
        .all()
    )
    return {
        cid: {"enrollments": int(total), "completed": int(done or 0), "active": int(total) - int(done or 0)}
        for cid, total, done in rows
    }


def _quiz_scores(db: Session, course_ids: List[str]) -> Dict[str, float]:
    if not course_ids:
        return {}
    rows = (
        db.query(Section.course_id, func.avg(QuizAttempt.score))
        .join(Quiz, Quiz.section_id == Section.id)
        .join(QuizAttempt, QuizAttempt.quiz_id == Quiz.id)
        .filter(Section.course_id.in_(course_ids))
        .group_by(Section.course_id)
        .all()
    )
    return {cid: round(float(avg), 1) for cid, avg in rows if avg is not None}


def _course_rows(db: Session, courses: List[Course]) -> List[dict]:
    ids = [c.id for c in courses]
    enr, ratings, scores = _enrollment_counts(db, ids), _rating_map(db, ids), _quiz_scores(db, ids)
    out = []
    for c in courses:
        e = enr.get(c.id, {"enrollments": 0, "completed": 0, "active": 0})
        avg, n = ratings.get(c.id, (None, 0))
        out.append({
            "course_id": c.id, "title": c.title, "status": (c.status or "").lower(),
            "instructor_id": c.instructor_id,
            "instructor_name": c.instructor.full_name if c.instructor else None,
            **e,
            "completion_rate": _pct(e["completed"], e["enrollments"]),
            "average_rating": avg, "review_count": n,
            "average_quiz_score": scores.get(c.id),
        })
    return out


class AnalyticsService:
    # ------------------------------------------------------------------ platform
    def platform(self, db: Session, days: int) -> dict:
        start, end, start_dt = _window(days)
        new_users = _daily(db, User.created_at, start_dt)
        enrolls = _daily(db, Enrollment.enrolled_at, start_dt)
        completions = _daily(db, Enrollment.completed_at, start_dt, Enrollment.status == "COMPLETED")
        certs = _daily(db, Certificate.issued_at, start_dt, Certificate.status == "issued")
        series = _series(start, end, new_users=new_users, enrollments=enrolls, completions=completions, certificates=certs)

        courses = db.query(Course).filter(func.lower(Course.status) == "published").all()
        rows = _course_rows(db, courses)
        top_courses = sorted(rows, key=lambda r: (-r["enrollments"], r["title"]))[:5]

        cat_rows = (
            db.query(Category.id, Category.name, func.count(func.distinct(Course.id)), func.count(Enrollment.id))
            .outerjoin(Course, (Course.category_id == Category.id) & (func.lower(Course.status) == "published"))
            .outerjoin(Enrollment, Enrollment.course_id == Course.id)
            .group_by(Category.id, Category.name)
            .all()
        )
        categories = sorted(
            [{"category_id": i, "name": n, "courses": int(c), "enrollments": int(e)} for i, n, c, e in cat_rows],
            key=lambda r: (-r["enrollments"], r["name"]),
        )

        by_instr: Dict[str, dict] = {}
        for r in rows:
            if not r["instructor_id"]:
                continue
            d = by_instr.setdefault(r["instructor_id"], {"instructor_id": r["instructor_id"],
                                                         "name": r["instructor_name"], "courses": 0, "enrollments": 0})
            d["courses"] += 1
            d["enrollments"] += r["enrollments"]
        top_instructors = sorted(by_instr.values(), key=lambda r: (-r["enrollments"], r["name"] or ""))[:5]

        return {
            "period": {"days": days, "from": start.isoformat(), "to": end.isoformat()},
            "totals_in_period": {k: sum(p[k] for p in series) for k in ("new_users", "enrollments", "completions", "certificates")},
            "series": series,
            "top_courses": top_courses,
            "categories": categories,
            "top_instructors": top_instructors,
        }

    # ------------------------------------------------------------------ instructor
    def instructor(self, db: Session, instructor_id: str, days: int) -> dict:
        start, end, start_dt = _window(days)
        courses = db.query(Course).filter(Course.instructor_id == instructor_id).order_by(Course.created_at.desc()).all()
        ids = [c.id for c in courses]
        rows = _course_rows(db, courses)

        total_enr = sum(r["enrollments"] for r in rows)
        completed = sum(r["completed"] for r in rows)
        rated = [(r["average_rating"], r["review_count"]) for r in rows if r["review_count"]]
        n_reviews = sum(n for _, n in rated)
        avg_rating = round(sum(a * n for a, n in rated) / n_reviews, 2) if n_reviews else None
        certificates = db.query(func.count(Certificate.id)).filter(
            Certificate.course_id.in_(ids), Certificate.status == "issued").scalar() if ids else 0

        enrolls = _daily(db, Enrollment.enrolled_at, start_dt, Enrollment.course_id.in_(ids)) if ids else {}
        done = _daily(db, Enrollment.completed_at, start_dt, Enrollment.course_id.in_(ids),
                      Enrollment.status == "COMPLETED") if ids else {}
        return {
            "period": {"days": days, "from": start.isoformat(), "to": end.isoformat()},
            "summary": {
                "courses": len(courses),
                "published_courses": sum(1 for r in rows if r["status"] == "published"),
                "total_enrollments": total_enr,
                "active_learners": total_enr - completed,
                "completions": completed,
                "completion_rate": _pct(completed, total_enr),
                "average_rating": avg_rating,
                "review_count": n_reviews,
                "certificates_issued": int(certificates or 0),
            },
            "series": _series(start, end, enrollments=enrolls, completions=done),
            "courses": rows,
        }

    # ------------------------------------------------------------------ one course
    def course(self, db: Session, course_id: str, days: int, viewer: User) -> dict:
        course = db.query(Course).filter(Course.id == course_id).first()
        if course is None or (viewer.role == "instructor" and course.instructor_id != viewer.id):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Course not found")
        start, end, start_dt = _window(days)

        row = _course_rows(db, [course])[0]
        lectures = (
            db.query(Lecture, Section.title, Section.order_index)
            .join(Section, Lecture.section_id == Section.id)
            .filter(Section.course_id == course.id)
            .order_by(Section.order_index, Lecture.order_index)
            .all()
        )
        done_by_lecture = dict(
            db.query(Progress.lecture_id, func.count(Progress.id))
            .join(Enrollment, Enrollment.id == Progress.enrollment_id)
            .filter(Enrollment.course_id == course.id, Progress.is_completed.is_(True))
            .group_by(Progress.lecture_id).all()
        )
        n_enr = row["enrollments"]
        lecture_rows = [
            {
                "lecture_id": lec.id, "title": lec.title, "section_title": sec_title,
                "completed_by": int(done_by_lecture.get(lec.id, 0)),
                "completion_rate": _pct(done_by_lecture.get(lec.id, 0), n_enr),
            }
            for lec, sec_title, _ in lectures
        ]
        total_done = sum(r["completed_by"] for r in lecture_rows)
        avg_progress = _pct(total_done, n_enr * len(lecture_rows)) if lecture_rows else 0.0

        quizzes = []
        for quiz in db.query(Quiz).join(Section, Quiz.section_id == Section.id).filter(Section.course_id == course.id).all():
            attempts = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz.id).all()
            per_q = {
                qid: (int(answered), int(correct or 0))
                for qid, answered, correct in db.query(
                    QuizAttemptAnswer.question_id, func.count(QuizAttemptAnswer.id),
                    func.sum(case((QuizAttemptAnswer.is_correct.is_(True), 1), else_=0)),
                ).join(QuizAttempt, QuizAttempt.id == QuizAttemptAnswer.attempt_id)
                .filter(QuizAttempt.quiz_id == quiz.id).group_by(QuizAttemptAnswer.question_id).all()
            }
            questions = [
                {"question_id": q.id, "prompt": q.prompt,
                 "answered": per_q.get(q.id, (0, 0))[0],
                 "correct_rate": _pct(per_q.get(q.id, (0, 0))[1], per_q.get(q.id, (0, 0))[0])}
                for q in db.query(Question).filter(Question.quiz_id == quiz.id).order_by(Question.order_index).all()
            ]
            quizzes.append({
                "quiz_id": quiz.id, "title": quiz.title, "attempts": len(attempts),
                "learners": len({a.user_id for a in attempts}),
                "average_score": round(sum(a.score for a in attempts) / len(attempts), 1) if attempts else None,
                "pass_rate": _pct(sum(1 for a in attempts if a.passed), len(attempts)),
                "questions": questions,
            })

        assignments = []
        for asg in db.query(Assignment).join(Section, Assignment.section_id == Section.id).filter(Section.course_id == course.id).all():
            subs = db.query(Submission).filter(Submission.assignment_id == asg.id).all()
            graded = sum(1 for s in subs if s.status == "graded")
            assignments.append({
                "assignment_id": asg.id, "title": asg.title, "submissions": len(subs), "graded": graded,
                "pending_grading": len(subs) - graded,
                "resubmissions": sum(s.resubmission_count or 0 for s in subs),
            })

        dist = {str(i): 0 for i in range(1, 6)}
        for rating, n in db.query(Review.rating, func.count(Review.id)).filter(
                Review.course_id == course.id, Review.status == "visible").group_by(Review.rating).all():
            dist[str(rating)] = int(n)
        certificates = db.query(func.count(Certificate.id)).filter(
            Certificate.course_id == course.id, Certificate.status == "issued").scalar()

        return {
            "course": {"id": course.id, "title": course.title, "status": row["status"]},
            "period": {"days": days, "from": start.isoformat(), "to": end.isoformat()},
            "summary": {
                "enrollments": n_enr, "active": row["active"], "completed": row["completed"],
                "completion_rate": row["completion_rate"], "average_progress_percent": avg_progress,
                "average_rating": row["average_rating"], "review_count": row["review_count"],
                "certificates_issued": int(certificates or 0),
            },
            "series": _series(
                start, end,
                enrollments=_daily(db, Enrollment.enrolled_at, start_dt, Enrollment.course_id == course.id),
                completions=_daily(db, Enrollment.completed_at, start_dt, Enrollment.course_id == course.id,
                                   Enrollment.status == "COMPLETED"),
            ),
            "lectures": lecture_rows,
            "quizzes": quizzes,
            "assignments": assignments,
            "rating_distribution": dist,
        }


analytics_service = AnalyticsService()
