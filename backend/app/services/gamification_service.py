"""Points, levels, streaks, badges and the leaderboard.

Other services call `record(...)` (points + badges) and `touch_activity(...)` (daily activity + streak) when a
learner does something. Both are best-effort: a problem here never breaks the learner's action.
A repeated event (completing the same lecture twice) never earns points twice.
"""
import logging
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.certificate import Certificate
from app.models.enrollment import Enrollment
from app.models.gamification import Badge, PointTransaction, UserBadge, UserStreak
from app.models.personalization import LearningActivityDaily
from app.models.progress import Progress
from app.models.quiz_attempt import QuizAttempt
from app.models.user import User
from app.services.audit_service import audit_service
from app.services.notification_service import notification_service
from app.services.platform_settings_service import get_setting

logger = logging.getLogger(__name__)

POINTS: Dict[str, int] = {
    "lecture_completed": 10,
    "quiz_passed": 20,
    "course_completed": 100,
    "certificate_issued": 50,
    "exercise_solved": 25,
    "answer_highlighted": 15,
}
BADGE_EVENTS = set(POINTS) | {"quiz_score", "learning_streak", "coding_streak"}
BADGE_CATEGORIES = ("learning", "coding", "quiz", "community", "milestone", "skill")


def level_for(points: int) -> dict:
    """Level n starts at 100*(n-1)^2 points: 0, 100, 400, 900, 1600 ..."""
    points = max(points, 0)
    level = int((points / 100) ** 0.5) + 1
    floor, ceiling = 100 * (level - 1) ** 2, 100 * level ** 2
    return {"level": level, "level_start_points": floor, "next_level_points": ceiling,
            "points_to_next_level": ceiling - points,
            "level_progress_percent": round((points - floor) * 100 / (ceiling - floor))}


class GamificationService:
    # ------------------------------------------------------------------ switches
    def enabled(self, db: Session) -> bool:
        return bool(get_setting(db, "gamification.enabled", True))

    # ------------------------------------------------------------------ writing
    def record(self, db: Session, user_id: Optional[str], event: str, source_id: Optional[str] = None,
               source_type: Optional[str] = None, score: Optional[int] = None) -> int:
        """Give points for an event once per (event, source) and check badges. Returns the points added."""
        if not user_id or event not in POINTS or not self.enabled(db):
            return 0
        try:
            if source_id is not None and db.query(PointTransaction.id).filter(
                PointTransaction.user_id == user_id, PointTransaction.reason == event,
                PointTransaction.source_id == source_id,
            ).first():
                added = 0
            else:
                db.add(PointTransaction(user_id=user_id, points=POINTS[event], reason=event,
                                        source_type=source_type, source_id=source_id))
                db.commit()
                added = POINTS[event]
                self._add_daily(db, user_id, points_earned=added)
            self._check_badges(db, user_id, event, score)
            if score is not None:
                self._check_badges(db, user_id, "quiz_score", score)
            return added
        except Exception:
            logger.exception("Gamification could not record %s for %s", event, user_id)
            db.rollback()
            return 0

    def touch_activity(self, db: Session, user_id: Optional[str], streak_type: str = "learning", minutes: int = 0,
                       lectures: int = 0, quizzes: int = 0, coding_submissions: int = 0, exercises: int = 0) -> None:
        """Count today's activity and extend the learner's streak."""
        if not user_id or not self.enabled(db):
            return
        try:
            nothing_to_add = not (minutes or lectures or quizzes or coding_submissions or exercises)
            if nothing_to_add:   # cheap path for frequent "still watching" updates
                streak = db.query(UserStreak).filter(UserStreak.user_id == user_id, UserStreak.streak_type == streak_type).first()
                if streak is not None and streak.last_activity_date == datetime.utcnow().date():
                    return
            self._add_daily(db, user_id, minutes_learned=minutes, lectures_completed=lectures, quizzes_taken=quizzes,
                            coding_submissions=coding_submissions, exercises_solved=exercises)
            self._extend_streak(db, user_id, streak_type)
            if streak_type == "coding":
                self._check_badges(db, user_id, "coding_streak", None)
            else:
                self._check_badges(db, user_id, "learning_streak", None)
        except Exception:
            logger.exception("Gamification could not update activity for %s", user_id)
            db.rollback()

    def adjust(self, db: Session, actor: User, user_id: str, points: int, reason: str) -> dict:
        """Super Admin correction (positive or negative) with an audit trail."""
        target = db.get(User, user_id)
        if not target:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
        reason = (reason or "").strip()
        if not reason:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "reason is required")
        if points == 0 or abs(points) > 100000:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "points must be a non-zero whole number up to 100000")
        db.add(PointTransaction(user_id=user_id, points=points, reason="admin_adjustment", source_type="admin",
                                source_id=actor.id))
        audit_service.log(db, actor, "gamification.points_adjusted", "user", user_id, {"points": points, "reason": reason})
        db.commit()
        return self.summary(db, target)

    # ------------------------------------------------------------------ internals
    def _add_daily(self, db: Session, user_id: str, **increments: int) -> None:
        today = datetime.utcnow().date()
        row = db.query(LearningActivityDaily).filter(
            LearningActivityDaily.user_id == user_id, LearningActivityDaily.activity_date == today).first()
        if row is None:
            row = LearningActivityDaily(user_id=user_id, activity_date=today)
            db.add(row)
            db.flush()
        for field, value in increments.items():
            if value:
                setattr(row, field, (getattr(row, field) or 0) + value)
        db.commit()

    def _extend_streak(self, db: Session, user_id: str, streak_type: str) -> UserStreak:
        today = datetime.utcnow().date()
        streak = db.query(UserStreak).filter(UserStreak.user_id == user_id, UserStreak.streak_type == streak_type).first()
        if streak is None:
            streak = UserStreak(user_id=user_id, streak_type=streak_type, current_length=0, longest_length=0)
            db.add(streak)
        last = streak.last_activity_date
        if last == today:
            pass
        elif last == today - timedelta(days=1):
            streak.current_length = (streak.current_length or 0) + 1
        else:
            streak.current_length = 1
        streak.last_activity_date = today
        streak.longest_length = max(streak.longest_length or 0, streak.current_length or 0)
        db.commit()
        return streak

    def _count(self, db: Session, user_id: str, reason: str) -> int:
        return db.query(func.count(PointTransaction.id)).filter(
            PointTransaction.user_id == user_id, PointTransaction.reason == reason).scalar() or 0

    def _check_badges(self, db: Session, user_id: str, event: str, score: Optional[int]) -> None:
        owned = {b for (b,) in db.query(UserBadge.badge_id).filter(UserBadge.user_id == user_id).all()}
        badges = db.query(Badge).filter(Badge.is_active.is_(True)).all()
        for badge in badges:
            criteria = badge.criteria or {}
            if badge.id in owned or criteria.get("event") != event:
                continue
            if self._earned(db, user_id, criteria, score):
                self._award(db, user_id, badge)

    def _earned(self, db: Session, user_id: str, criteria: dict, score: Optional[int]) -> bool:
        event = criteria.get("event")
        if event == "quiz_score":
            return score is not None and score >= int(criteria.get("min_score", 100))
        if event in ("learning_streak", "coding_streak"):
            kind = "coding" if event == "coding_streak" else "learning"
            streak = db.query(UserStreak).filter(UserStreak.user_id == user_id, UserStreak.streak_type == kind).first()
            return bool(streak and (streak.current_length or 0) >= int(criteria.get("days", 7)))
        return self._count(db, user_id, event) >= int(criteria.get("count", 1))

    def _award(self, db: Session, user_id: str, badge: Badge) -> None:
        try:
            db.add(UserBadge(user_id=user_id, badge_id=badge.id))
            if badge.points:
                db.add(PointTransaction(user_id=user_id, points=badge.points, reason="badge",
                                        source_type="badge", source_id=badge.id))
            db.commit()
        except Exception:   # already awarded by a concurrent request
            db.rollback()
            return
        notification_service.notify(db, user_id, "badge_earned", f"Badge earned: {badge.name}",
                                    badge.description, "/profile/badges", {"badge_id": badge.id, "code": badge.code})

    # ------------------------------------------------------------------ reading
    def total_points(self, db: Session, user_id: str) -> int:
        return int(db.query(func.coalesce(func.sum(PointTransaction.points), 0))
                   .filter(PointTransaction.user_id == user_id).scalar() or 0)

    def rank_of(self, db: Session, user_id: str, total: int) -> int:
        higher = (db.query(PointTransaction.user_id).join(User, User.id == PointTransaction.user_id)
                  .filter(User.role == "learner").group_by(PointTransaction.user_id)
                  .having(func.sum(PointTransaction.points) > total).count())
        return higher + 1

    def summary(self, db: Session, user: User) -> dict:
        total = self.total_points(db, user.id)
        streaks = {s.streak_type: s for s in db.query(UserStreak).filter(UserStreak.user_id == user.id).all()}
        today = datetime.utcnow().date()

        def streak_view(kind: str) -> dict:
            s = streaks.get(kind)
            if not s:
                return {"current": 0, "longest": 0, "last_activity_date": None, "active_today": False}
            alive = s.last_activity_date in (today, today - timedelta(days=1))
            return {"current": (s.current_length or 0) if alive else 0, "longest": s.longest_length or 0,
                    "last_activity_date": s.last_activity_date, "active_today": s.last_activity_date == today}

        return {
            "user_id": user.id, "total_points": total, **level_for(total),
            "rank": self.rank_of(db, user.id, total) if total > 0 else None,
            "badges_earned": db.query(UserBadge).filter(UserBadge.user_id == user.id).count(),
            "learning_streak": streak_view("learning"), "coding_streak": streak_view("coding"),
        }

    def points_history(self, db: Session, user: User, skip: int, limit: int) -> List[PointTransaction]:
        return (db.query(PointTransaction).filter(PointTransaction.user_id == user.id)
                .order_by(PointTransaction.created_at.desc()).offset(skip).limit(limit).all())

    def badges_for(self, db: Session, user_id: str) -> List[dict]:
        earned = {ub.badge_id: ub.awarded_at for ub in db.query(UserBadge).filter(UserBadge.user_id == user_id).all()}
        out = []
        for badge in db.query(Badge).filter(Badge.is_active.is_(True)).order_by(Badge.category, Badge.points).all():
            out.append({"id": badge.id, "code": badge.code, "name": badge.name, "description": badge.description,
                        "icon_url": badge.icon_url, "category": badge.category, "points": badge.points,
                        "earned": badge.id in earned, "awarded_at": earned.get(badge.id)})
        return out

    def activity(self, db: Session, user: User, days: int) -> List[dict]:
        since = datetime.utcnow().date() - timedelta(days=days - 1)
        rows = {r.activity_date: r for r in db.query(LearningActivityDaily).filter(
            LearningActivityDaily.user_id == user.id, LearningActivityDaily.activity_date >= since).all()}
        out = []
        for i in range(days):
            day = since + timedelta(days=i)
            r = rows.get(day)
            out.append({"date": day, "minutes_learned": r.minutes_learned if r else 0,
                        "lectures_completed": r.lectures_completed if r else 0, "quizzes_taken": r.quizzes_taken if r else 0,
                        "coding_submissions": r.coding_submissions if r else 0, "exercises_solved": r.exercises_solved if r else 0,
                        "points_earned": r.points_earned if r else 0})
        return out

    def leaderboard(self, db: Session, user: User, period: str, limit: int) -> dict:
        if not get_setting(db, "gamification.leaderboard_enabled", True) and user.role != "super_admin":
            raise HTTPException(status.HTTP_403_FORBIDDEN, "The leaderboard is turned off")
        since: Optional[datetime] = None
        if period == "week":
            since = datetime.utcnow() - timedelta(days=7)
        elif period == "month":
            since = datetime.utcnow() - timedelta(days=30)
        q = (db.query(User.id, User.full_name, User.avatar_url, func.sum(PointTransaction.points).label("pts"))
             .join(PointTransaction, PointTransaction.user_id == User.id)
             .filter(User.role == "learner", User.status == "active"))
        if since is not None:
            q = q.filter(PointTransaction.created_at >= since)
        rows = q.group_by(User.id, User.full_name, User.avatar_url).having(func.sum(PointTransaction.points) > 0) \
                .order_by(func.sum(PointTransaction.points).desc(), User.full_name).limit(limit).all()
        entries = [{"rank": i + 1, "user_id": r.id, "full_name": r.full_name, "avatar_url": r.avatar_url,
                    "points": int(r.pts), "is_me": r.id == user.id, **{"level": level_for(int(r.pts))["level"]}}
                   for i, r in enumerate(rows)]
        me = None
        if user.role == "learner":
            mine = db.query(func.coalesce(func.sum(PointTransaction.points), 0)).filter(PointTransaction.user_id == user.id)
            if since is not None:
                mine = mine.filter(PointTransaction.created_at >= since)
            my_points = int(mine.scalar() or 0)
            if my_points > 0:
                q2 = (db.query(PointTransaction.user_id).join(User, User.id == PointTransaction.user_id)
                      .filter(User.role == "learner", User.status == "active"))
                if since is not None:
                    q2 = q2.filter(PointTransaction.created_at >= since)
                higher = q2.group_by(PointTransaction.user_id).having(func.sum(PointTransaction.points) > my_points).count()
                me = {"rank": higher + 1, "points": my_points, "level": level_for(my_points)["level"]}
        return {"period": period, "entries": entries, "me": me}

    # ------------------------------------------------------------------ badge administration
    def _validate_criteria(self, criteria: Optional[dict]) -> dict:
        if not isinstance(criteria, dict) or criteria.get("event") not in BADGE_EVENTS:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                                "criteria.event must be one of: " + ", ".join(sorted(BADGE_EVENTS)))
        for key in ("count", "days", "min_score"):
            if key in criteria and (isinstance(criteria[key], bool) or not isinstance(criteria[key], int) or criteria[key] < 1):
                raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"criteria.{key} must be a whole number of 1 or more")
        return criteria

    def create_badge(self, db: Session, data: dict, actor: User) -> Badge:
        code = (data["code"] or "").strip().lower()
        if db.query(Badge).filter(Badge.code == code).first():
            raise HTTPException(status.HTTP_409_CONFLICT, "A badge with this code already exists")
        badge = Badge(code=code, name=data["name"], description=data.get("description"), icon_url=data.get("icon_url"),
                      category=data.get("category") or "milestone", points=data.get("points") or 0,
                      criteria=self._validate_criteria(data.get("criteria")), is_active=data.get("is_active", True))
        db.add(badge)
        db.commit()
        db.refresh(badge)
        return badge

    def update_badge(self, db: Session, badge_id: str, data: dict) -> Badge:
        badge = db.get(Badge, badge_id)
        if not badge:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Badge not found")
        for field in ("name", "description", "icon_url", "category", "points", "is_active"):
            if field in data and data[field] is not None:
                setattr(badge, field, data[field])
        if data.get("criteria") is not None:
            badge.criteria = self._validate_criteria(data["criteria"])
        db.commit()
        db.refresh(badge)
        return badge

    def delete_badge(self, db: Session, badge_id: str) -> None:
        badge = db.get(Badge, badge_id)
        if not badge:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Badge not found")
        if db.query(UserBadge).filter(UserBadge.badge_id == badge_id).first():
            badge.is_active = False       # keep what learners already earned
        else:
            db.delete(badge)
        db.commit()

    def list_all_badges(self, db: Session) -> List[Badge]:
        return db.query(Badge).order_by(Badge.category, Badge.code).all()

    # ------------------------------------------------------------------ backfill
    def backfill(self, db: Session) -> dict:
        """Give points for things learners did before gamification existed (safe to run repeatedly)."""
        counts = {"lecture_completed": 0, "course_completed": 0, "quiz_passed": 0, "certificate_issued": 0}
        for user_id, lecture_id in (db.query(Enrollment.user_id, Progress.lecture_id)
                                      .join(Progress, Progress.enrollment_id == Enrollment.id)
                                      .filter(Progress.is_completed.is_(True)).all()):
            counts["lecture_completed"] += 1 if self.record(db, user_id, "lecture_completed", lecture_id, "lecture") else 0
        for user_id, course_id in db.query(Enrollment.user_id, Enrollment.course_id).filter(Enrollment.status == "COMPLETED").all():
            counts["course_completed"] += 1 if self.record(db, user_id, "course_completed", course_id, "course") else 0
        passed = (db.query(QuizAttempt.user_id, QuizAttempt.quiz_id, func.max(QuizAttempt.score))
                  .filter(QuizAttempt.passed.is_(True)).group_by(QuizAttempt.user_id, QuizAttempt.quiz_id).all())
        for user_id, quiz_id, best in passed:
            counts["quiz_passed"] += 1 if self.record(db, user_id, "quiz_passed", quiz_id, "quiz", score=best) else 0
        for user_id, cert_id in db.query(Certificate.user_id, Certificate.id).filter(Certificate.status == "issued").all():
            counts["certificate_issued"] += 1 if self.record(db, user_id, "certificate_issued", cert_id, "certificate") else 0
        return counts


gamification_service = GamificationService()
