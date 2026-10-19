import pytest
from app.models.user import User
from app.models.category import Category
from app.models.course import Course
from app.models.section import Section
from app.models.lecture import Lecture
from app.models.enrollment import Enrollment
from app.models.progress import Progress
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

def create_course_and_section(db, instructor_id, title="Test Course", section_title="Test Section"):
    category = Category(name=f"Cat-{title}", slug=f"cat-{title.lower().replace(' ', '-')}")
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

    section = Section(
        course_id=course.id,
        title=section_title,
        order_index=0
    )
    db.add(section)
    db.commit()
    db.refresh(section)
    return course, section

# 1. super_admin can create lecture
def test_1_super_admin_can_create_lecture(client, db_session):
    admin = create_user(db_session, "superadmin_lec@platform.com", role="super_admin")
    instructor = create_user(db_session, "inst_lec_1@platform.com", role="instructor")
    course, section = create_course_and_section(db_session, instructor.id, "Admin Lecture Course")

    payload = {
        "title": "Welcome and Overview",
        "content_url": "https://storage.example.com/videos/welcome.mp4",
        "duration": 300,
        "order_index": 1
    }
    resp = client.post(f"/api/v1/sections/{section.id}/lectures", headers=auth_header(admin), json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Welcome and Overview"
    assert data["content_url"] == "https://storage.example.com/videos/welcome.mp4"
    assert data["duration"] == 300
    assert data["order_index"] == 1
    assert data["section_id"] == section.id
    assert "id" in data
    assert "password" not in data
    assert "hashed_password" not in data

# 2. instructor can create lecture in own course
def test_2_instructor_can_create_lecture_in_own_course(client, db_session):
    instructor = create_user(db_session, "inst_lec_2@platform.com", role="instructor")
    course, section = create_course_and_section(db_session, instructor.id, "Instructor Lecture Course")

    payload = {
        "title": "Deep Dive into AsyncIO",
        "content_url": "s3://bucket/asyncio.mp4",
        "duration": 1200
    }
    resp = client.post(f"/api/v1/sections/{section.id}/lectures", headers=auth_header(instructor), json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Deep Dive into AsyncIO"
    assert data["duration"] == 1200

# 3. instructor cannot create lecture in another instructor's course
def test_3_instructor_cannot_create_lecture_in_another_instructors_course(client, db_session):
    inst1 = create_user(db_session, "inst1_lec_3@platform.com", role="instructor")
    inst2 = create_user(db_session, "inst2_lec_3@platform.com", role="instructor")
    course, section = create_course_and_section(db_session, inst1.id, "Course 3")

    payload = {"title": "Intruder Lecture"}
    resp = client.post(f"/api/v1/sections/{section.id}/lectures", headers=auth_header(inst2), json=payload)
    assert resp.status_code == 403
    assert "own courses" in resp.json()["detail"].lower()

# 4. learner cannot create lecture
def test_4_learner_cannot_create_lecture(client, db_session):
    instructor = create_user(db_session, "inst_lec_4@platform.com", role="instructor")
    learner = create_user(db_session, "learner_lec_4@platform.com", role="learner")
    course, section = create_course_and_section(db_session, instructor.id, "Course 4")

    payload = {"title": "Learner Lecture"}
    resp = client.post(f"/api/v1/sections/{section.id}/lectures", headers=auth_header(learner), json=payload)
    assert resp.status_code == 403

# 5. list lectures
def test_5_list_lectures(client, db_session):
    instructor = create_user(db_session, "inst_lec_5@platform.com", role="instructor")
    learner = create_user(db_session, "learner_lec_5@platform.com", role="learner")
    course, section = create_course_and_section(db_session, instructor.id, "Course 5")
    course.status = "published"  # outline is public only for published courses
    db_session.commit()

    l1 = Lecture(section_id=section.id, title="Lec 1", duration=100, order_index=0)
    l2 = Lecture(section_id=section.id, title="Lec 2", duration=200, order_index=1)
    db_session.add_all([l1, l2])
    db_session.commit()

    resp = client.get(f"/api/v1/sections/{section.id}/lectures", headers=auth_header(learner))
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    assert data[0]["title"] == "Lec 1"
    assert data[1]["title"] == "Lec 2"

# 6. lectures ordered by order_index
def test_6_lectures_ordered_by_order_index(client, db_session):
    instructor = create_user(db_session, "inst_lec_6@platform.com", role="instructor")
    course, section = create_course_and_section(db_session, instructor.id, "Course 6")

    l_third = Lecture(section_id=section.id, title="Lec Third", order_index=15)
    l_first = Lecture(section_id=section.id, title="Lec First", order_index=2)
    l_second = Lecture(section_id=section.id, title="Lec Second", order_index=5)
    db_session.add_all([l_third, l_first, l_second])
    db_session.commit()

    resp = client.get(f"/api/v1/sections/{section.id}/lectures", headers=auth_header(instructor))
    assert resp.status_code == 200
    data = resp.json()
    assert [l["title"] for l in data] == ["Lec First", "Lec Second", "Lec Third"]

# 7. automatic order_index
def test_7_automatic_order_index(client, db_session):
    instructor = create_user(db_session, "inst_lec_7@platform.com", role="instructor")
    course, section = create_course_and_section(db_session, instructor.id, "Course 7")

    r1 = client.post(f"/api/v1/sections/{section.id}/lectures", headers=auth_header(instructor), json={"title": "Lec 1"})
    assert r1.status_code == 201
    assert r1.json()["order_index"] == 0

    r2 = client.post(f"/api/v1/sections/{section.id}/lectures", headers=auth_header(instructor), json={"title": "Lec 2"})
    assert r2.status_code == 201
    assert r2.json()["order_index"] == 1

    r3 = client.post(f"/api/v1/sections/{section.id}/lectures", headers=auth_header(instructor), json={"title": "Lec 3"})
    assert r3.status_code == 201
    assert r3.json()["order_index"] == 2

# 8. get lecture
def test_8_get_lecture(client, db_session):
    instructor = create_user(db_session, "inst_lec_8@platform.com", role="instructor")
    learner = create_user(db_session, "learner_lec_8@platform.com", role="learner")
    course, section = create_course_and_section(db_session, instructor.id, "Course 8")
    course.status = "published"  # outline is public only for published courses
    db_session.commit()

    lec = Lecture(section_id=section.id, title="Lecture Details", duration=600, order_index=0)
    db_session.add(lec)
    db_session.commit()
    db_session.refresh(lec)

    resp = client.get(f"/api/v1/lectures/{lec.id}", headers=auth_header(learner))
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == lec.id
    assert data["title"] == "Lecture Details"
    assert data["duration"] == 600

# 9. update lecture
def test_9_update_lecture(client, db_session):
    instructor = create_user(db_session, "inst_lec_9@platform.com", role="instructor")
    course, section = create_course_and_section(db_session, instructor.id, "Course 9")

    lec = Lecture(section_id=section.id, title="Original Title", duration=100, order_index=0)
    db_session.add(lec)
    db_session.commit()
    db_session.refresh(lec)

    update_payload = {
        "title": "Updated Title",
        "duration": 450,
        "content_url": "https://new.storage/video.mp4",
        "order_index": 5
    }
    resp = client.put(f"/api/v1/lectures/{lec.id}", headers=auth_header(instructor), json=update_payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Updated Title"
    assert data["duration"] == 450
    assert data["content_url"] == "https://new.storage/video.mp4"
    assert data["order_index"] == 5

# 10. instructor can update own lecture
def test_10_instructor_can_update_own_lecture(client, db_session):
    instructor = create_user(db_session, "inst_lec_10@platform.com", role="instructor")
    course, section = create_course_and_section(db_session, instructor.id, "Course 10")

    lec = Lecture(section_id=section.id, title="Initial Lec", order_index=0)
    db_session.add(lec)
    db_session.commit()
    db_session.refresh(lec)

    resp = client.put(f"/api/v1/lectures/{lec.id}", headers=auth_header(instructor), json={"title": "Owner Edited"})
    assert resp.status_code == 200
    assert resp.json()["title"] == "Owner Edited"

# 11. instructor cannot update another instructor's lecture
def test_11_instructor_cannot_update_another_instructors_lecture(client, db_session):
    inst1 = create_user(db_session, "inst1_lec_11@platform.com", role="instructor")
    inst2 = create_user(db_session, "inst2_lec_11@platform.com", role="instructor")
    course, section = create_course_and_section(db_session, inst1.id, "Course 11")

    lec = Lecture(section_id=section.id, title="Lec 11", order_index=0)
    db_session.add(lec)
    db_session.commit()
    db_session.refresh(lec)

    resp = client.put(f"/api/v1/lectures/{lec.id}", headers=auth_header(inst2), json={"title": "Hacked Lec"})
    assert resp.status_code == 403

# 12. learner cannot update
def test_12_learner_cannot_update_lecture(client, db_session):
    instructor = create_user(db_session, "inst_lec_12@platform.com", role="instructor")
    learner = create_user(db_session, "learner_lec_12@platform.com", role="learner")
    course, section = create_course_and_section(db_session, instructor.id, "Course 12")

    lec = Lecture(section_id=section.id, title="Lec 12", order_index=0)
    db_session.add(lec)
    db_session.commit()
    db_session.refresh(lec)

    resp = client.put(f"/api/v1/lectures/{lec.id}", headers=auth_header(learner), json={"title": "Learner Lec Edit"})
    assert resp.status_code == 403

# 13. super_admin can update
def test_13_super_admin_can_update_lecture(client, db_session):
    admin = create_user(db_session, "admin_lec_13@platform.com", role="super_admin")
    instructor = create_user(db_session, "inst_lec_13@platform.com", role="instructor")
    course, section = create_course_and_section(db_session, instructor.id, "Course 13")

    lec = Lecture(section_id=section.id, title="Lec 13", order_index=0)
    db_session.add(lec)
    db_session.commit()
    db_session.refresh(lec)

    resp = client.put(f"/api/v1/lectures/{lec.id}", headers=auth_header(admin), json={"title": "SuperAdmin Lec Edit"})
    assert resp.status_code == 200
    assert resp.json()["title"] == "SuperAdmin Lec Edit"

# 14. delete lecture
def test_14_delete_lecture(client, db_session):
    instructor = create_user(db_session, "inst_lec_14@platform.com", role="instructor")
    course, section = create_course_and_section(db_session, instructor.id, "Course 14")

    lec = Lecture(section_id=section.id, title="To Delete Lec", order_index=0)
    db_session.add(lec)
    db_session.commit()
    db_session.refresh(lec)

    resp = client.delete(f"/api/v1/lectures/{lec.id}", headers=auth_header(instructor))
    assert resp.status_code == 200
    assert resp.json()["message"] == "Lecture deleted successfully"

    # Confirm lecture is deleted
    check = client.get(f"/api/v1/lectures/{lec.id}", headers=auth_header(instructor))
    assert check.status_code == 404

# 15. learner cannot delete
def test_15_learner_cannot_delete_lecture(client, db_session):
    instructor = create_user(db_session, "inst_lec_15@platform.com", role="instructor")
    learner = create_user(db_session, "learner_lec_15@platform.com", role="learner")
    course, section = create_course_and_section(db_session, instructor.id, "Course 15")

    lec = Lecture(section_id=section.id, title="Lec 15", order_index=0)
    db_session.add(lec)
    db_session.commit()
    db_session.refresh(lec)

    resp = client.delete(f"/api/v1/lectures/{lec.id}", headers=auth_header(learner))
    assert resp.status_code == 403

# 16. missing section returns 404
def test_16_missing_section_returns_404(client, db_session):
    instructor = create_user(db_session, "inst_lec_16@platform.com", role="instructor")

    resp = client.post("/api/v1/sections/non-existent-section-id/lectures", headers=auth_header(instructor), json={"title": "Lec"})
    assert resp.status_code == 404
    detail = resp.json()["detail"].lower()
    assert "section" in detail and "not found" in detail

# 17. missing lecture returns 404
def test_17_missing_lecture_returns_404(client, db_session):
    instructor = create_user(db_session, "inst_lec_17@platform.com", role="instructor")

    resp = client.get("/api/v1/lectures/non-existent-lecture-id", headers=auth_header(instructor))
    assert resp.status_code == 404
    detail = resp.json()["detail"].lower()
    assert "lecture" in detail and "not found" in detail

# 18. invalid title returns 422
def test_18_invalid_title_returns_422(client, db_session):
    instructor = create_user(db_session, "inst_lec_18@platform.com", role="instructor")
    course, section = create_course_and_section(db_session, instructor.id, "Course 18")

    # Empty title
    resp1 = client.post(f"/api/v1/sections/{section.id}/lectures", headers=auth_header(instructor), json={"title": "   "})
    assert resp1.status_code == 422

    # Title exceeding 255 chars
    resp2 = client.post(f"/api/v1/sections/{section.id}/lectures", headers=auth_header(instructor), json={"title": "L" * 256})
    assert resp2.status_code == 422

# 19. negative duration returns 422
def test_19_negative_duration_returns_422(client, db_session):
    instructor = create_user(db_session, "inst_lec_19@platform.com", role="instructor")
    course, section = create_course_and_section(db_session, instructor.id, "Course 19")

    resp = client.post(f"/api/v1/sections/{section.id}/lectures", headers=auth_header(instructor), json={"title": "Lec", "duration": -5})
    assert resp.status_code == 422

# 20. negative order_index returns 422
def test_20_negative_order_index_returns_422(client, db_session):
    instructor = create_user(db_session, "inst_lec_20@platform.com", role="instructor")
    course, section = create_course_and_section(db_session, instructor.id, "Course 20")

    resp = client.post(f"/api/v1/sections/{section.id}/lectures", headers=auth_header(instructor), json={"title": "Lec", "order_index": -1})
    assert resp.status_code == 422

# 21. lecture deletion blocked when progress exists
def test_21_lecture_deletion_blocked_when_progress_exists(client, db_session):
    instructor = create_user(db_session, "inst_lec_21@platform.com", role="instructor")
    learner = create_user(db_session, "learner_lec_21@platform.com", role="learner")
    course, section = create_course_and_section(db_session, instructor.id, "Course 21")

    lec = Lecture(section_id=section.id, title="Lec with Progress", order_index=0)
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

    resp = client.delete(f"/api/v1/lectures/{lec.id}", headers=auth_header(instructor))
    assert resp.status_code == 409
    assert "learner progress records exist" in resp.json()["detail"].lower()
