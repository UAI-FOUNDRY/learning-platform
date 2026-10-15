import pytest
from app.models.user import User
from app.models.category import Category
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.certificate import Certificate
from app.schemas.course import CourseStatus
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

def create_course(db, instructor_id, title="Enrollment Test Course", status="published"):
    category = Category(name=f"Cat-{title}", slug=f"cat-{title.lower().replace(' ', '-')[:30]}")
    db.add(category)
    db.commit()
    db.refresh(category)

    course = Course(
        title=title,
        instructor_id=instructor_id,
        category_id=category.id,
        status=status
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course

# 0. Placeholder router mounted check (preserved for backwards compatibility)
def test_enrollments_router_mounted(client):
    response = client.get("/api/v1/enrollments/")
    assert response.status_code == 200
    data = response.json()
    assert data["module"] == "enrollments"
    assert "description" in data

# 1. Successful enrollment
def test_1_learner_can_enroll_in_published_course(client, db_session):
    instructor = create_user(db_session, "inst_enr_1@platform.com", role="instructor")
    learner = create_user(db_session, "learner_enr_1@platform.com", role="learner")
    course = create_course(db_session, instructor.id, "Python 101", status="published")

    resp = client.post(f"/api/v1/courses/{course.id}/enroll", headers=auth_header(learner))
    assert resp.status_code == 201
    data = resp.json()
    assert data["course_id"] == course.id
    assert data["user_id"] == learner.id
    assert data["status"] == "ACTIVE"
    assert "id" in data
    assert "enrolled_at" in data

# 2. Enrollment in a missing course
def test_2_enroll_in_missing_course_returns_404(client, db_session):
    learner = create_user(db_session, "learner_enr_2@platform.com", role="learner")
    fake_id = "nonexistent-course-id-404"

    resp = client.post(f"/api/v1/courses/{fake_id}/enroll", headers=auth_header(learner))
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()

# 3. Enrollment in unpublished courses
def test_3_enroll_in_unpublished_courses_rejected(client, db_session):
    instructor = create_user(db_session, "inst_enr_3@platform.com", role="instructor")
    learner = create_user(db_session, "learner_enr_3@platform.com", role="learner")

    for st in ["draft", "pending_review", "changes_requested", "rejected"]:
        course = create_course(db_session, instructor.id, f"Course {st}", status=st)
        resp = client.post(f"/api/v1/courses/{course.id}/enroll", headers=auth_header(learner))
        assert resp.status_code == 400
        assert "unpublished" in resp.json()["detail"].lower()

# 4. Duplicate enrollment
def test_4_duplicate_enrollment_rejected(client, db_session):
    instructor = create_user(db_session, "inst_enr_4@platform.com", role="instructor")
    learner = create_user(db_session, "learner_enr_4@platform.com", role="learner")
    course = create_course(db_session, instructor.id, "Course Dupe", status="published")

    # First enrollment
    r1 = client.post(f"/api/v1/courses/{course.id}/enroll", headers=auth_header(learner))
    assert r1.status_code == 201

    # Second enrollment attempt
    r2 = client.post(f"/api/v1/courses/{course.id}/enroll", headers=auth_header(learner))
    assert r2.status_code == 409
    assert "already enrolled" in r2.json()["detail"].lower()

# 5. Instructor cannot enroll
def test_5_instructor_cannot_enroll(client, db_session):
    instructor = create_user(db_session, "inst_enr_5@platform.com", role="instructor")
    other_inst = create_user(db_session, "inst_other_5@platform.com", role="instructor")
    course = create_course(db_session, instructor.id, "Course 5", status="published")

    resp = client.post(f"/api/v1/courses/{course.id}/enroll", headers=auth_header(other_inst))
    assert resp.status_code == 403
    assert "learner" in resp.json()["detail"].lower()

# 6. Super Admin cannot enroll as a learner
def test_6_super_admin_cannot_enroll(client, db_session):
    admin = create_user(db_session, "admin_enr_6@platform.com", role="super_admin")
    instructor = create_user(db_session, "inst_enr_6@platform.com", role="instructor")
    course = create_course(db_session, instructor.id, "Course 6", status="published")

    resp = client.post(f"/api/v1/courses/{course.id}/enroll", headers=auth_header(admin))
    assert resp.status_code == 403
    assert "learner" in resp.json()["detail"].lower()

# 7. Unauthenticated access
def test_7_unauthenticated_enrollment_rejected(client, db_session):
    instructor = create_user(db_session, "inst_enr_7@platform.com", role="instructor")
    course = create_course(db_session, instructor.id, "Course 7", status="published")

    resp = client.post(f"/api/v1/courses/{course.id}/enroll")
    assert resp.status_code == 401

# 8. Learner can view their own enrollments
def test_8_learner_can_view_own_enrollments(client, db_session):
    instructor = create_user(db_session, "inst_enr_8@platform.com", role="instructor")
    learner = create_user(db_session, "learner_enr_8@platform.com", role="learner")
    c1 = create_course(db_session, instructor.id, "Course 8A", status="published")
    c2 = create_course(db_session, instructor.id, "Course 8B", status="published")

    client.post(f"/api/v1/courses/{c1.id}/enroll", headers=auth_header(learner))
    client.post(f"/api/v1/courses/{c2.id}/enroll", headers=auth_header(learner))

    resp = client.get("/api/v1/enrollments/my", headers=auth_header(learner))
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 2
    course_ids = [e["course_id"] for e in data]
    assert c1.id in course_ids
    assert c2.id in course_ids
    assert "course" in data[0]
    assert data[0]["course"]["title"] in ["Course 8A", "Course 8B"]

# 9. Learner cannot view another learner's enrollments
def test_9_learner_cannot_view_another_learners_enrollments(client, db_session):
    instructor = create_user(db_session, "inst_enr_9@platform.com", role="instructor")
    learner1 = create_user(db_session, "learner_enr_9a@platform.com", role="learner")
    learner2 = create_user(db_session, "learner_enr_9b@platform.com", role="learner")
    course = create_course(db_session, instructor.id, "Course 9", status="published")

    client.post(f"/api/v1/courses/{course.id}/enroll", headers=auth_header(learner1))

    # Learner 2 views my enrollments -> should be empty
    resp = client.get("/api/v1/enrollments/my", headers=auth_header(learner2))
    assert resp.status_code == 200
    assert len(resp.json()) == 0

# 10. Course owner can view the course roster
def test_10_course_owner_can_view_course_roster(client, db_session):
    instructor = create_user(db_session, "inst_enr_10@platform.com", role="instructor")
    learner = create_user(db_session, "learner_enr_10@platform.com", role="learner")
    course = create_course(db_session, instructor.id, "Course 10", status="published")

    client.post(f"/api/v1/courses/{course.id}/enroll", headers=auth_header(learner))

    resp = client.get(f"/api/v1/courses/{course.id}/enrollments", headers=auth_header(instructor))
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["user_id"] == learner.id
    assert "user" in data[0]
    assert data[0]["user"]["email"] == "learner_enr_10@platform.com"

# 11. Other instructors cannot view that roster
def test_11_other_instructors_cannot_view_roster(client, db_session):
    instructor1 = create_user(db_session, "inst_enr_11a@platform.com", role="instructor")
    instructor2 = create_user(db_session, "inst_enr_11b@platform.com", role="instructor")
    learner = create_user(db_session, "learner_enr_11@platform.com", role="learner")
    course = create_course(db_session, instructor1.id, "Course 11", status="published")

    client.post(f"/api/v1/courses/{course.id}/enroll", headers=auth_header(learner))

    resp = client.get(f"/api/v1/courses/{course.id}/enrollments", headers=auth_header(instructor2))
    assert resp.status_code == 403
    assert "own courses" in resp.json()["detail"].lower()

# 12. Super Admin can view the roster
def test_12_super_admin_can_view_roster(client, db_session):
    admin = create_user(db_session, "admin_enr_12@platform.com", role="super_admin")
    instructor = create_user(db_session, "inst_enr_12@platform.com", role="instructor")
    learner = create_user(db_session, "learner_enr_12@platform.com", role="learner")
    course = create_course(db_session, instructor.id, "Course 12", status="published")

    client.post(f"/api/v1/courses/{course.id}/enroll", headers=auth_header(learner))

    resp = client.get(f"/api/v1/courses/{course.id}/enrollments", headers=auth_header(admin))
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["user_id"] == learner.id

# 13. Learner cannot view course roster
def test_13_learner_cannot_view_course_roster(client, db_session):
    instructor = create_user(db_session, "inst_enr_13@platform.com", role="instructor")
    learner = create_user(db_session, "learner_enr_13@platform.com", role="learner")
    course = create_course(db_session, instructor.id, "Course 13", status="published")

    resp = client.get(f"/api/v1/courses/{course.id}/enrollments", headers=auth_header(learner))
    assert resp.status_code == 403

# 14. Learner can view own enrollment details
def test_14_learner_can_view_own_enrollment_details(client, db_session):
    instructor = create_user(db_session, "inst_enr_14@platform.com", role="instructor")
    learner = create_user(db_session, "learner_enr_14@platform.com", role="learner")
    course = create_course(db_session, instructor.id, "Course 14", status="published")

    enr_resp = client.post(f"/api/v1/courses/{course.id}/enroll", headers=auth_header(learner))
    enr_id = enr_resp.json()["id"]

    resp = client.get(f"/api/v1/enrollments/{enr_id}", headers=auth_header(learner))
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == enr_id
    assert data["course_id"] == course.id

# 15. Learner cannot view another learner's enrollment details
def test_15_learner_cannot_view_another_learners_enrollment_details(client, db_session):
    instructor = create_user(db_session, "inst_enr_15@platform.com", role="instructor")
    learner1 = create_user(db_session, "learner_enr_15a@platform.com", role="learner")
    learner2 = create_user(db_session, "learner_enr_15b@platform.com", role="learner")
    course = create_course(db_session, instructor.id, "Course 15", status="published")

    enr_resp = client.post(f"/api/v1/courses/{course.id}/enroll", headers=auth_header(learner1))
    enr_id = enr_resp.json()["id"]

    resp = client.get(f"/api/v1/enrollments/{enr_id}", headers=auth_header(learner2))
    assert resp.status_code == 403
    assert "access denied" in resp.json()["detail"].lower()

# 16. Password fields never appear in responses
def test_16_password_fields_never_appear_in_responses(client, db_session):
    instructor = create_user(db_session, "inst_enr_16@platform.com", role="instructor", password="SuperSecretInstructorPass!")
    learner = create_user(db_session, "learner_enr_16@platform.com", role="learner", password="SuperSecretLearnerPass!")
    course = create_course(db_session, instructor.id, "Course 16", status="published")

    enr_resp = client.post(f"/api/v1/courses/{course.id}/enroll", headers=auth_header(learner))
    enr_id = enr_resp.json()["id"]

    endpoints = [
        client.get(f"/api/v1/enrollments/{enr_id}", headers=auth_header(learner)),
        client.get("/api/v1/enrollments/my", headers=auth_header(learner)),
        client.get(f"/api/v1/courses/{course.id}/enrollments", headers=auth_header(instructor)),
    ]

    for resp in endpoints:
        assert resp.status_code == 200
        text = resp.text.lower()
        assert "hashed_password" not in text
        assert "supersecret" not in text

# 17. Appropriate deletion/drop behavior
def test_17_learner_can_unenroll_from_course(client, db_session):
    instructor = create_user(db_session, "inst_enr_17@platform.com", role="instructor")
    learner = create_user(db_session, "learner_enr_17@platform.com", role="learner")
    course = create_course(db_session, instructor.id, "Course 17", status="published")

    enr_resp = client.post(f"/api/v1/courses/{course.id}/enroll", headers=auth_header(learner))
    enr_id = enr_resp.json()["id"]

    # Delete / unenroll
    del_resp = client.delete(f"/api/v1/enrollments/{enr_id}", headers=auth_header(learner))
    assert del_resp.status_code == 200
    assert "successfully unenrolled" in del_resp.json()["message"].lower()

    # Verify enrollment is gone
    check_resp = client.get(f"/api/v1/enrollments/{enr_id}", headers=auth_header(learner))
    assert check_resp.status_code == 404

# 18. Learner cannot delete another learner's enrollment
def test_18_learner_cannot_delete_another_learners_enrollment(client, db_session):
    instructor = create_user(db_session, "inst_enr_18@platform.com", role="instructor")
    learner1 = create_user(db_session, "learner_enr_18a@platform.com", role="learner")
    learner2 = create_user(db_session, "learner_enr_18b@platform.com", role="learner")
    course = create_course(db_session, instructor.id, "Course 18", status="published")

    enr_resp = client.post(f"/api/v1/courses/{course.id}/enroll", headers=auth_header(learner1))
    enr_id = enr_resp.json()["id"]

    del_resp = client.delete(f"/api/v1/enrollments/{enr_id}", headers=auth_header(learner2))
    assert del_resp.status_code == 403

# 19. Existing course deletion protection still works
def test_19_existing_course_deletion_protection_still_works(client, db_session):
    admin = create_user(db_session, "admin_enr_19@platform.com", role="super_admin")
    instructor = create_user(db_session, "inst_enr_19@platform.com", role="instructor")
    learner = create_user(db_session, "learner_enr_19@platform.com", role="learner")
    course = create_course(db_session, instructor.id, "Course 19", status="published")

    client.post(f"/api/v1/courses/{course.id}/enroll", headers=auth_header(learner))

    # Deleting course must fail with 409 Conflict
    del_course_resp = client.delete(f"/api/v1/courses/{course.id}", headers=auth_header(admin))
    assert del_course_resp.status_code == 409
    assert "enrolled" in del_course_resp.json()["detail"].lower()
