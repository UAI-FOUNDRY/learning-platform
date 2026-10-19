from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_role
from app.database.session import get_db
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.gamification import (
    ActivityDay, BadgeAdminResponse, BadgeCreate, BadgeStatus, BadgeUpdate, GamificationSummary,
    LeaderboardResponse, PointsAdjustRequest, PointTransactionResponse,
)
from app.services.gamification_service import gamification_service

router = APIRouter()


@router.get("/me", response_model=GamificationSummary)
def my_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Points, level, rank, badge count and streaks for the logged-in user."""
    return gamification_service.summary(db, current_user)


@router.get("/me/points", response_model=List[PointTransactionResponse])
def my_points(limit: int = Query(50, ge=1, le=200), skip: int = Query(0, ge=0),
              db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Points history, newest first."""
    return gamification_service.points_history(db, current_user, skip, limit)


@router.get("/me/badges", response_model=List[BadgeStatus])
def my_badges(earned_only: bool = False, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Every badge with whether I earned it (and when). `earned_only=true` for the trophy shelf."""
    rows = gamification_service.badges_for(db, current_user.id)
    return [r for r in rows if r["earned"]] if earned_only else rows


@router.get("/me/activity", response_model=List[ActivityDay])
def my_activity(days: int = Query(30, ge=7, le=180), db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    """One entry per day for the activity chart (zeros for quiet days)."""
    return gamification_service.activity(db, current_user, days)


@router.get("/leaderboard", response_model=LeaderboardResponse)
def leaderboard(period: str = Query("all", pattern="^(all|week|month)$"), limit: int = Query(20, ge=1, le=100),
                db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Top learners by points, plus my own rank. Only active learners appear."""
    return gamification_service.leaderboard(db, current_user, period, limit)


# ------------------------------------------------------------------ Super Admin
@router.get("/badges", response_model=List[BadgeAdminResponse])
def all_badges(db: Session = Depends(get_db), current_user: User = Depends(require_role("super_admin"))):
    return gamification_service.list_all_badges(db)


@router.post("/badges", response_model=BadgeAdminResponse, status_code=201)
def create_badge(body: BadgeCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role("super_admin"))):
    """Create a badge. criteria example: {"event": "course_completed", "count": 3} (events: lecture_completed,
    quiz_passed, quiz_score, course_completed, certificate_issued, exercise_solved, answer_highlighted,
    learning_streak, coding_streak)."""
    return gamification_service.create_badge(db, body.model_dump(), current_user)


@router.put("/badges/{badge_id}", response_model=BadgeAdminResponse)
def update_badge(badge_id: str, body: BadgeUpdate, db: Session = Depends(get_db),
                 current_user: User = Depends(require_role("super_admin"))):
    return gamification_service.update_badge(db, badge_id, body.model_dump(exclude_unset=True))


@router.delete("/badges/{badge_id}", response_model=MessageResponse)
def delete_badge(badge_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_role("super_admin"))):
    """Deletes a badge nobody has earned; a badge that was already earned is switched off instead."""
    gamification_service.delete_badge(db, badge_id)
    return MessageResponse(message="Badge removed")


@router.post("/adjust", response_model=GamificationSummary)
def adjust_points(body: PointsAdjustRequest, db: Session = Depends(get_db),
                  current_user: User = Depends(require_role("super_admin"))):
    """Add or remove points for a user (a correction or a reward). Recorded in the audit log."""
    return gamification_service.adjust(db, current_user, body.user_id, body.points, body.reason)


@router.post("/backfill")
def backfill(db: Session = Depends(get_db), current_user: User = Depends(require_role("super_admin"))):
    """Award points for lectures, courses, quizzes and certificates completed before gamification was added."""
    return gamification_service.backfill(db)
