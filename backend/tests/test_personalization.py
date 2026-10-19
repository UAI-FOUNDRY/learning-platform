from datetime import datetime, timedelta

import pytest

from app.models import Category, Course, Question, Quiz, Section
from app.models.coding import CodingExercise, CodingSubmission
from app.models.personalization import LearningActivityDaily
from tests.factories import auth, enroll, make_course, make_user, uid

API = "/api/v1"
P = f"{API}/personalization"


@pytest.fixture
def world(db_session):
    teacher, admin = make_user(db_session, "instructor"), make_user(db_session, "super_admin")
    learner, other = make_user(db_session), make_user(db_session)
    course, lectures = make_course(db_session, teacher, lectures=2)
    return dict(teacher=teacher, admin=admin, learner=learner, other=other, course=course, lectures=lectures)


def _topic(client, admin, name):
    r = client.post(f"{P}/topics", headers=auth(admin), json={"name": name})
    assert r.status_code == 201, r.text
    return r.json()


def test_topics_crud_and_permissions(client, world):
    w = world
    t = _topic(client, w["admin"], "SQL Joins")
    assert t["slug"] == "sql-joins"
    assert client.post(f"{P}/topics", headers=auth(w["learner"]), json={"name": "x"}).status_code == 403
    assert client.post(f"{P}/topics", headers=auth(w["admin"]), json={"name": "sql joins"}).status_code == 409
    child = client.post(f"{P}/topics", headers=auth(w["admin"]), json={"name": "Left Join", "parent_id": t["id"]}).json()
    assert child["parent_id"] == t["id"]
    assert client.post(f"{P}/topics", headers=auth(w["admin"]), json={"name": "Bad", "parent_id": "nope"}).status_code == 400
    assert client.put(f"{P}/topics/{t['id']}", headers=auth(w["admin"]), json={"name": "Joins"}).json()["slug"] == "joins"
    assert client.put(f"{P}/topics/{t['id']}", headers=auth(w["admin"]), json={"parent_id": t["id"]}).status_code == 400
    assert len(client.get(f"{P}/topics", headers=auth(w["learner"])).json()) == 2
    assert client.delete(f"{P}/topics/{child['id']}", headers=auth(w["admin"])).status_code == 200
    assert client.delete(f"{P}/topics/{child['id']}", headers=auth(w["admin"])).status_code == 404


def test_tagging_courses_questions_and_exercises(client, world, db_session):
    w = world
    t1, t2 = _topic(client, w["admin"], "Loops"), _topic(client, w["admin"], "Functions")
    url = f"{P}/courses/{w['course'].id}/topics"
    assert client.put(url, headers=auth(w["learner"]), json={"topic_ids": [t1["id"]]}).status_code == 403
    assert client.put(url, headers=auth(w["teacher"]), json={"topic_ids": [t1["id"], t2["id"]]}).status_code == 200
    assert client.put(url, headers=auth(w["teacher"]), json={"topic_ids": ["nope"]}).status_code == 400
    assert {t["name"] for t in client.get(url, headers=auth(w["learner"])).json()} == {"Loops", "Functions"}
    client.put(url, headers=auth(w["teacher"]), json={"topic_ids": [t2["id"]]})
    assert [t["name"] for t in client.get(url, headers=auth(w["learner"])).json()] == ["Functions"]

    section = db_session.query(Section).filter_by(course_id=w["course"].id).first()
    quiz = Quiz(section_id=section.id, title="Q")
    db_session.add(quiz)
    db_session.flush()
    q = Question(quiz_id=quiz.id, prompt="?", options=["a", "b"], correct_option="a")
    ex = CodingExercise(course_id=w["course"].id, title="E", problem_statement="P", status="published")
    db_session.add_all([q, ex])
    db_session.commit()
    assert client.put(f"{P}/questions/{q.id}/topics", headers=auth(w["teacher"]), json={"topic_ids": [t1["id"]]}).status_code == 200
    assert client.put(f"{P}/questions/{q.id}/topics", headers=auth(w["learner"]), json={"topic_ids": [t1["id"]]}).status_code == 403
    assert client.put(f"{P}/exercises/{ex.id}/topics", headers=auth(w["teacher"]), json={"topic_ids": [t1["id"]]}).status_code == 200
    assert client.put(f"{P}/exercises/nope/topics", headers=auth(w["teacher"]), json={"topic_ids": []}).status_code == 404


def test_quiz_answers_build_mastery_and_weak_topics(client, world, db_session):
    w = world
    topic = _topic(client, w["admin"], "Loops")
    enroll(db_session, w["learner"], w["course"])
    section = db_session.query(Section).filter_by(course_id=w["course"].id).first()
    quiz = Quiz(section_id=section.id, title="Q")
    db_session.add(quiz)
    db_session.flush()
    q = Question(quiz_id=quiz.id, prompt="?", options=["a", "b"], correct_option="a")
    db_session.add(q)
    db_session.commit()
    client.put(f"{P}/questions/{q.id}/topics", headers=auth(w["teacher"]), json={"topic_ids": [topic["id"]]})
    submit = lambda opt: client.post(f"{API}/quizzes/{quiz.id}/attempts", headers=auth(w["learner"]),
                                      json={"answers": [{"question_id": q.id, "selected_option": opt}]})
    for _ in range(3):
        assert submit("b").status_code in (200, 201)
    mastery = client.get(f"{P}/mastery/me", headers=auth(w["learner"])).json()
    assert len(mastery) == 1 and mastery[0]["attempts"] == 3 and mastery[0]["correct"] == 0
    assert mastery[0]["mastery_score"] == 20.0 and mastery[0]["is_weak"] is True        # (0+1)/(3+2)
    assert [m["topic_name"] for m in client.get(f"{P}/weak-topics/me", headers=auth(w["learner"])).json()] == ["Loops"]
    for _ in range(6):
        submit("a")
    assert client.get(f"{P}/weak-topics/me", headers=auth(w["learner"])).json() == []        # (6+1)/(9+2) = 63.6
    assert client.get(f"{P}/mastery/me", headers=auth(w["other"])).json() == []


def test_goals_track_progress_automatically(client, world, db_session):
    w = world
    learner = w["learner"]
    enroll(db_session, learner, w["course"])
    topic = _topic(client, w["admin"], "Loops")

    mins = client.post(f"{P}/goals", headers=auth(learner), json={"goal_type": "weekly_minutes", "target_value": 100}).json()
    assert mins["title"] == "Learn 100 minutes a week" and mins["progress_percent"] == 0
    db_session.add(LearningActivityDaily(user_id=learner.id, activity_date=datetime.utcnow().date(), minutes_learned=40))
    db_session.add(LearningActivityDaily(user_id=learner.id, activity_date=datetime.utcnow().date() - timedelta(days=20), minutes_learned=500))
    db_session.commit()

    cc = client.post(f"{P}/goals", headers=auth(learner), json={"goal_type": "complete_course", "course_id": w["course"].id}).json()
    mt = client.post(f"{P}/goals", headers=auth(learner), json={"goal_type": "master_topic", "topic_id": topic["id"]}).json()
    custom = client.post(f"{P}/goals", headers=auth(learner), json={"title": "Read a book"}).json()
    assert mt["target_value"] == 80

    goals = {g["id"]: g for g in client.get(f"{P}/goals", headers=auth(learner)).json()}
    assert goals[mins["id"]]["current_value"] == 40 and goals[mins["id"]]["progress_percent"] == 40
    assert goals[cc["id"]]["progress_percent"] == 0

    lec = w["lectures"][0]
    client.post(f"{API}/progress/lecture/{lec.id}", headers=auth(learner), json={"is_completed": True})
    assert {g["id"]: g for g in client.get(f"{P}/goals", headers=auth(learner)).json()}[cc["id"]]["progress_percent"] == 50
    client.post(f"{API}/progress/lecture/{w['lectures'][1].id}", headers=auth(learner), json={"is_completed": True})
    done = {g["id"]: g for g in client.get(f"{P}/goals", headers=auth(learner)).json()}[cc["id"]]
    assert done["progress_percent"] == 100 and done["status"] == "completed" and done["completed_at"]

    r = client.put(f"{P}/goals/{custom['id']}", headers=auth(learner), json={"status": "completed"}).json()
    assert r["status"] == "completed" and r["progress_percent"] == 100
    assert client.put(f"{P}/goals/{custom['id']}", headers=auth(w["other"]), json={"status": "abandoned"}).status_code == 404
    assert client.delete(f"{P}/goals/{custom['id']}", headers=auth(w["other"])).status_code == 404
    assert client.delete(f"{P}/goals/{custom['id']}", headers=auth(learner)).status_code == 200
    assert len(client.get(f"{P}/goals?status=active", headers=auth(learner)).json()) == 2


def test_goal_validation(client, world):
    w = world
    post = lambda body: client.post(f"{P}/goals", headers=auth(w["learner"]), json=body)
    assert post({"goal_type": "weekly_minutes"}).status_code == 422
    assert post({"goal_type": "complete_course", "course_id": "nope"}).status_code == 422
    assert post({"goal_type": "master_topic", "topic_id": "nope"}).status_code == 422
    assert post({"goal_type": "custom"}).status_code == 422
    assert post({"goal_type": "flying", "title": "x"}).status_code == 422
    assert post({"title": "x", "target_value": 0}).status_code == 422


def test_learning_paths(client, world, db_session):
    w = world
    c2, _ = make_course(db_session, w["teacher"], lectures=1)
    draft, _ = make_course(db_session, w["teacher"], status="draft")
    body = {"title": "Become a Data Analyst", "course_ids": [w["course"].id, c2.id]}
    assert client.post(f"{P}/paths", headers=auth(w["teacher"]), json=body).status_code == 403
    path = client.post(f"{P}/paths", headers=auth(w["admin"]), json=body).json()
    assert path["status"] == "draft" and path["slug"] == "become-a-data-analyst" and [c["course_id"] for c in path["courses"]] == [w["course"].id, c2.id]
    assert client.get(f"{P}/paths", headers=auth(w["learner"])).json() == []                 # drafts are hidden
    assert client.get(f"{P}/paths/{path['id']}", headers=auth(w["learner"])).status_code == 404
    assert client.post(f"{P}/paths/{path['id']}/enroll", headers=auth(w["learner"])).status_code == 404
    bad = client.put(f"{P}/paths/{path['id']}", headers=auth(w["admin"]), json={"course_ids": [draft.id], "status": "published"})
    assert bad.status_code == 409
    assert client.put(f"{P}/paths/{path['id']}", headers=auth(w["admin"]), json={"course_ids": ["nope"]}).status_code == 400
    ok = client.put(f"{P}/paths/{path['id']}", headers=auth(w["admin"]), json={"course_ids": [w["course"].id, c2.id], "status": "published"})
    assert ok.status_code == 200 and ok.json()["status"] == "published"

    assert len(client.get(f"{P}/paths", headers=auth(w["learner"])).json()) == 1
    enrolled = client.post(f"{P}/paths/{path['id']}/enroll", headers=auth(w["learner"])).json()
    assert enrolled["enrolled"] is True and enrolled["progress_percent"] == 0
    assert client.post(f"{P}/paths/{path['id']}/enroll", headers=auth(w["learner"])).status_code == 200      # idempotent
    assert len(client.get(f"{P}/paths?mine=true", headers=auth(w["learner"])).json()) == 1
    assert client.get(f"{P}/paths?mine=true", headers=auth(w["other"])).json() == []

    enroll(db_session, w["learner"], w["course"], status="COMPLETED")
    detail = client.get(f"{P}/paths/{path['id']}", headers=auth(w["learner"])).json()
    assert detail["progress_percent"] == 50 and detail["courses"][0]["completed"] is True and detail["courses"][1]["enrolled"] is False
    enroll(db_session, w["learner"], c2, status="COMPLETED")
    done = client.get(f"{P}/paths/{path['id']}", headers=auth(w["learner"])).json()
    assert done["progress_percent"] == 100 and done["completed_at"]

    assert client.delete(f"{P}/paths/{path['id']}/enroll", headers=auth(w["learner"])).status_code == 200
    assert client.delete(f"{P}/paths/{path['id']}/enroll", headers=auth(w["learner"])).status_code == 404
    assert len(client.get(f"{P}/paths?all=true", headers=auth(w["admin"])).json()) == 1
    assert client.delete(f"{P}/paths/{path['id']}", headers=auth(w["teacher"])).status_code == 403
    assert client.delete(f"{P}/paths/{path['id']}", headers=auth(w["admin"])).status_code == 200


def test_recommendations(client, world, db_session):
    w = world
    learner = w["learner"]
    R = f"{API}/recommendations"
    teacher = w["teacher"]
    popular, _ = make_course(db_session, teacher, title="Popular Course")
    popular.category_id = w["course"].category_id
    other_cat = Category(name="Other", slug=f"o-{uid()}")
    db_session.add(other_cat)
    db_session.commit()
    elsewhere, _ = make_course(db_session, teacher, title="Elsewhere")
    elsewhere.category_id = other_cat.id
    db_session.commit()
    for _ in range(3):
        enroll(db_session, make_user(db_session), popular)

    # a new learner sees what is popular
    cold = client.get(f"{R}/me", headers=auth(learner)).json()
    assert {r["title"] for r in cold} >= {"Popular Course"} and all(r["reason"] == "Popular on the platform" for r in cold)
    assert cold[0]["title"] == "Popular Course"

    # after enrolling: continue + same-category suggestions, never the course already taken
    enroll(db_session, learner, w["course"])
    recs = client.get(f"{R}/me?refresh=true", headers=auth(learner)).json()
    by_title = {r["title"]: r for r in recs}
    assert recs[0]["item_id"] == w["course"].id and recs[0]["reason"].startswith("Continue where you left off")
    assert by_title["Popular Course"]["reason"].startswith("Popular in")
    assert "Elsewhere" not in by_title

    # wishlist, dismiss and click
    client.post(f"{API}/learning/wishlist/{elsewhere.id}", headers=auth(learner))
    recs = client.get(f"{R}/me?refresh=true", headers=auth(learner)).json()
    wish = next(r for r in recs if r["title"] == "Elsewhere")
    assert wish["reason"] == "In your wishlist"
    assert client.post(f"{R}/{wish['id']}/click", headers=auth(learner)).status_code == 200
    assert client.post(f"{R}/{wish['id']}/dismiss", headers=auth(w["other"])).status_code == 404
    assert client.post(f"{R}/{wish['id']}/dismiss", headers=auth(learner)).status_code == 200
    again = client.get(f"{R}/me?refresh=true", headers=auth(learner)).json()
    assert "Elsewhere" not in {r["title"] for r in again}          # dismissed items stay away
    assert client.get(f"{R}/me").status_code == 401


def test_weak_topic_recommendations(client, world, db_session):
    w = world
    learner = w["learner"]
    topic = _topic(client, w["admin"], "Loops")
    enroll(db_session, learner, w["course"])
    helpful, _ = make_course(db_session, w["teacher"], title="Loops Masterclass")
    client.put(f"{P}/courses/{helpful.id}/topics", headers=auth(w["teacher"]), json={"topic_ids": [topic["id"]]})
    ex = CodingExercise(course_id=w["course"].id, title="Loop drills", problem_statement="P", status="published")
    db_session.add(ex)
    db_session.commit()
    client.put(f"{P}/exercises/{ex.id}/topics", headers=auth(w["teacher"]), json={"topic_ids": [topic["id"]]})
    from app.models.personalization import UserTopicMastery
    db_session.add(UserTopicMastery(user_id=learner.id, topic_id=topic["id"], attempts=5, correct=1, mastery_score=28.6))
    db_session.commit()
    recs = client.get(f"{API}/recommendations/me?refresh=true", headers=auth(learner)).json()
    reasons = {r["title"]: r["reason"] for r in recs}
    assert reasons["Loops Masterclass"] == "Because you struggled with Loops"
    assert reasons["Loop drills"] == "Practise Loops"
    assert next(r for r in recs if r["title"] == "Loop drills")["item_type"] == "coding_exercise"
