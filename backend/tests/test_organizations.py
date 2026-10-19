from app.models import Course
from tests.factories import auth, enroll, make_course, make_user

BASE = "/api/v1/organizations"


def create_org(client, admin, **overrides):
    body = {"name": "Universal AI University", "org_type": "university", "domain": "uaiu.ac.in"}
    body.update(overrides)
    r = client.post(BASE, headers=auth(admin), json=body)
    assert r.status_code == 201, r.text
    return r.json()


def add_member(client, actor, org_id, user, role="member", designation=None):
    return client.post(f"{BASE}/{org_id}/members", headers=auth(actor),
                       json={"email": user.email, "member_role": role, "designation": designation})


# ---------------------------------------------------------------- create / list / get
def test_super_admin_creates_org_with_generated_slug(client, db_session):
    admin = make_user(db_session, "super_admin")
    org = create_org(client, admin)
    assert org["slug"] == "universal-ai-university"
    assert org["org_type"] == "university" and org["status"] == "active"
    assert org["member_count"] == 0 and org["course_count"] == 0
    # same name again -> unique slug
    assert create_org(client, admin)["slug"] == "universal-ai-university-2"


def test_explicit_duplicate_slug_conflicts(client, db_session):
    admin = make_user(db_session, "super_admin")
    create_org(client, admin, slug="uaiu")
    r = client.post(BASE, headers=auth(admin), json={"name": "Other", "slug": "uaiu"})
    assert r.status_code == 409


def test_only_super_admin_creates_and_lists(client, db_session):
    instructor = make_user(db_session, "instructor")
    assert client.post(BASE, headers=auth(instructor), json={"name": "X"}).status_code == 403
    assert client.get(BASE, headers=auth(instructor)).status_code == 403


def test_validation(client, db_session):
    admin = make_user(db_session, "super_admin")
    assert client.post(BASE, headers=auth(admin), json={"name": "X", "org_type": "spaceship"}).status_code == 422
    assert client.post(BASE, headers=auth(admin), json={"name": "X", "domain": "https://x.com"}).status_code == 422
    assert client.post(BASE, headers=auth(admin), json={"name": "   "}).status_code == 422


def test_list_with_search_and_filters(client, db_session):
    admin = make_user(db_session, "super_admin")
    create_org(client, admin, name="Alpha College", org_type="college", domain="alpha.edu")
    create_org(client, admin, name="Beta Corp", org_type="company", domain="beta.com")
    names = [o["name"] for o in client.get(BASE, headers=auth(admin), params={"search": "beta"}).json()]
    assert names == ["Beta Corp"]
    types = {o["org_type"] for o in client.get(BASE, headers=auth(admin), params={"org_type": "college"}).json()}
    assert types == {"college"}


def test_members_can_view_outsiders_get_404(client, db_session):
    admin = make_user(db_session, "super_admin")
    org = create_org(client, admin)
    member = make_user(db_session)
    outsider = make_user(db_session)
    assert add_member(client, admin, org["id"], member).status_code == 201
    assert client.get(f"{BASE}/{org['id']}", headers=auth(member)).status_code == 200
    assert client.get(f"{BASE}/{org['id']}", headers=auth(outsider)).status_code == 404


def test_my_organizations(client, db_session):
    admin = make_user(db_session, "super_admin")
    org = create_org(client, admin)
    user = make_user(db_session, "instructor")
    add_member(client, admin, org["id"], user, role="instructor", designation="Professor, CSE")
    mine = client.get(f"{BASE}/my", headers=auth(user)).json()
    assert len(mine) == 1
    assert mine[0]["my_member_role"] == "instructor" and mine[0]["my_designation"] == "Professor, CSE"
    assert mine[0]["member_count"] == 1


# ---------------------------------------------------------------- update / delete
def test_org_admin_can_edit_profile_but_not_status(client, db_session):
    admin = make_user(db_session, "super_admin")
    org = create_org(client, admin)
    org_admin = make_user(db_session, "instructor")
    add_member(client, admin, org["id"], org_admin, role="admin")

    r = client.put(f"{BASE}/{org['id']}", headers=auth(org_admin), json={"description": "Karjat campus"})
    assert r.status_code == 200 and r.json()["description"] == "Karjat campus"
    assert client.put(f"{BASE}/{org['id']}", headers=auth(org_admin), json={"status": "inactive"}).status_code == 403
    assert client.put(f"{BASE}/{org['id']}", headers=auth(admin), json={"status": "inactive"}).json()["status"] == "inactive"


def test_plain_member_cannot_edit(client, db_session):
    admin = make_user(db_session, "super_admin")
    org = create_org(client, admin)
    member = make_user(db_session)
    add_member(client, admin, org["id"], member)
    assert client.put(f"{BASE}/{org['id']}", headers=auth(member), json={"description": "x"}).status_code == 403


def test_delete_keeps_courses(client, db_session):
    admin = make_user(db_session, "super_admin")
    org = create_org(client, admin)
    instructor = make_user(db_session, "instructor")
    course, _ = make_course(db_session, instructor)
    assert client.put(f"{BASE}/{org['id']}/courses/{course.id}", headers=auth(admin)).status_code == 200
    assert client.delete(f"{BASE}/{org['id']}", headers=auth(admin)).status_code == 200
    db_session.expire_all()
    remaining = db_session.get(Course, course.id)
    assert remaining is not None and remaining.organization_id is None


# ---------------------------------------------------------------- members
def test_member_management_flow(client, db_session):
    admin = make_user(db_session, "super_admin")
    org = create_org(client, admin)
    org_admin = make_user(db_session, "instructor")
    add_member(client, admin, org["id"], org_admin, role="admin")
    student = make_user(db_session)

    r = add_member(client, org_admin, org["id"], student, role="learner")
    assert r.status_code == 201 and r.json()["full_name"] == student.full_name
    member_id = r.json()["id"]
    assert add_member(client, org_admin, org["id"], student).status_code == 409

    r = client.put(f"{BASE}/{org['id']}/members/{member_id}", headers=auth(org_admin),
                   json={"designation": "B.Tech AI & ML, 2025-29"})
    assert r.status_code == 200 and r.json()["designation"] == "B.Tech AI & ML, 2025-29"

    learners = client.get(f"{BASE}/{org['id']}/members", headers=auth(org_admin), params={"member_role": "learner"})
    assert [m["user_id"] for m in learners.json()] == [student.id]

    assert client.delete(f"{BASE}/{org['id']}/members/{member_id}", headers=auth(org_admin)).status_code == 200
    assert len(client.get(f"{BASE}/{org['id']}/members", headers=auth(org_admin)).json()) == 1


def test_add_member_needs_existing_user_and_one_identifier(client, db_session):
    admin = make_user(db_session, "super_admin")
    org = create_org(client, admin)
    r = client.post(f"{BASE}/{org['id']}/members", headers=auth(admin), json={"email": "ghost@nowhere.com"})
    assert r.status_code == 404
    r = client.post(f"{BASE}/{org['id']}/members", headers=auth(admin), json={"member_role": "member"})
    assert r.status_code == 422


def test_plain_member_cannot_manage_or_list_members(client, db_session):
    admin = make_user(db_session, "super_admin")
    org = create_org(client, admin)
    member = make_user(db_session)
    add_member(client, admin, org["id"], member)
    assert client.get(f"{BASE}/{org['id']}/members", headers=auth(member)).status_code == 403
    assert add_member(client, member, org["id"], make_user(db_session)).status_code == 403


def test_last_org_admin_is_protected(client, db_session):
    admin = make_user(db_session, "super_admin")
    org = create_org(client, admin)
    org_admin = make_user(db_session, "instructor")
    member_id = add_member(client, admin, org["id"], org_admin, role="admin").json()["id"]
    r = client.put(f"{BASE}/{org['id']}/members/{member_id}", headers=auth(org_admin), json={"member_role": "member"})
    assert r.status_code == 400
    assert client.delete(f"{BASE}/{org['id']}/members/{member_id}", headers=auth(org_admin)).status_code == 400
    # Super Admin can override
    assert client.delete(f"{BASE}/{org['id']}/members/{member_id}", headers=auth(admin)).status_code == 200


# ---------------------------------------------------------------- courses & stats
def test_course_linking_rules(client, db_session):
    admin = make_user(db_session, "super_admin")
    org = create_org(client, admin)
    org_admin = make_user(db_session, "instructor")
    add_member(client, admin, org["id"], org_admin, role="admin")
    member_instructor = make_user(db_session, "instructor")
    add_member(client, admin, org["id"], member_instructor, role="instructor")
    outside_instructor = make_user(db_session, "instructor")

    own_course, _ = make_course(db_session, member_instructor)
    outside_course, _ = make_course(db_session, outside_instructor)

    r = client.put(f"{BASE}/{org['id']}/courses/{own_course.id}", headers=auth(org_admin))
    assert r.status_code == 200 and r.json()["organization_id"] == org["id"]
    assert client.put(f"{BASE}/{org['id']}/courses/{outside_course.id}", headers=auth(org_admin)).status_code == 403

    other_org = create_org(client, admin, name="Other Org")
    assert client.put(f"{BASE}/{other_org['id']}/courses/{own_course.id}", headers=auth(admin)).status_code == 409

    assert client.delete(f"{BASE}/{org['id']}/courses/{own_course.id}", headers=auth(org_admin)).status_code == 200
    assert client.delete(f"{BASE}/{org['id']}/courses/{own_course.id}", headers=auth(org_admin)).status_code == 404


def test_members_see_only_published_courses(client, db_session):
    admin = make_user(db_session, "super_admin")
    org = create_org(client, admin)
    instructor = make_user(db_session, "instructor")
    member = make_user(db_session)
    add_member(client, admin, org["id"], member)
    published, _ = make_course(db_session, instructor, status="published")
    draft, _ = make_course(db_session, instructor, status="draft")
    for c in (published, draft):
        client.put(f"{BASE}/{org['id']}/courses/{c.id}", headers=auth(admin))
    assert [c["id"] for c in client.get(f"{BASE}/{org['id']}/courses", headers=auth(member)).json()] == [published.id]
    assert len(client.get(f"{BASE}/{org['id']}/courses", headers=auth(admin)).json()) == 2


def test_stats(client, db_session):
    admin = make_user(db_session, "super_admin")
    org = create_org(client, admin)
    instructor = make_user(db_session, "instructor")
    add_member(client, admin, org["id"], instructor, role="instructor")
    learner = make_user(db_session)
    add_member(client, admin, org["id"], learner, role="learner")
    course, lectures = make_course(db_session, instructor, lectures=1)
    client.put(f"{BASE}/{org['id']}/courses/{course.id}", headers=auth(admin))
    enroll(db_session, learner, course)
    client.post(f"/api/v1/progress/lecture/{lectures[0].id}", headers=auth(learner), json={"is_completed": True})

    stats = client.get(f"{BASE}/{org['id']}/stats", headers=auth(admin)).json()
    assert stats["members_total"] == 2
    assert stats["members_by_role"]["instructor"] == 1 and stats["members_by_role"]["learner"] == 1
    assert stats["courses_total"] == 1 and stats["courses_published"] == 1
    assert stats["enrollments_total"] == 1 and stats["enrollments_completed"] == 1
    assert stats["certificates_issued"] == 1
    assert client.get(f"{BASE}/{org['id']}/stats", headers=auth(learner)).status_code == 403
