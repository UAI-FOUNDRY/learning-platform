from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_role
from app.database.session import get_db
from app.models.user import User
from app.schemas import personalization as s
from app.schemas.common import MessageResponse
from app.services.personalization_service import personalization_service as svc

router = APIRouter()           # /api/v1/personalization
recommendations_router = APIRouter()   # /api/v1/recommendations


# ------------------------------------------------------------------ topics
@router.get("/topics", response_model=List[s.TopicResponse])
def list_topics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Skills / concepts used to tag courses, quiz questions and coding exercises."""
    return svc.list_topics(db)


@router.post("/topics", response_model=s.TopicResponse, status_code=201)
def create_topic(body: s.TopicCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role("super_admin"))):
    return svc.create_topic(db, body)


@router.put("/topics/{topic_id}", response_model=s.TopicResponse)
def update_topic(topic_id: str, body: s.TopicUpdate, db: Session = Depends(get_db),
                 current_user: User = Depends(require_role("super_admin"))):
    return svc.update_topic(db, topic_id, body)


@router.delete("/topics/{topic_id}", response_model=MessageResponse)
def delete_topic(topic_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_role("super_admin"))):
    svc.delete_topic(db, topic_id)
    return MessageResponse(message="Topic deleted")


@router.get("/courses/{course_id}/topics", response_model=List[s.TopicResponse])
def course_topics(course_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return svc.course_topics(db, course_id)


@router.put("/courses/{course_id}/topics", response_model=List[s.TopicResponse])
def tag_course(course_id: str, body: s.TopicTagRequest, db: Session = Depends(get_db),
               current_user: User = Depends(get_current_user)):
    """Replace the topics of a course (course instructor / Super Admin)."""
    return svc.tag_course(db, course_id, body, current_user)


@router.put("/questions/{question_id}/topics", response_model=List[s.TopicResponse])
def tag_question(question_id: str, body: s.TopicTagRequest, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    """Tag a quiz question so wrong answers count against the topic (course instructor / Super Admin)."""
    return svc.tag_question(db, question_id, body, current_user)


@router.put("/exercises/{exercise_id}/topics", response_model=List[s.TopicResponse])
def tag_exercise(exercise_id: str, body: s.TopicTagRequest, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    return svc.tag_exercise(db, exercise_id, body, current_user)


# ------------------------------------------------------------------ mastery
@router.get("/mastery/me", response_model=List[s.MasteryResponse])
def my_mastery(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """My score (0-100) for every topic I practised, weakest first."""
    return svc.mastery(db, current_user)


@router.get("/weak-topics/me", response_model=List[s.MasteryResponse])
def my_weak_topics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Topics I have practised at least 3 times and score below 60 on."""
    return svc.weak_topics(db, current_user)


# ------------------------------------------------------------------ goals
@router.post("/goals", response_model=s.GoalResponse, status_code=201)
def create_goal(body: s.GoalCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """goal_type: weekly_minutes (target_value), complete_course (course_id), master_topic (topic_id, target_value %), custom (title)."""
    return svc.create_goal(db, current_user, body)


@router.get("/goals", response_model=List[s.GoalResponse])
def list_goals(status: Optional[str] = Query(None, pattern="^(active|completed|abandoned)$"),
               db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """My goals with live progress. Goals that reach 100% are marked completed automatically."""
    return svc.list_goals(db, current_user, status)


@router.put("/goals/{goal_id}", response_model=s.GoalResponse)
def update_goal(goal_id: str, body: s.GoalUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return svc.update_goal(db, goal_id, current_user, body)


@router.delete("/goals/{goal_id}", response_model=MessageResponse)
def delete_goal(goal_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    svc.delete_goal(db, goal_id, current_user)
    return MessageResponse(message="Goal deleted")


# ------------------------------------------------------------------ learning paths
@router.get("/paths", response_model=List[s.PathResponse])
def list_paths(mine: bool = False, all: bool = Query(False, description="Super Admin: include drafts and archived"),
               db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Published learning paths with my progress. `mine=true` for the paths I joined."""
    return svc.list_paths(db, current_user, mine, all)


@router.post("/paths", response_model=s.PathResponse, status_code=201)
def create_path(body: s.PathCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role("super_admin"))):
    """Create a path (an ordered list of courses). It starts as a draft; publish it with PUT status=published."""
    return svc.create_path(db, current_user, body)


@router.get("/paths/{path_id}", response_model=s.PathResponse)
def get_path(path_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return svc.get_path(db, path_id, current_user)


@router.put("/paths/{path_id}", response_model=s.PathResponse)
def update_path(path_id: str, body: s.PathUpdate, db: Session = Depends(get_db),
                current_user: User = Depends(require_role("super_admin"))):
    return svc.update_path(db, path_id, current_user, body)


@router.delete("/paths/{path_id}", response_model=MessageResponse)
def delete_path(path_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_role("super_admin"))):
    svc.delete_path(db, path_id)
    return MessageResponse(message="Learning path deleted")


@router.post("/paths/{path_id}/enroll", response_model=s.PathResponse)
def enroll_in_path(path_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Join a path to follow it. Enroll in the individual courses as usual."""
    return svc.enroll_path(db, path_id, current_user)


@router.delete("/paths/{path_id}/enroll", response_model=MessageResponse)
def leave_path(path_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    svc.leave_path(db, path_id, current_user)
    return MessageResponse(message="You left the path")


# ------------------------------------------------------------------ recommendations
@recommendations_router.get("/me", response_model=List[s.RecommendationResponse])
def my_recommendations(refresh: bool = False, limit: int = Query(10, ge=1, le=30), db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    """What to learn next: courses to continue, topics to practise, next courses in my paths, wishlist, popular picks."""
    return svc.recommendations(db, current_user, refresh, limit)


@recommendations_router.post("/{recommendation_id}/click", response_model=MessageResponse)
def click_recommendation(recommendation_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    svc.mark(db, recommendation_id, current_user, "click")
    return MessageResponse(message="Recorded")


@recommendations_router.post("/{recommendation_id}/dismiss", response_model=MessageResponse)
def dismiss_recommendation(recommendation_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Hide a suggestion (it will not come back for 30 days)."""
    svc.mark(db, recommendation_id, current_user, "dismiss")
    return MessageResponse(message="Dismissed")
