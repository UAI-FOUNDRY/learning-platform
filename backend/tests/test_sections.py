import pytest
from app.models.user import User
from app.models.category import Category
from app.models.course import Course
from app.models.section import Section
from app.models.lecture import Lecture
from app.models.enrollment import Enrollment
from app.models.progress import Progress
from app.models.quiz import Quiz
from app.models.quiz_attempt import QuizAttempt
from app.models.assignment import Assignment
from app.models.submission import Submission
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

def create_course(db, instructor_id, title="Test Course"):
    category = Category(name="General Section Cat", slug=f"gen-sec-cat-{title.lower().replace(' ', '-')}")
    db.add(category)
    db.commit()
    db.refresh(category)

    course = Course(
        title=title,
        instructor_id=instructor_id,
        category_id=category.id,
        status="DRAFT"
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course

# 1. super_admin can create section
def test_1_super_admin_can_create_section(client, db_session):
    admin = create_user(db_session, "superadmin_sec@platform.com", role="super_admin")
    instructor = create_user(db_session, "inst_sec_1@platform.com", role="instructor")
    course = create_course(db_session, instructor.id, "Admin Section Course")

    payload = {"title": "Introduction to Python", "order_index": 1}
    resp = client.post(f"/api/v1/courses/{course.id}/sections", headers=auth_header(admin), json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Introduction to Python"
    assert data["order_index"] == 1
    assert data["course_id"] == course.id
    assert "id" in data
    assert "hashed_password" not in data
    assert "password" not in data

# 2. instructor can create section in own course
def test_2_instructor_can_create_section_in_own_course(client, db_session):
    instructor = create_user(db_session, "inst_sec_2@platform.com", role="instructor")
    course = create_course(db_session, instructor.id, "Instructor Section Course")

    payload = {"title": "Advanced Python Patterns", "order_index": 0}
    resp = client.post(f"/api/v1/courses/{course.id}/sections", headers=auth_header(instructor), json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Advanced Python Patterns"
    assert data["order_index"] == 0

# 3. instructor cannot create section in another instructor's course
def test_3_instructor_cannot_create_section_in_another_instructors_course(client, db_session):
    inst1 = create_user(db_session, "inst1_sec@platform.com", role="instructor")
    inst2 = create_user(db_session, "inst2_sec@platform.com", role="instructor")
    course1 = create_course(db_session, inst1.id, "Inst 1 Course")

    payload = {"title": "Unauthorized Section"}
    resp = client.post(f"/api/v1/courses/{course1.id}/sections", headers=auth_header(inst2), json=payload)
    assert resp.status_code == 403
    assert "own courses" in resp.json()["detail"].lower()

# 4. learner cannot create section
def test_4_learner_cannot_create_section(client, db_session):
    instructor = create_user(db_session, "inst_sec_4@platform.com", role="instructor")
    learner = create_user(db_session, "learner_sec_4@platform.com", role="learner")
    course = create_course(db_session, instructor.id, "Course 4")

    payload = {"title": "Learner Section"}
    resp = client.post(f"/api/v1/courses/{course.id}/sections", headers=auth_header(learner), json=payload)
    assert resp.status_code == 403

# 5. list sections
def test_5_list_sections(client, db_session):
    instructor = create_user(db_session, "inst_sec_5@platform.com", role="instructor")
    learner = create_user(db_session, "learner_sec_5@platform.com", role="learner")
    course = create_course(db_session, instructor.id, "Course 5")
    course.status = "published"  # outline is public only for published courses
    db_session.commit()

    s1 = Section(course_id=course.id, title="Sec 1", order_index=0)
    s2 = Section(course_id=course.id, title="Sec 2", order_index=1)
    db_session.add_all([s1, s2])
    db_session.commit()

    resp = client.get(f"/api/v1/courses/{course.id}/sections", headers=auth_header(learner))
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    assert data[0]["title"] == "Sec 1"
    assert data[1]["title"] == "Sec 2"

# 6. sections are ordered by order_index
def test_6_sections_ordered_by_order_index(client, db_session):
    instructor = create_user(db_session, "inst_sec_6@platform.com", role="instructor")
    course = create_course(db_session, instructor.id, "Course 6")

    s_third = Section(course_id=course.id, title="Third", order_index=10)
    s_first = Section(course_id=course.id, title="First", order_index=1)
    s_second = Section(course_id=course.id, title="Second", order_index=5)
    db_session.add_all([s_third, s_first, s_second])
    db_session.commit()

    resp = client.get(f"/api/v1/courses/{course.id}/sections", headers=auth_header(instructor))
    assert resp.status_code == 200
    data = resp.json()
    assert [s["title"] for s in data] == ["First", "Second", "Third"]

# 7. automatic order_index
def test_7_automatic_order_index(client, db_session):
    instructor = create_user(db_session, "inst_sec_7@platform.com", role="instructor")
    course = create_course(db_session, instructor.id, "Course 7")

    r1 = client.post(f"/api/v1/courses/{course.id}/sections", headers=auth_header(instructor), json={"title": "First Auto"})
    assert r1.status_code == 201
    assert r1.json()["order_index"] == 0

    r2 = client.post(f"/api/v1/courses/{course.id}/sections", headers=auth_header(instructor), json={"title": "Second Auto"})
    assert r2.status_code == 201
    assert r2.json()["order_index"] == 1

    r3 = client.post(f"/api/v1/courses/{course.id}/sections", headers=auth_header(instructor), json={"title": "Third Auto"})
    assert r3.status_code == 201
    assert r3.json()["order_index"] == 2

# 8. get section
def test_8_get_section(client, db_session):
    instructor = create_user(db_session, "inst_sec_8@platform.com", role="instructor")
    learner = create_user(db_session, "learner_sec_8@platform.com", role="learner")
    course = create_course(db_session, instructor.id, "Course 8")
    course.status = "published"  # outline is public only for published courses
    db_session.commit()

    sec = Section(course_id=course.id, title="Detail Section", order_index=0)
    db_session.add(sec)
    db_session.commit()
    db_session.refresh(sec)

    resp = client.get(f"/api/v1/sections/{sec.id}", headers=auth_header(learner))
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == sec.id
    assert data["title"] == "Detail Section"

# 9. update section
def test_9_update_section(client, db_session):
    instructor = create_user(db_session, "inst_sec_9@platform.com", role="instructor")
    course = create_course(db_session, instructor.id, "Course 9")

    sec = Section(course_id=course.id, title="Old Title", order_index=0)
    db_session.add(sec)
    db_session.commit()
    db_session.refresh(sec)

    resp = client.put(f"/api/v1/sections/{sec.id}", headers=auth_header(instructor), json={"title": "New Title", "order_index": 3})
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "New Title"
    assert data["order_index"] == 3

# 10. instructor can update own section
def test_10_instructor_can_update_own_section(client, db_session):
    instructor = create_user(db_session, "inst_sec_10@platform.com", role="instructor")
    course = create_course(db_session, instructor.id, "Course 10")

    sec = Section(course_id=course.id, title="Initial Title", order_index=0)
    db_session.add(sec)
    db_session.commit()
    db_session.refresh(sec)

    resp = client.put(f"/api/v1/sections/{sec.id}", headers=auth_header(instructor), json={"title": "Updated by Owner"})
    assert resp.status_code == 200
    assert resp.json()["title"] == "Updated by Owner"

# 11. instructor cannot update another instructor's section
def test_11_instructor_cannot_update_another_instructors_section(client, db_session):
    inst1 = create_user(db_session, "inst1_sec_11@platform.com", role="instructor")
    inst2 = create_user(db_session, "inst2_sec_11@platform.com", role="instructor")
    course = create_course(db_session, inst1.id, "Course 11")

    sec = Section(course_id=course.id, title="Sec 11", order_index=0)
    db_session.add(sec)
    db_session.commit()
    db_session.refresh(sec)

    resp = client.put(f"/api/v1/sections/{sec.id}", headers=auth_header(inst2), json={"title": "Hacked Title"})
    assert resp.status_code == 403

# 12. learner cannot update
def test_12_learner_cannot_update_section(client, db_session):
    instructor = create_user(db_session, "inst_sec_12@platform.com", role="instructor")
    learner = create_user(db_session, "learner_sec_12@platform.com", role="learner")
    course = create_course(db_session, instructor.id, "Course 12")

    sec = Section(course_id=course.id, title="Sec 12", order_index=0)
    db_session.add(sec)
    db_session.commit()
    db_session.refresh(sec)

    resp = client.put(f"/api/v1/sections/{sec.id}", headers=auth_header(learner), json={"title": "Learner Edit"})
    assert resp.status_code == 403

# 13. super_admin can update
def test_13_super_admin_can_update_section(client, db_session):
    admin = create_user(db_session, "admin_sec_13@platform.com", role="super_admin")
    instructor = create_user(db_session, "inst_sec_13@platform.com", role="instructor")
    course = create_course(db_session, instructor.id, "Course 13")

    sec = Section(course_id=course.id, title="Sec 13", order_index=0)
    db_session.add(sec)
    db_session.commit()
    db_session.refresh(sec)

    resp = client.put(f"/api/v1/sections/{sec.id}", headers=auth_header(admin), json={"title": "Admin Updated"})
    assert resp.status_code == 200
    assert resp.json()["title"] == "Admin Updated"

# 14. delete section
def test_14_delete_section(client, db_session):
    instructor = create_user(db_session, "inst_sec_14@platform.com", role="instructor")
    course = create_course(db_session, instructor.id, "Course 14")

    sec = Section(course_id=course.id, title="To Delete", order_index=0)
    db_session.add(sec)
    db_session.commit()
    db_session.refresh(sec)

    resp = client.delete(f"/api/v1/sections/{sec.id}", headers=auth_header(instructor))
    assert resp.status_code == 200
    assert resp.json()["message"] == "Section deleted successfully"

    # Verify not found after delete
    check = client.get(f"/api/v1/sections/{sec.id}", headers=auth_header(instructor))
    assert check.status_code == 404

# 15. learner cannot delete
def test_15_learner_cannot_delete_section(client, db_session):
    instructor = create_user(db_session, "inst_sec_15@platform.com", role="instructor")
    learner = create_user(db_session, "learner_sec_15@platform.com", role="learner")
    course = create_course(db_session, instructor.id, "Course 15")

    sec = Section(course_id=course.id, title="Sec 15", order_index=0)
    db_session.add(sec)
    db_session.commit()
    db_session.refresh(sec)

    resp = client.delete(f"/api/v1/sections/{sec.id}", headers=auth_header(learner))
    assert resp.status_code == 403

# 16. missing course returns 404
def test_16_missing_course_returns_404(client, db_session):
    instructor = create_user(db_session, "inst_sec_16@platform.com", role="instructor")

    resp = client.post("/api/v1/courses/non-existent-course-id/sections", headers=auth_header(instructor), json={"title": "Sec"})
    assert resp.status_code == 404
    detail = resp.json()["detail"].lower()
    assert "course" in detail and "not found" in detail

# 17. missing section returns 404
def test_17_missing_section_returns_404(client, db_session):
    instructor = create_user(db_session, "inst_sec_17@platform.com", role="instructor")

    resp = client.get("/api/v1/sections/non-existent-section-id", headers=auth_header(instructor))
    assert resp.status_code == 404
    detail = resp.json()["detail"].lower()
    assert "section" in detail and "not found" in detail

# 18. invalid title returns 422
def test_18_invalid_title_returns_422(client, db_session):
    instructor = create_user(db_session, "inst_sec_18@platform.com", role="instructor")
    course = create_course(db_session, instructor.id, "Course 18")

    # Empty title
    resp1 = client.post(f"/api/v1/courses/{course.id}/sections", headers=auth_header(instructor), json={"title": "   "})
    assert resp1.status_code == 422

    # Title exceeding 255 chars
    resp2 = client.post(f"/api/v1/courses/{course.id}/sections", headers=auth_header(instructor), json={"title": "A" * 256})
    assert resp2.status_code == 422

# 19. invalid order_index returns 422
def test_19_invalid_order_index_returns_422(client, db_session):
    instructor = create_user(db_session, "inst_sec_19@platform.com", role="instructor")
    course = create_course(db_session, instructor.id, "Course 19")

    resp = client.post(f"/api/v1/courses/{course.id}/sections", headers=auth_header(instructor), json={"title": "Sec", "order_index": -1})
    assert resp.status_code == 422

# 20. section deletion blocked when learner progress exists
def test_20_section_deletion_blocked_when_learner_progress_exists(client, db_session):
    instructor = create_user(db_session, "inst_sec_20@platform.com", role="instructor")
    learner = create_user(db_session, "learner_sec_20@platform.com", role="learner")
    course = create_course(db_session, instructor.id, "Course 20")

    sec = Section(course_id=course.id, title="Sec with Progress", order_index=0)
    db_session.add(sec)
    db_session.commit()
    db_session.refresh(sec)

    lec = Lecture(section_id=sec.id, title="Lec 1", order_index=0)
    db_session.add(lec)
    db_session.commit()
    db_session.refresh(lec)

    enrollment = Enrollment(user_id=learner.id, course_id=course.id)
    db_session.add(enrollment)
    db_session.commit()
    db_session.refresh(enrollment)

    progress = Progress(enrollment_id=enrollment.id, lecture_id=lec.id, is_completed=True)
    db_session.add(progress)
    db_session.commit()

    resp = client.delete(f"/api/v1/sections/{sec.id}", headers=auth_header(instructor))
    assert resp.status_code == 409
    assert "learner progress records exist" in resp.json()["detail"].lower()

# 21. section deletion blocked when quiz attempts exist
def test_21_section_deletion_blocked_when_quiz_attempts_exist(client, db_session):
    instructor = create_user(db_session, "inst_sec_21@platform.com", role="instructor")
    learner = create_user(db_session, "learner_sec_21@platform.com", role="learner")
    course = create_course(db_session, instructor.id, "Course 21")

    sec = Section(course_id=course.id, title="Sec with Quiz", order_index=0)
    db_session.add(sec)
    db_session.commit()
    db_session.refresh(sec)

    quiz = Quiz(section_id=sec.id, title="Section Quiz", passing_score=75)
    db_session.add(quiz)
    db_session.commit()
    db_session.refresh(quiz)

    attempt = QuizAttempt(quiz_id=quiz.id, user_id=learner.id, score=85, passed=True)
    db_session.add(attempt)
    db_session.commit()

    resp = client.delete(f"/api/v1/sections/{sec.id}", headers=auth_header(instructor))
    assert resp.status_code == 409
    assert "quiz attempts exist" in resp.json()["detail"].lower()

# 22. section deletion blocked when assignment submissions exist
def test_22_section_deletion_blocked_when_assignment_submissions_exist(client, db_session):
    instructor = create_user(db_session, "inst_sec_22@platform.com", role="instructor")
    learner = create_user(db_session, "learner_sec_22@platform.com", role="learner")
    course = create_course(db_session, instructor.id, "Course 22")

    sec = Section(course_id=course.id, title="Sec with Assignment", order_index=0)
    db_session.add(sec)
    db_session.commit()
    db_session.refresh(sec)

    assignment = Assignment(section_id=sec.id, title="Section Project")
    db_session.add(assignment)
    db_session.commit()
    db_session.refresh(assignment)

    submission = Submission(assignment_id=assignment.id, user_id=learner.id, submission_url="https://github.com/test")
    db_session.add(submission)
    db_session.commit()

    resp = client.delete(f"/api/v1/sections/{sec.id}", headers=auth_header(instructor))
    assert resp.status_code == 409
    assert "assignment submissions exist" in resp.json()["detail"].lower()
