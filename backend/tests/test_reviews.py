from tests.factories import auth, enroll, make_course, make_user

BASE = "/api/v1/reviews"


def setup(db):
    instructor = make_user(db, "instructor")
    learner = make_user(db, full_name="Ravi Reviewer")
    course, _ = make_course(db, instructor)
    enroll(db, learner, course)
    return instructor, learner, course


def post_review(client, user, course, rating=5, text="Great course"):
    return client.post(BASE, headers=auth(user), json={"course_id": course.id, "rating": rating, "review_text": text})


def test_enrolled_learner_can_review(client, db_session):
    _, learner, course = setup(db_session)
    r = post_review(client, learner, course)
    assert r.status_code == 201
    body = r.json()
    assert body["rating"] == 5 and body["reviewer_name"] == "Ravi Reviewer" and body["status"] == "visible"


def test_cannot_review_twice(client, db_session):
    _, learner, course = setup(db_session)
    assert post_review(client, learner, course).status_code == 201
    assert post_review(client, learner, course, rating=1).status_code == 409


def test_must_be_enrolled_learner(client, db_session):
    instructor, _, course = setup(db_session)
    outsider = make_user(db_session)
    assert post_review(client, outsider, course).status_code == 403
    assert post_review(client, instructor, course).status_code == 403  # instructors don't review


def test_cannot_review_unpublished_course(client, db_session):
    instructor = make_user(db_session, "instructor")
    learner = make_user(db_session)
    course, _ = make_course(db_session, instructor, status="draft")
    enroll(db_session, learner, course)
    assert post_review(client, learner, course).status_code == 404


def test_rating_must_be_1_to_5(client, db_session):
    _, learner, course = setup(db_session)
    assert post_review(client, learner, course, rating=6).status_code == 422
    assert post_review(client, learner, course, rating=0).status_code == 422


def test_public_list_and_summary(client, db_session):
    instructor = make_user(db_session, "instructor")
    course, _ = make_course(db_session, instructor)
    for rating in (5, 4, 4):
        learner = make_user(db_session)
        enroll(db_session, learner, course)
        assert post_review(client, learner, course, rating=rating).status_code == 201

    r = client.get(f"{BASE}/courses/{course.id}")  # no login
    assert r.status_code == 200 and len(r.json()) == 3
    assert len(client.get(f"{BASE}/courses/{course.id}", params={"rating": 4}).json()) == 2

    summary = client.get(f"{BASE}/courses/{course.id}/summary").json()
    assert summary["review_count"] == 3
    assert summary["average_rating"] == 4.33
    assert summary["distribution"] == {"5": 1, "4": 2, "3": 0, "2": 0, "1": 0}


def test_summary_with_no_reviews(client, db_session):
    instructor = make_user(db_session, "instructor")
    course, _ = make_course(db_session, instructor)
    summary = client.get(f"{BASE}/courses/{course.id}/summary").json()
    assert summary["review_count"] == 0 and summary["average_rating"] is None


def test_owner_edits_and_deletes(client, db_session):
    _, learner, course = setup(db_session)
    review_id = post_review(client, learner, course, rating=3).json()["id"]
    r = client.put(f"{BASE}/{review_id}", headers=auth(learner), json={"rating": 4, "review_text": "Better now"})
    assert r.status_code == 200 and r.json()["rating"] == 4 and r.json()["review_text"] == "Better now"
    assert client.get(f"{BASE}/my", headers=auth(learner)).json()[0]["id"] == review_id
    assert client.delete(f"{BASE}/{review_id}", headers=auth(learner)).status_code == 200
    assert client.get(f"{BASE}/my", headers=auth(learner)).json() == []


def test_others_cannot_edit_or_delete(client, db_session):
    _, learner, course = setup(db_session)
    review_id = post_review(client, learner, course).json()["id"]
    other = make_user(db_session)
    assert client.put(f"{BASE}/{review_id}", headers=auth(other), json={"rating": 1}).status_code == 403
    assert client.delete(f"{BASE}/{review_id}", headers=auth(other)).status_code == 403


def test_admin_moderation_hides_from_public_and_ratings(client, db_session):
    _, learner, course = setup(db_session)
    review_id = post_review(client, learner, course, rating=1, text="spam spam").json()["id"]
    admin = make_user(db_session, "super_admin")

    assert client.patch(f"{BASE}/{review_id}/moderate", headers=auth(learner), json={"status": "removed"}).status_code == 403
    r = client.patch(f"{BASE}/{review_id}/moderate", headers=auth(admin), json={"status": "removed"})
    assert r.status_code == 200 and r.json()["status"] == "removed"

    assert client.get(f"{BASE}/courses/{course.id}").json() == []
    assert client.get(f"{BASE}/courses/{course.id}/summary").json()["review_count"] == 0
    assert len(client.get(BASE, headers=auth(admin), params={"status": "removed"}).json()) == 1
    # Author can't edit a removed review back
    assert client.put(f"{BASE}/{review_id}", headers=auth(learner), json={"rating": 5}).status_code == 403


def test_invalid_moderation_status(client, db_session):
    _, learner, course = setup(db_session)
    review_id = post_review(client, learner, course).json()["id"]
    admin = make_user(db_session, "super_admin")
    assert client.patch(f"{BASE}/{review_id}/moderate", headers=auth(admin), json={"status": "deleted"}).status_code == 422


def test_admin_list_requires_admin(client, db_session):
    learner = make_user(db_session)
    assert client.get(BASE, headers=auth(learner)).status_code == 403
