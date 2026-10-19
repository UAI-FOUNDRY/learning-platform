from app.models import Certificate
from tests.factories import auth, enroll, make_course, make_user

API = "/api/v1"


def test_overview_is_super_admin_only(client, db_session):
    assert client.get(f"{API}/admin/overview").status_code == 401
    for role in ("learner", "instructor"):
        assert client.get(f"{API}/admin/overview", headers=auth(make_user(db_session, role))).status_code == 403


def test_overview_counts(client, db_session):
    admin = make_user(db_session, "super_admin")
    inst = make_user(db_session, "instructor")
    learner = make_user(db_session)
    make_user(db_session, status="suspended")
    published, _ = make_course(db_session, inst, status="published")
    make_course(db_session, inst, status="pending_review")
    enroll(db_session, learner, published, status="COMPLETED")
    enroll(db_session, make_user(db_session), published)

    data = client.get(f"{API}/admin/overview", headers=auth(admin)).json()
    assert data["users"]["total"] == 5
    assert data["users"]["by_role"]["learner"] == 3 and data["users"]["by_status"]["suspended"] == 1
    assert data["courses"]["total"] == 2 and data["courses"]["pending_review"] == 1
    assert data["enrollments"] == {**data["enrollments"], "total": 2, "active": 1, "completed": 1}
    assert data["certificates_issued"] == 0 and data["organizations"] == 0


def test_global_enrollment_list_scopes_by_role(client, db_session):
    admin = make_user(db_session, "super_admin")
    inst_a = make_user(db_session, "instructor")
    inst_b = make_user(db_session, "instructor")
    learner = make_user(db_session)
    course_a, _ = make_course(db_session, inst_a)
    course_b, _ = make_course(db_session, inst_b)
    enroll(db_session, learner, course_a)
    enroll(db_session, learner, course_b, status="COMPLETED")

    all_rows = client.get(f"{API}/enrollments", headers=auth(admin)).json()
    assert len(all_rows) == 2 and all_rows[0]["user"]["email"] == learner.email and all_rows[0]["course"]["title"]

    own = client.get(f"{API}/enrollments", headers=auth(inst_a)).json()
    assert [r["course_id"] for r in own] == [course_a.id]

    done = client.get(f"{API}/enrollments", headers=auth(admin), params={"status": "completed"}).json()
    assert [r["course_id"] for r in done] == [course_b.id]
    assert len(client.get(f"{API}/enrollments", headers=auth(admin), params={"course_id": course_a.id}).json()) == 1
    assert client.get(f"{API}/enrollments", headers=auth(learner)).status_code == 403
