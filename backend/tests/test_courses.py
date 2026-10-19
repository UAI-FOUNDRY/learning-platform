import pytest
from app.models.user import User
from app.models.category import Category
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.utils.security import get_password_hash, create_access_token

def create_user(db, email, full_name="Test User", role="learner", password="Password123"):
    hashed = get_password_hash(password)
    user = User(
        email=email.lower().strip(),
        full_name=full_name,
        role=role,
        hashed_password=hashed
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def auth_header(user):
    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    return {"Authorization": f"Bearer {token}"}

def create_category(db, name="Programming", slug="programming", description="Code tutorials"):
    category = Category(name=name, slug=slug, description=description)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category

# 1. Super Admin can create a course
def test_1_super_admin_can_create_course(client, db_session):
    super_admin = create_user(db_session, "super_course_creator@platform.com", role="super_admin")
    instructor = create_user(db_session, "assigned_inst@platform.com", role="instructor")
    cat = create_category(db_session, name="Web Dev", slug="web-dev-course-1")

    payload = {
        "title": "Modern Fullstack Python",
        "subtitle": "FastAPI and Vue",
        "description": "Learn end-to-end fullstack development",
        "category_id": cat.id,
        "instructor_id": instructor.id,
    }
    response = client.post("/api/v1/courses", headers=auth_header(super_admin), json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Modern Fullstack Python"
    assert data["subtitle"] == "FastAPI and Vue"
    assert data["category_id"] == cat.id
    assert data["instructor_id"] == instructor.id
    assert "id" in data

# 2. Instructor can create a course
def test_2_instructor_can_create_course(client, db_session):
    instructor = create_user(db_session, "inst_course_creator@platform.com", role="instructor")
    other_user = create_user(db_session, "other_inst_target@platform.com", role="instructor")
    cat = create_category(db_session, name="DevOps", slug="devops-course-2")

    # Even if an instructor passes another instructor_id, system must force authenticated instructor's id
    payload = {
        "title": "Docker & Kubernetes Mastery",
        "description": "Container orchestration from scratch",
        "category_id": cat.id,
        "instructor_id": other_user.id,
    }
    response = client.post("/api/v1/courses", headers=auth_header(instructor), json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Docker & Kubernetes Mastery"
    assert data["instructor_id"] == instructor.id
    assert data["instructor_id"] != other_user.id

# 3. Learner cannot create a course
def test_3_learner_cannot_create_course(client, db_session):
    learner = create_user(db_session, "learner_denied_course@platform.com", role="learner")
    cat = create_category(db_session, name="Data", slug="data-course-3")

    payload = {
        "title": "Hacked Course By Learner",
        "category_id": cat.id,
    }
    response = client.post("/api/v1/courses", headers=auth_header(learner), json=payload)
    assert response.status_code == 403
    assert "insufficient permissions" in response.json()["detail"].lower()

# 4. Course defaults to draft
def test_4_course_defaults_to_draft(client, db_session):
    instructor = create_user(db_session, "inst_draft_test@platform.com", role="instructor")
    cat = create_category(db_session, name="Security", slug="security-course-4")

    payload = {
        "title": "Ethical Hacking Fundamentals",
        "category_id": cat.id,
    }
    response = client.post("/api/v1/courses", headers=auth_header(instructor), json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["status"].lower() == "draft"

    # Verify directly in database
    course_in_db = db_session.query(Course).filter(Course.id == data["id"]).first()
    assert course_in_db is not None
    assert course_in_db.status.lower() == "draft"

# 5. Missing category returns appropriate error
def test_5_missing_category_returns_404(client, db_session):
    instructor = create_user(db_session, "inst_missing_cat@platform.com", role="instructor")
    payload = {
        "title": "Orphan Course",
        "category_id": "nonexistent-category-id-9999",
    }
    response = client.post("/api/v1/courses", headers=auth_header(instructor), json=payload)
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

# 6. Course can be retrieved
def test_6_course_can_be_retrieved(client, db_session):
    instructor = create_user(db_session, "inst_get_test@platform.com", full_name="Professor Smith", role="instructor")
    learner = create_user(db_session, "learner_get_course@platform.com", role="learner")
    cat = create_category(db_session, name="AI", slug="ai-course-6")

    course = Course(
        title="Intro to Neural Networks",
        subtitle="Deep Learning 101",
        description="Comprehensive deep learning walkthrough",
        category_id=cat.id,
        instructor_id=instructor.id,
        status="published",
    )
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)

    response = client.get(f"/api/v1/courses/{course.id}", headers=auth_header(learner))
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == course.id
    assert data["title"] == "Intro to Neural Networks"
    assert data["subtitle"] == "Deep Learning 101"
    assert data["instructor"]["id"] == instructor.id
    assert data["instructor"]["full_name"] == "Professor Smith"
    assert data["category"]["id"] == cat.id
    assert data["category"]["name"] == "AI"

# 7. Course listing works
def test_7_course_listing_works(client, db_session):
    learner = create_user(db_session, "learner_lister_c@platform.com", role="learner")
    cat = create_category(db_session, name="Databases", slug="db-course-7")
    inst = create_user(db_session, "inst_lister_c@platform.com", role="instructor")

    c1 = Course(title="PostgreSQL in Depth", category_id=cat.id, instructor_id=inst.id, status="published")
    c2 = Course(title="Redis Essentials", category_id=cat.id, instructor_id=inst.id, status="published")
    db_session.add_all([c1, c2])
    db_session.commit()

    response = client.get("/api/v1/courses", headers=auth_header(learner))
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 2
    titles = [c["title"] for c in data]
    assert "PostgreSQL in Depth" in titles
    assert "Redis Essentials" in titles

# 8. Super Admin can update any course
def test_8_super_admin_can_update_any_course(client, db_session):
    super_admin = create_user(db_session, "super_upd_course@platform.com", role="super_admin")
    instructor = create_user(db_session, "inst_course_owned@platform.com", role="instructor")
    cat = create_category(db_session, name="Cloud", slug="cloud-course-8")

    course = Course(title="Cloud Basics", category_id=cat.id, instructor_id=instructor.id, status="draft")
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)

    update_payload = {
        "title": "Advanced Multi-Cloud Architecture",
        "description": "Updated by Super Admin",
    }
    response = client.put(f"/api/v1/courses/{course.id}", headers=auth_header(super_admin), json=update_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Advanced Multi-Cloud Architecture"
    assert data["description"] == "Updated by Super Admin"

    refreshed = db_session.query(Course).filter(Course.id == course.id).first()
    assert refreshed.title == "Advanced Multi-Cloud Architecture"

# 9. Instructor can update own course
def test_9_instructor_can_update_own_course(client, db_session):
    instructor = create_user(db_session, "inst_owner_upd@platform.com", role="instructor")
    cat = create_category(db_session, name="Mobile", slug="mobile-course-9")

    course = Course(title="Flutter 101", category_id=cat.id, instructor_id=instructor.id, status="draft")
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)

    update_payload = {"title": "Flutter & Dart Masterclass"}
    response = client.put(f"/api/v1/courses/{course.id}", headers=auth_header(instructor), json=update_payload)
    assert response.status_code == 200
    assert response.json()["title"] == "Flutter & Dart Masterclass"

# 10. Instructor cannot update another instructor's course
def test_10_instructor_cannot_update_another_instructors_course(client, db_session):
    instructor_a = create_user(db_session, "inst_a@platform.com", role="instructor")
    instructor_b = create_user(db_session, "inst_b@platform.com", role="instructor")
    cat = create_category(db_session, name="Languages", slug="lang-course-10")

    course_a = Course(title="Go Programming", category_id=cat.id, instructor_id=instructor_a.id, status="draft")
    db_session.add(course_a)
    db_session.commit()
    db_session.refresh(course_a)

    # Instructor B attempts to update Instructor A's course
    response = client.put(
        f"/api/v1/courses/{course_a.id}",
        headers=auth_header(instructor_b),
        json={"title": "Hacked Course Title"}
    )
    assert response.status_code == 403
    assert "only update their own" in response.json()["detail"].lower()

    # Verify not modified
    refreshed = db_session.query(Course).filter(Course.id == course_a.id).first()
    assert refreshed.title == "Go Programming"

# 11. Learner cannot update a course
def test_11_learner_cannot_update_a_course(client, db_session):
    learner = create_user(db_session, "learner_no_upd@platform.com", role="learner")
    instructor = create_user(db_session, "inst_author@platform.com", role="instructor")
    cat = create_category(db_session, name="Testing", slug="test-course-11")

    course = Course(title="TDD in Python", category_id=cat.id, instructor_id=instructor.id, status="draft")
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)

    response = client.put(
        f"/api/v1/courses/{course.id}",
        headers=auth_header(learner),
        json={"title": "Learner Modified Course"}
    )
    assert response.status_code == 403

# 12. Super Admin can delete a course
def test_12_super_admin_can_delete_a_course(client, db_session):
    super_admin = create_user(db_session, "super_del_c@platform.com", role="super_admin")
    instructor = create_user(db_session, "inst_to_del@platform.com", role="instructor")
    cat = create_category(db_session, name="Misc", slug="misc-course-12")

    course = Course(title="To Be Deleted By Admin", category_id=cat.id, instructor_id=instructor.id, status="draft")
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)

    response = client.delete(f"/api/v1/courses/{course.id}", headers=auth_header(super_admin))
    assert response.status_code == 200
    assert "deleted successfully" in response.json()["message"].lower()

    assert db_session.query(Course).filter(Course.id == course.id).first() is None

# 13. Course owner instructor can delete own course
def test_13_course_owner_instructor_can_delete_own_course(client, db_session):
    instructor = create_user(db_session, "inst_self_deleter@platform.com", role="instructor")
    cat = create_category(db_session, name="Rust", slug="rust-course-13")

    course = Course(title="Rust for Beginners", category_id=cat.id, instructor_id=instructor.id, status="draft")
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)

    response = client.delete(f"/api/v1/courses/{course.id}", headers=auth_header(instructor))
    assert response.status_code == 200
    assert "deleted successfully" in response.json()["message"].lower()

    assert db_session.query(Course).filter(Course.id == course.id).first() is None

# 14. Instructor cannot delete another instructor's course
def test_14_instructor_cannot_delete_another_instructors_course(client, db_session):
    inst_1 = create_user(db_session, "inst_1_del@platform.com", role="instructor")
    inst_2 = create_user(db_session, "inst_2_del@platform.com", role="instructor")
    cat = create_category(db_session, name="Scala", slug="scala-course-14")

    course = Course(title="Scala Microservices", category_id=cat.id, instructor_id=inst_1.id, status="draft")
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)

    response = client.delete(f"/api/v1/courses/{course.id}", headers=auth_header(inst_2))
    assert response.status_code == 403
    assert "only delete their own" in response.json()["detail"].lower()

    assert db_session.query(Course).filter(Course.id == course.id).first() is not None

# 15. Learner cannot delete a course
def test_15_learner_cannot_delete_a_course(client, db_session):
    learner = create_user(db_session, "learner_deleter@platform.com", role="learner")
    inst = create_user(db_session, "inst_safe_course@platform.com", role="instructor")
    cat = create_category(db_session, name="GraphQL", slug="graphql-course-15")

    course = Course(title="GraphQL Production APIs", category_id=cat.id, instructor_id=inst.id, status="draft")
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)

    response = client.delete(f"/api/v1/courses/{course.id}", headers=auth_header(learner))
    assert response.status_code == 403

    assert db_session.query(Course).filter(Course.id == course.id).first() is not None

# 16. Nonexistent course returns 404
def test_16_nonexistent_course_returns_404(client, db_session):
    super_admin = create_user(db_session, "super_404@platform.com", role="super_admin")
    fake_id = "nonexistent-course-uuid-404"

    res_get = client.get(f"/api/v1/courses/{fake_id}", headers=auth_header(super_admin))
    assert res_get.status_code == 404
    assert "not found" in res_get.json()["detail"].lower()

    res_put = client.put(f"/api/v1/courses/{fake_id}", headers=auth_header(super_admin), json={"title": "New"})
    assert res_put.status_code == 404
    assert "not found" in res_put.json()["detail"].lower()

    res_del = client.delete(f"/api/v1/courses/{fake_id}", headers=auth_header(super_admin))
    assert res_del.status_code == 404
    assert "not found" in res_del.json()["detail"].lower()

# 17. Invalid input is rejected
def test_17_invalid_input_is_rejected(client, db_session):
    instructor = create_user(db_session, "inst_validator_c@platform.com", role="instructor")
    cat = create_category(db_session, name="Validation", slug="val-course-17")

    # Empty title
    res1 = client.post(
        "/api/v1/courses",
        headers=auth_header(instructor),
        json={"title": "   ", "category_id": cat.id}
    )
    assert res1.status_code == 422

    # Missing category_id
    res2 = client.post(
        "/api/v1/courses",
        headers=auth_header(instructor),
        json={"title": "Valid Title"}
    )
    assert res2.status_code == 422

    # Title exceeding 255 chars
    res3 = client.post(
        "/api/v1/courses",
        headers=auth_header(instructor),
        json={"title": "A" * 300, "category_id": cat.id}
    )
    assert res3.status_code == 422

# 18. Instructor cannot change course ownership through update
def test_18_instructor_cannot_change_course_ownership_through_update(client, db_session):
    inst_owner = create_user(db_session, "inst_owner_transfer@platform.com", role="instructor")
    inst_other = create_user(db_session, "inst_other_transfer@platform.com", role="instructor")
    cat = create_category(db_session, name="Architecture", slug="arch-course-18")

    course = Course(title="Software Architecture", category_id=cat.id, instructor_id=inst_owner.id, status="draft")
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)

    # Attempt changing instructor_id to another instructor
    response = client.put(
        f"/api/v1/courses/{course.id}",
        headers=auth_header(inst_owner),
        json={"instructor_id": inst_other.id}
    )
    assert response.status_code == 403
    assert "cannot change course ownership" in response.json()["detail"].lower()

    # Verify ownership remains with original instructor
    refreshed = db_session.query(Course).filter(Course.id == course.id).first()
    assert refreshed.instructor_id == inst_owner.id

# 19. Course responses do not expose sensitive user information
def test_19_course_responses_never_contain_sensitive_user_info(client, db_session):
    instructor = create_user(db_session, "inst_safe_info@platform.com", role="instructor", password="SecretInstructorPassword!")
    super_admin = create_user(db_session, "super_safe_info@platform.com", role="super_admin")
    cat = create_category(db_session, name="Security Check", slug="sec-check-19")

    course = Course(title="Security Architecture", category_id=cat.id, instructor_id=instructor.id, status="draft")
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)

    endpoints = [
        client.get(f"/api/v1/courses/{course.id}", headers=auth_header(instructor)),
        client.get("/api/v1/courses", headers=auth_header(instructor)),
        client.put(f"/api/v1/courses/{course.id}", headers=auth_header(instructor), json={"subtitle": "Safe"}),
        client.post("/api/v1/courses", headers=auth_header(instructor), json={"title": "New Safe", "category_id": cat.id}),
    ]

    for resp in endpoints:
        assert resp.status_code in [200, 201]
        text = resp.text
        assert "hashed_password" not in text
        assert "secretinstructorpassword" not in text.lower()

# 20. Verify no "admin" role is introduced anywhere (legacy admin receives 403 on course operations)
def test_20_legacy_admin_role_rejected_on_course_endpoints(client, db_session):
    legacy_admin = create_user(db_session, "legacy_admin_course@platform.com", role="admin")
    cat = create_category(db_session, name="Legacy Target", slug="legacy-target-20")

    course = Course(title="Legacy Target Course", category_id=cat.id, instructor_id=legacy_admin.id, status="draft")
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)

    # 1. POST /api/v1/courses
    res_post = client.post(
        "/api/v1/courses",
        headers=auth_header(legacy_admin),
        json={"title": "Admin Created", "category_id": cat.id}
    )
    assert res_post.status_code == 403
    assert "insufficient permissions" in res_post.json()["detail"].lower()

    # 2. PUT /api/v1/courses/{id}
    res_put = client.put(
        f"/api/v1/courses/{course.id}",
        headers=auth_header(legacy_admin),
        json={"title": "Hacked Course"}
    )
    assert res_put.status_code == 403

    # 3. DELETE /api/v1/courses/{id}
    res_del = client.delete(f"/api/v1/courses/{course.id}", headers=auth_header(legacy_admin))
    assert res_del.status_code == 403

# 21. Dependent records prevent course deletion (Safe deletion test)
def test_21_course_referenced_by_enrollments_cannot_be_deleted(client, db_session):
    super_admin = create_user(db_session, "super_del_enroll@platform.com", role="super_admin")
    instructor = create_user(db_session, "inst_enroll_c@platform.com", role="instructor")
    learner = create_user(db_session, "enrolled_learner@platform.com", role="learner")
    cat = create_category(db_session, name="Enrolled Cat", slug="enrolled-cat-21")

    course = Course(title="Course With Active Students", category_id=cat.id, instructor_id=instructor.id, status="draft")
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)

    # Create an enrollment for this course
    enrollment = Enrollment(user_id=learner.id, course_id=course.id, status="ACTIVE")
    db_session.add(enrollment)
    db_session.commit()
    db_session.refresh(enrollment)

    # Attempt deletion of course that has active enrollments
    response = client.delete(f"/api/v1/courses/{course.id}", headers=auth_header(super_admin))
    assert response.status_code == 409
    data = response.json()
    assert "cannot delete course" in data["detail"].lower()
    assert "enrolled" in data["detail"].lower()

    # Verify course is still in DB
    assert db_session.query(Course).filter(Course.id == course.id).first() is not None

    # Remove enrollment and retry deletion
    db_session.delete(enrollment)
    db_session.commit()

    del_resp = client.delete(f"/api/v1/courses/{course.id}", headers=auth_header(super_admin))
    assert del_resp.status_code == 200
    assert db_session.query(Course).filter(Course.id == course.id).first() is None
