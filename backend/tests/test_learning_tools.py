from tests.factories import auth, enroll, make_course, make_user

L = "/api/v1/learning"


def _setup(db):
    teacher = make_user(db, "instructor")
    learner, other, stranger = make_user(db), make_user(db), make_user(db)
    course, lectures = make_course(db, teacher, lectures=2)
    enroll(db, learner, course)
    enroll(db, other, course)
    return teacher, learner, other, stranger, course, lectures


def test_notes_crud_and_privacy(client, db_session):
    teacher, learner, other, stranger, course, lectures = _setup(db_session)
    lec = lectures[0]
    r = client.post(f"{L}/lectures/{lec.id}/notes", headers=auth(learner), json={"content": " Remember loops ", "timestamp_seconds": 42})
    assert r.status_code == 201
    note = r.json()
    assert note["content"] == "Remember loops" and note["course_id"] == course.id and note["lecture_title"] == lec.title

    assert client.post(f"{L}/lectures/{lec.id}/notes", headers=auth(learner), json={"content": "  "}).status_code == 422
    assert client.post(f"{L}/lectures/{lec.id}/notes", headers=auth(learner), json={"content": "x", "timestamp_seconds": -1}).status_code == 422

    # private: another learner sees none and cannot touch it
    assert client.get(f"{L}/notes", headers=auth(other)).json() == []
    assert client.put(f"{L}/notes/{note['id']}", headers=auth(other), json={"content": "hack"}).status_code == 404
    assert client.delete(f"{L}/notes/{note['id']}", headers=auth(other)).status_code == 404

    r = client.put(f"{L}/notes/{note['id']}", headers=auth(learner), json={"content": "Updated"})
    assert r.status_code == 200 and r.json()["content"] == "Updated"

    client.post(f"{L}/lectures/{lectures[1].id}/notes", headers=auth(learner), json={"content": "second lecture"})
    assert len(client.get(f"{L}/notes", headers=auth(learner)).json()) == 2
    assert len(client.get(f"{L}/notes?lecture_id={lec.id}", headers=auth(learner)).json()) == 1
    assert len(client.get(f"{L}/notes?course_id={course.id}", headers=auth(learner)).json()) == 2
    assert [n["content"] for n in client.get(f"{L}/notes?search=SECOND", headers=auth(learner)).json()] == ["second lecture"]

    assert client.delete(f"{L}/notes/{note['id']}", headers=auth(learner)).status_code == 200
    assert len(client.get(f"{L}/notes", headers=auth(learner)).json()) == 1


def test_notes_need_enrollment_or_ownership(client, db_session):
    teacher, learner, other, stranger, course, lectures = _setup(db_session)
    lec = lectures[0]
    assert client.post(f"{L}/lectures/{lec.id}/notes", headers=auth(stranger), json={"content": "hi"}).status_code == 403
    assert client.post(f"{L}/lectures/{lec.id}/notes", headers=auth(teacher), json={"content": "teacher note"}).status_code == 201
    assert client.post(f"{L}/lectures/nope/notes", headers=auth(learner), json={"content": "hi"}).status_code == 404
    assert client.get(f"{L}/notes").status_code == 401


def test_bookmarks(client, db_session):
    teacher, learner, other, stranger, course, lectures = _setup(db_session)
    lec = lectures[0]
    r = client.post(f"{L}/lectures/{lec.id}/bookmarks", headers=auth(learner), json={"timestamp_seconds": 90, "label": "Key idea"})
    assert r.status_code == 201
    bm = r.json()
    again = client.post(f"{L}/lectures/{lec.id}/bookmarks", headers=auth(learner), json={"timestamp_seconds": 90, "label": "Renamed"})
    assert again.json()["id"] == bm["id"] and again.json()["label"] == "Renamed"
    client.post(f"{L}/lectures/{lec.id}/bookmarks", headers=auth(learner), json={"timestamp_seconds": 10})
    rows = client.get(f"{L}/bookmarks?lecture_id={lec.id}", headers=auth(learner)).json()
    assert [b["timestamp_seconds"] for b in rows] == [10, 90]
    assert client.get(f"{L}/bookmarks", headers=auth(other)).json() == []
    assert client.delete(f"{L}/bookmarks/{bm['id']}", headers=auth(other)).status_code == 404
    assert client.delete(f"{L}/bookmarks/{bm['id']}", headers=auth(learner)).status_code == 200
    assert client.post(f"{L}/lectures/{lec.id}/bookmarks", headers=auth(stranger), json={}).status_code == 403
    assert client.post(f"{L}/lectures/{lec.id}/bookmarks", headers=auth(learner), json={"timestamp_seconds": -5}).status_code == 422


def test_wishlist(client, db_session):
    teacher, learner, other, stranger, course, lectures = _setup(db_session)
    draft, _ = make_course(db_session, teacher, status="draft")
    r = client.post(f"{L}/wishlist/{course.id}", headers=auth(stranger))
    assert r.status_code == 201 and r.json()["course"]["title"] == course.title
    assert client.post(f"{L}/wishlist/{course.id}", headers=auth(stranger)).status_code == 200  # idempotent
    assert client.post(f"{L}/wishlist/{draft.id}", headers=auth(stranger)).status_code == 404
    assert client.post(f"{L}/wishlist/missing", headers=auth(stranger)).status_code == 404
    assert len(client.get(f"{L}/wishlist", headers=auth(stranger)).json()) == 1
    assert client.get(f"{L}/wishlist", headers=auth(learner)).json() == []
    assert client.delete(f"{L}/wishlist/{course.id}", headers=auth(learner)).status_code == 404
    assert client.delete(f"{L}/wishlist/{course.id}", headers=auth(stranger)).status_code == 200
    assert client.get(f"{L}/wishlist", headers=auth(stranger)).json() == []
