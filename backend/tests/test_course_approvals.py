import pytest
from app.models.user import User
from app.models.category import Category
from app.models.course import Course
from app.models.section import Section
from app.models.lecture import Lecture
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

def create_course_with_content(db, instructor_id, title="Complete Course", status="draft"):
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

    section = Section(course_id=course.id, title="Module 1", order_index=0)
    db.add(section)
    db.commit()
    db.refresh(section)

    lecture = Lecture(section_id=section.id, title="Lecture 1", duration=300, order_index=0)
    db.add(lecture)
    db.commit()
    db.refresh(lecture)

    return course, section, lecture

# 1. Instructor can submit own draft course
def test_1_instructor_can_submit_own_draft_course(client, db_session):
    instructor = create_user(db_session, "inst_sub_1@platform.com", role="instructor")
    course, _, _ = create_course_with_content(db_session, instructor.id, "Course Submit 1")

    resp = client.post(f"/api/v1/courses/{course.id}/submit", headers=auth_header(instructor))
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == CourseStatus.PENDING_REVIEW
    assert data["submitted_at"] is not None

# 2. Instructor cannot submit another instructor's course
def test_2_instructor_cannot_submit_another_instructors_course(client, db_session):
    inst1 = create_user(db_session, "inst_sub_2a@platform.com", role="instructor")
    inst2 = create_user(db_session, "inst_sub_2b@platform.com", role="instructor")
    course, _, _ = create_course_with_content(db_session, inst1.id, "Course Submit 2")

    resp = client.post(f"/api/v1/courses/{course.id}/submit", headers=auth_header(inst2))
    assert resp.status_code == 403
    assert "own courses" in resp.json()["detail"].lower()

# 3. Learner cannot submit a course
def test_3_learner_cannot_submit_a_course(client, db_session):
    instructor = create_user(db_session, "inst_sub_3@platform.com", role="instructor")
    learner = create_user(db_session, "learner_sub_3@platform.com", role="learner")
    course, _, _ = create_course_with_content(db_session, instructor.id, "Course Submit 3")

    resp = client.post(f"/api/v1/courses/{course.id}/submit", headers=auth_header(learner))
    assert resp.status_code == 403

# 4. Empty course cannot be submitted
def test_4_empty_course_cannot_be_submitted(client, db_session):
    instructor = create_user(db_session, "inst_sub_4@platform.com", role="instructor")
    cat = Category(name="Cat 4", slug="cat-4")
    db_session.add(cat)
    db_session.commit()

    course = Course(title="Empty Course", instructor_id=instructor.id, category_id=cat.id, status="draft")
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)

    resp = client.post(f"/api/v1/courses/{course.id}/submit", headers=auth_header(instructor))
    assert resp.status_code == 400
    assert "at least one section and at least one lecture" in resp.json()["detail"].lower()

# 5. Course without lectures cannot be submitted
def test_5_course_without_lectures_cannot_be_submitted(client, db_session):
    instructor = create_user(db_session, "inst_sub_5@platform.com", role="instructor")
    cat = Category(name="Cat 5", slug="cat-5")
    db_session.add(cat)
    db_session.commit()

    course = Course(title="Section Only Course", instructor_id=instructor.id, category_id=cat.id, status="draft")
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)

    sec = Section(course_id=course.id, title="Section Without Lecture", order_index=0)
    db_session.add(sec)
    db_session.commit()

    resp = client.post(f"/api/v1/courses/{course.id}/submit", headers=auth_header(instructor))
    assert resp.status_code == 400
    assert "at least one section and at least one lecture" in resp.json()["detail"].lower()

# 6. Duplicate submission is rejected
def test_6_duplicate_submission_is_rejected(client, db_session):
    instructor = create_user(db_session, "inst_sub_6@platform.com", role="instructor")
    course, _, _ = create_course_with_content(db_session, instructor.id, "Course Submit 6", status="pending_review")

    resp = client.post(f"/api/v1/courses/{course.id}/submit", headers=auth_header(instructor))
    assert resp.status_code == 400
    assert "already pending review" in resp.json()["detail"].lower()

# 7. Super Admin can list pending courses
def test_7_super_admin_can_list_pending_courses(client, db_session):
    admin = create_user(db_session, "admin_pending_7@platform.com", role="super_admin")
    instructor = create_user(db_session, "inst_pending_7@platform.com", role="instructor")
    c1, _, _ = create_course_with_content(db_session, instructor.id, "Pending Course 7A", status="pending_review")
    c2, _, _ = create_course_with_content(db_session, instructor.id, "Draft Course 7B", status="draft")

    resp = client.get("/api/v1/admin/courses/pending", headers=auth_header(admin))
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    ids = [c["id"] for c in data]
    assert c1.id in ids
    assert c2.id not in ids

# 8. Instructor cannot access the pending-review queue
def test_8_instructor_cannot_access_pending_review_queue(client, db_session):
    instructor = create_user(db_session, "inst_pending_8@platform.com", role="instructor")
    resp = client.get("/api/v1/admin/courses/pending", headers=auth_header(instructor))
    assert resp.status_code == 403

# 9. Learner cannot access the pending-review queue
def test_9_learner_cannot_access_pending_review_queue(client, db_session):
    learner = create_user(db_session, "learner_pending_9@platform.com", role="learner")
    resp = client.get("/api/v1/admin/courses/pending", headers=auth_header(learner))
    assert resp.status_code == 403

# 10. Super Admin can approve a pending course
def test_10_super_admin_can_approve_pending_course(client, db_session):
    admin = create_user(db_session, "admin_appr_10@platform.com", role="super_admin")
    instructor = create_user(db_session, "inst_appr_10@platform.com", role="instructor")
    course, _, _ = create_course_with_content(db_session, instructor.id, "Course Appr 10", status="pending_review")

    resp = client.post(f"/api/v1/admin/courses/{course.id}/approve", headers=auth_header(admin))
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == CourseStatus.PUBLISHED
    assert data["reviewer_id"] == admin.id
    assert data["reviewed_at"] is not None

# 11. Instructor cannot approve a course
def test_11_instructor_cannot_approve_course(client, db_session):
    instructor = create_user(db_session, "inst_appr_11@platform.com", role="instructor")
    course, _, _ = create_course_with_content(db_session, instructor.id, "Course Appr 11", status="pending_review")

    resp = client.post(f"/api/v1/admin/courses/{course.id}/approve", headers=auth_header(instructor))
    assert resp.status_code == 403

# 12. Learner cannot approve a course
def test_12_learner_cannot_approve_course(client, db_session):
    instructor = create_user(db_session, "inst_appr_12@platform.com", role="instructor")
    learner = create_user(db_session, "learner_appr_12@platform.com", role="learner")
    course, _, _ = create_course_with_content(db_session, instructor.id, "Course Appr 12", status="pending_review")

    resp = client.post(f"/api/v1/admin/courses/{course.id}/approve", headers=auth_header(learner))
    assert resp.status_code == 403

# 13. Approval of non-pending course is rejected
def test_13_approval_of_non_pending_course_rejected(client, db_session):
    admin = create_user(db_session, "admin_appr_13@platform.com", role="super_admin")
    instructor = create_user(db_session, "inst_appr_13@platform.com", role="instructor")
    course, _, _ = create_course_with_content(db_session, instructor.id, "Course Appr 13", status="draft")

    resp = client.post(f"/api/v1/admin/courses/{course.id}/approve", headers=auth_header(admin))
    assert resp.status_code == 400
    assert "pending_review" in resp.json()["detail"].lower()

# 14. Self-approval is blocked
def test_14_self_approval_is_blocked(client, db_session):
    admin_inst = create_user(db_session, "admin_inst_14@platform.com", role="super_admin")
    course, _, _ = create_course_with_content(db_session, admin_inst.id, "Self Course 14", status="pending_review")

    resp = client.post(f"/api/v1/admin/courses/{course.id}/approve", headers=auth_header(admin_inst))
    assert resp.status_code == 403
    assert "cannot approve their own" in resp.json()["detail"].lower()

# 15. Super Admin can request changes
def test_15_super_admin_can_request_changes(client, db_session):
    admin = create_user(db_session, "admin_req_15@platform.com", role="super_admin")
    instructor = create_user(db_session, "inst_req_15@platform.com", role="instructor")
    course, _, _ = create_course_with_content(db_session, instructor.id, "Course Req 15", status="pending_review")

    feedback_text = "Please add video transcript to Lecture 1."
    resp = client.post(
        f"/api/v1/admin/courses/{course.id}/request-changes",
        headers=auth_header(admin),
        json={"feedback": feedback_text}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == CourseStatus.CHANGES_REQUESTED
    assert data["review_feedback"] == feedback_text
    assert data["reviewer_id"] == admin.id

# 16. Empty feedback is rejected
def test_16_empty_feedback_rejected(client, db_session):
    admin = create_user(db_session, "admin_req_16@platform.com", role="super_admin")
    instructor = create_user(db_session, "inst_req_16@platform.com", role="instructor")
    course, _, _ = create_course_with_content(db_session, instructor.id, "Course Req 16", status="pending_review")

    resp = client.post(
        f"/api/v1/admin/courses/{course.id}/request-changes",
        headers=auth_header(admin),
        json={"feedback": "   "}
    )
    assert resp.status_code == 422

# 17. Excessively long feedback is rejected
def test_17_excessively_long_feedback_rejected(client, db_session):
    admin = create_user(db_session, "admin_req_17@platform.com", role="super_admin")
    instructor = create_user(db_session, "inst_req_17@platform.com", role="instructor")
    course, _, _ = create_course_with_content(db_session, instructor.id, "Course Req 17", status="pending_review")

    resp = client.post(
        f"/api/v1/admin/courses/{course.id}/request-changes",
        headers=auth_header(admin),
        json={"feedback": "A" * 2001}
    )
    assert resp.status_code == 422

# 18. Super Admin can reject a course
def test_18_super_admin_can_reject_a_course(client, db_session):
    admin = create_user(db_session, "admin_rej_18@platform.com", role="super_admin")
    instructor = create_user(db_session, "inst_rej_18@platform.com", role="instructor")
    course, _, _ = create_course_with_content(db_session, instructor.id, "Course Rej 18", status="pending_review")

    reason_text = "Content does not meet quality standards."
    resp = client.post(
        f"/api/v1/admin/courses/{course.id}/reject",
        headers=auth_header(admin),
        json={"reason": reason_text}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == CourseStatus.REJECTED
    assert data["review_feedback"] == reason_text
    assert data["reviewer_id"] == admin.id

# 19. Empty rejection reason is rejected
def test_19_empty_rejection_reason_rejected(client, db_session):
    admin = create_user(db_session, "admin_rej_19@platform.com", role="super_admin")
    instructor = create_user(db_session, "inst_rej_19@platform.com", role="instructor")
    course, _, _ = create_course_with_content(db_session, instructor.id, "Course Rej 19", status="pending_review")

    resp = client.post(
        f"/api/v1/admin/courses/{course.id}/reject",
        headers=auth_header(admin),
        json={"reason": "   "}
    )
    assert resp.status_code == 422

# 20. Excessively long rejection reason is rejected
def test_20_excessively_long_rejection_reason_rejected(client, db_session):
    admin = create_user(db_session, "admin_rej_20@platform.com", role="super_admin")
    instructor = create_user(db_session, "inst_rej_20@platform.com", role="instructor")
    course, _, _ = create_course_with_content(db_session, instructor.id, "Course Rej 20", status="pending_review")

    resp = client.post(
        f"/api/v1/admin/courses/{course.id}/reject",
        headers=auth_header(admin),
        json={"reason": "R" * 2001}
    )
    assert resp.status_code == 422

# 21. Instructor can edit a changes_requested course
def test_21_instructor_can_edit_changes_requested_course(client, db_session):
    instructor = create_user(db_session, "inst_edit_21@platform.com", role="instructor")
    course, _, _ = create_course_with_content(db_session, instructor.id, "Course Edit 21", status="changes_requested")

    resp = client.put(
        f"/api/v1/courses/{course.id}",
        headers=auth_header(instructor),
        json={"title": "Course Edit 21 Improved"}
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Course Edit 21 Improved"

# 22. Instructor can resubmit after changes
def test_22_instructor_can_resubmit_after_changes(client, db_session):
    instructor = create_user(db_session, "inst_resub_22@platform.com", role="instructor")
    course, _, _ = create_course_with_content(db_session, instructor.id, "Course Resub 22", status="changes_requested")

    resp = client.post(f"/api/v1/courses/{course.id}/submit", headers=auth_header(instructor))
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == CourseStatus.PENDING_REVIEW
    assert data["review_feedback"] is None

# 23. Instructor cannot edit a pending_review course
def test_23_instructor_cannot_edit_pending_review_course(client, db_session):
    instructor = create_user(db_session, "inst_lock_23@platform.com", role="instructor")
    course, _, _ = create_course_with_content(db_session, instructor.id, "Course Lock 23", status="pending_review")

    resp = client.put(
        f"/api/v1/courses/{course.id}",
        headers=auth_header(instructor),
        json={"title": "Hacked Title During Review"}
    )
    assert resp.status_code == 409
    assert "pending review" in resp.json()["detail"].lower()

# 24. Instructor cannot modify sections during review
def test_24_instructor_cannot_modify_sections_during_review(client, db_session):
    instructor = create_user(db_session, "inst_lock_24@platform.com", role="instructor")
    course, section, _ = create_course_with_content(db_session, instructor.id, "Course Lock 24", status="pending_review")

    # Attempt create section
    r1 = client.post(
        f"/api/v1/courses/{course.id}/sections",
        headers=auth_header(instructor),
        json={"title": "New Section During Review"}
    )
    assert r1.status_code == 409

    # Attempt update section
    r2 = client.put(
        f"/api/v1/sections/{section.id}",
        headers=auth_header(instructor),
        json={"title": "Updated Section During Review"}
    )
    assert r2.status_code == 409

    # Attempt delete section
    r3 = client.delete(
        f"/api/v1/sections/{section.id}",
        headers=auth_header(instructor)
    )
    assert r3.status_code == 409

# 25. Instructor cannot modify lectures during review
def test_25_instructor_cannot_modify_lectures_during_review(client, db_session):
    instructor = create_user(db_session, "inst_lock_25@platform.com", role="instructor")
    course, section, lecture = create_course_with_content(db_session, instructor.id, "Course Lock 25", status="pending_review")

    # Attempt create lecture
    r1 = client.post(
        f"/api/v1/sections/{section.id}/lectures",
        headers=auth_header(instructor),
        json={"title": "New Lecture During Review"}
    )
    assert r1.status_code == 409

    # Attempt update lecture
    r2 = client.put(
        f"/api/v1/lectures/{lecture.id}",
        headers=auth_header(instructor),
        json={"title": "Updated Lecture During Review"}
    )
    assert r2.status_code == 409

    # Attempt delete lecture
    r3 = client.delete(
        f"/api/v1/lectures/{lecture.id}",
        headers=auth_header(instructor)
    )
    assert r3.status_code == 409

# 26. Learner cannot list draft courses
def test_26_learner_cannot_list_draft_courses(client, db_session):
    learner = create_user(db_session, "learner_vis_26@platform.com", role="learner")
    instructor = create_user(db_session, "inst_vis_26@platform.com", role="instructor")
    draft_c, _, _ = create_course_with_content(db_session, instructor.id, "Draft Hidden 26", status="draft")
    pub_c, _, _ = create_course_with_content(db_session, instructor.id, "Published Visible 26", status="published")

    resp = client.get("/api/v1/courses", headers=auth_header(learner))
    assert resp.status_code == 200
    ids = [c["id"] for c in resp.json()]
    assert pub_c.id in ids
    assert draft_c.id not in ids

# 27. Learner cannot retrieve draft courses
def test_27_learner_cannot_retrieve_draft_courses(client, db_session):
    learner = create_user(db_session, "learner_vis_27@platform.com", role="learner")
    instructor = create_user(db_session, "inst_vis_27@platform.com", role="instructor")
    draft_c, _, _ = create_course_with_content(db_session, instructor.id, "Draft Hidden 27", status="draft")

    resp = client.get(f"/api/v1/courses/{draft_c.id}", headers=auth_header(learner))
    assert resp.status_code == 404

# 28. Learner cannot retrieve pending-review courses
def test_28_learner_cannot_retrieve_pending_review_courses(client, db_session):
    learner = create_user(db_session, "learner_vis_28@platform.com", role="learner")
    instructor = create_user(db_session, "inst_vis_28@platform.com", role="instructor")
    pending_c, _, _ = create_course_with_content(db_session, instructor.id, "Pending Hidden 28", status="pending_review")

    resp = client.get(f"/api/v1/courses/{pending_c.id}", headers=auth_header(learner))
    assert resp.status_code == 404

# 29. Learner can retrieve published courses
def test_29_learner_can_retrieve_published_courses(client, db_session):
    learner = create_user(db_session, "learner_vis_29@platform.com", role="learner")
    instructor = create_user(db_session, "inst_vis_29@platform.com", role="instructor")
    pub_c, _, _ = create_course_with_content(db_session, instructor.id, "Published Visible 29", status="published")

    resp = client.get(f"/api/v1/courses/{pub_c.id}", headers=auth_header(learner))
    assert resp.status_code == 200
    assert resp.json()["id"] == pub_c.id
    assert resp.json()["status"] == CourseStatus.PUBLISHED

# 30. Review metadata is recorded correctly
def test_30_review_metadata_recorded_correctly(client, db_session):
    admin = create_user(db_session, "admin_meta_30@platform.com", role="super_admin")
    instructor = create_user(db_session, "inst_meta_30@platform.com", role="instructor")
    course, _, _ = create_course_with_content(db_session, instructor.id, "Meta Course 30", status="pending_review")

    resp = client.post(
        f"/api/v1/admin/courses/{course.id}/request-changes",
        headers=auth_header(admin),
        json={"feedback": "Detail feedback notes"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["reviewer_id"] == admin.id
    assert data["review_feedback"] == "Detail feedback notes"
    assert data["reviewed_at"] is not None

# 31. Internal feedback is not exposed to unauthorized learners
def test_31_internal_feedback_not_exposed_to_learners(client, db_session):
    learner = create_user(db_session, "learner_meta_31@platform.com", role="learner")
    instructor = create_user(db_session, "inst_meta_31@platform.com", role="instructor")
    course, _, _ = create_course_with_content(db_session, instructor.id, "Meta Course 31", status="published")

    # Manually set review_feedback on DB
    course.review_feedback = "Confidential internal review note"
    db_session.commit()

    resp = client.get(f"/api/v1/courses/{course.id}", headers=auth_header(learner))
    assert resp.status_code == 200
    assert resp.json()["review_feedback"] is None

# 32. Invalid status transitions are rejected
def test_32_invalid_status_transitions_rejected(client, db_session):
    admin = create_user(db_session, "admin_trans_32@platform.com", role="super_admin")
    instructor = create_user(db_session, "inst_trans_32@platform.com", role="instructor")
    course, _, _ = create_course_with_content(db_session, instructor.id, "Trans Course 32", status="published")

    # Cannot submit published course
    r1 = client.post(f"/api/v1/courses/{course.id}/submit", headers=auth_header(instructor))
    assert r1.status_code == 400

    # Cannot approve published course
    r2 = client.post(f"/api/v1/admin/courses/{course.id}/approve", headers=auth_header(admin))
    assert r2.status_code == 400

    # Cannot request changes on published course
    r3 = client.post(f"/api/v1/admin/courses/{course.id}/request-changes", headers=auth_header(admin), json={"feedback": "Notes"})
    assert r3.status_code == 400

    # Cannot reject published course
    r4 = client.post(f"/api/v1/admin/courses/{course.id}/reject", headers=auth_header(admin), json={"reason": "Reason"})
    assert r4.status_code == 400

# 33. Existing course CRUD behavior remains correct
def test_33_existing_course_crud_behavior_remains_correct(client, db_session):
    instructor = create_user(db_session, "inst_crud_33@platform.com", role="instructor")
    cat = Category(name="Cat 33", slug="cat-33")
    db_session.add(cat)
    db_session.commit()

    # Create
    create_resp = client.post(
        "/api/v1/courses",
        headers=auth_header(instructor),
        json={"title": "CRUD Course 33", "category_id": cat.id}
    )
    assert create_resp.status_code == 201
    course_id = create_resp.json()["id"]
    assert create_resp.json()["status"] == CourseStatus.DRAFT

    # Update
    update_resp = client.put(
        f"/api/v1/courses/{course_id}",
        headers=auth_header(instructor),
        json={"title": "Updated CRUD Course 33"}
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["title"] == "Updated CRUD Course 33"

    # Delete
    del_resp = client.delete(f"/api/v1/courses/{course_id}", headers=auth_header(instructor))
    assert del_resp.status_code == 200
