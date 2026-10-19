from app.models import Category
from tests.factories import auth, make_course, make_user, uid

API = "/api/v1"


def _category(db):
    cat = Category(name="Cat", slug=f"c-{uid()}")
    db.add(cat)
    db.commit()
    return cat


def test_course_details_can_be_set_and_are_returned(client, db_session):
    teacher = make_user(db_session, "instructor")
    cat = _category(db_session)
    r = client.post(f"{API}/courses", headers=auth(teacher), json={
        "title": "Python 101", "category_id": cat.id, "level": "Beginner", "language": " English ",
        "learning_objectives": ["Write loops", " Use functions ", ""], "prerequisites": ["A laptop"],
    })
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["level"] == "beginner" and body["language"] == "English"
    assert body["learning_objectives"] == ["Write loops", "Use functions"] and body["prerequisites"] == ["A laptop"]

    r = client.put(f"{API}/courses/{body['id']}", headers=auth(teacher), json={"level": "advanced", "prerequisites": []})
    assert r.status_code == 200 and r.json()["level"] == "advanced" and r.json()["prerequisites"] == []
    assert r.json()["learning_objectives"] == ["Write loops", "Use functions"]      # untouched fields stay

    assert client.put(f"{API}/courses/{body['id']}", headers=auth(teacher), json={"level": "expert"}).status_code == 422
    assert client.put(f"{API}/courses/{body['id']}", headers=auth(teacher),
                      json={"learning_objectives": ["x"] * 21}).status_code == 422


def test_catalog_filters_by_level_and_language(client, db_session):
    teacher = make_user(db_session, "instructor")
    a, _ = make_course(db_session, teacher, title="A")
    b, _ = make_course(db_session, teacher, title="B")
    a.level, a.language = "beginner", "English"
    b.level, b.language = "advanced", "Hindi"
    db_session.commit()
    titles = lambda q: {c["title"] for c in client.get(f"{API}/courses{q}").json()}
    assert titles("?level=beginner") == {"A"}
    assert titles("?language=hindi") == {"B"}
    assert titles("?level=advanced&language=English") == set()


def test_public_catalog_does_not_expose_instructor_email(client, db_session):
    teacher = make_user(db_session, "instructor")
    course, _ = make_course(db_session, teacher)
    body = client.get(f"{API}/courses/{course.id}").json()
    assert body["instructor"]["full_name"] == teacher.full_name
    assert "email" not in body["instructor"] and teacher.email not in str(body)
