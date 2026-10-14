import pytest
from app.models.user import User
from app.models.category import Category
from app.models.course import Course
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

def create_category(db, name, slug, description=None):
    category = Category(name=name, slug=slug, description=description)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category

# ==========================================
# CREATE TESTS
# ==========================================

def test_admin_can_create_category(client, db_session):
    admin = create_user(db_session, "cat_admin@platform.com", role="admin")
    payload = {
        "name": "Cloud Computing",
        "slug": "cloud-computing",
        "description": "Courses covering AWS, GCP, and Azure technologies"
    }
    response = client.post("/api/v1/categories", headers=auth_header(admin), json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Cloud Computing"
    assert data["slug"] == "cloud-computing"
    assert data["description"] == payload["description"]
    assert "id" in data
    assert "created_at" in data

    # Verify directly in DB
    cat_in_db = db_session.query(Category).filter(Category.slug == "cloud-computing").first()
    assert cat_in_db is not None
    assert cat_in_db.name == "Cloud Computing"

def test_super_admin_can_create_category(client, db_session):
    super_admin = create_user(db_session, "cat_super@platform.com", role="super_admin")
    payload = {
        "name": "Machine Learning",
        "slug": "machine-learning",
        "description": "Artificial intelligence and statistical models"
    }
    response = client.post("/api/v1/categories", headers=auth_header(super_admin), json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Machine Learning"
    assert data["slug"] == "machine-learning"

def test_learner_cannot_create_category(client, db_session):
    learner = create_user(db_session, "cat_learner@platform.com", role="learner")
    payload = {"name": "Hacked Category", "slug": "hacked-category"}
    response = client.post("/api/v1/categories", headers=auth_header(learner), json=payload)
    assert response.status_code == 403
    assert "insufficient permissions" in response.json()["detail"].lower()

def test_instructor_cannot_create_category(client, db_session):
    instructor = create_user(db_session, "cat_instructor@platform.com", role="instructor")
    payload = {"name": "Instructor Category", "slug": "instructor-category"}
    response = client.post("/api/v1/categories", headers=auth_header(instructor), json=payload)
    assert response.status_code == 403
    assert "insufficient permissions" in response.json()["detail"].lower()

def test_unauthenticated_user_cannot_create_category(client):
    payload = {"name": "Public Category", "slug": "public-category"}
    response = client.post("/api/v1/categories", json=payload)
    assert response.status_code == 401

def test_duplicate_name_rejected(client, db_session):
    admin = create_user(db_session, "dup_name_admin@platform.com", role="admin")
    create_category(db_session, name="Cybersecurity", slug="cybersecurity-1")

    # Try creating with same name (even with different slug)
    payload = {"name": "Cybersecurity", "slug": "cybersecurity-2"}
    response = client.post("/api/v1/categories", headers=auth_header(admin), json=payload)
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"].lower()

def test_duplicate_slug_rejected(client, db_session):
    admin = create_user(db_session, "dup_slug_admin@platform.com", role="admin")
    create_category(db_session, name="Data Science", slug="data-science")

    # Try creating with different name but identical slug
    payload = {"name": "Applied Data Science", "slug": "data-science"}
    response = client.post("/api/v1/categories", headers=auth_header(admin), json=payload)
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"].lower()

def test_invalid_input_rejected(client, db_session):
    admin = create_user(db_session, "invalid_admin@platform.com", role="admin")

    # Empty name
    res1 = client.post("/api/v1/categories", headers=auth_header(admin), json={"name": "   ", "slug": "valid-slug"})
    assert res1.status_code in [400, 422]

    # Empty slug
    res2 = client.post("/api/v1/categories", headers=auth_header(admin), json={"name": "Valid Name", "slug": "   "})
    assert res2.status_code in [400, 422]

    # Invalid slug characters (spaces, special characters)
    res3 = client.post("/api/v1/categories", headers=auth_header(admin), json={"name": "Valid Name", "slug": "invalid slug @!"})
    assert res3.status_code in [400, 422]

# ==========================================
# READ TESTS
# ==========================================

def test_authenticated_user_can_list_categories(client, db_session):
    learner = create_user(db_session, "reader_learner@platform.com", role="learner")
    create_category(db_session, name="Web Development", slug="web-development")
    create_category(db_session, name="Mobile Development", slug="mobile-development")

    response = client.get("/api/v1/categories", headers=auth_header(learner))
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 2
    slugs = [c["slug"] for c in data]
    assert "web-development" in slugs
    assert "mobile-development" in slugs

def test_unauthenticated_user_cannot_list_categories(client):
    response = client.get("/api/v1/categories")
    assert response.status_code == 401

def test_authenticated_user_can_get_category_by_id(client, db_session):
    learner = create_user(db_session, "single_cat_learner@platform.com", role="learner")
    cat = create_category(db_session, name="DevOps", slug="devops", description="CI/CD and Infrastructure")

    response = client.get(f"/api/v1/categories/{cat.id}", headers=auth_header(learner))
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == cat.id
    assert data["name"] == "DevOps"
    assert data["slug"] == "devops"
    assert data["description"] == "CI/CD and Infrastructure"

def test_nonexistent_category_returns_404(client, db_session):
    learner = create_user(db_session, "nonexistent_reader@platform.com", role="learner")
    response = client.get("/api/v1/categories/non-existent-cat-id-999", headers=auth_header(learner))
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

# ==========================================
# UPDATE TESTS
# ==========================================

def test_admin_can_update_category(client, db_session):
    admin = create_user(db_session, "update_admin@platform.com", role="admin")
    cat = create_category(db_session, name="Old Name", slug="old-slug", description="Old description")

    update_payload = {
        "name": "New Category Name",
        "slug": "new-category-slug",
        "description": "Updated description text"
    }
    response = client.put(f"/api/v1/categories/{cat.id}", headers=auth_header(admin), json=update_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "New Category Name"
    assert data["slug"] == "new-category-slug"
    assert data["description"] == "Updated description text"

    # Verify directly in DB
    refreshed = db_session.query(Category).filter(Category.id == cat.id).first()
    assert refreshed.name == "New Category Name"
    assert refreshed.slug == "new-category-slug"

def test_super_admin_can_update_category(client, db_session):
    super_admin = create_user(db_session, "super_upd@platform.com", role="super_admin")
    cat = create_category(db_session, name="Super Target", slug="super-target")

    response = client.put(
        f"/api/v1/categories/{cat.id}",
        headers=auth_header(super_admin),
        json={"name": "Super Updated Name"}
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Super Updated Name"

def test_learner_cannot_update_category(client, db_session):
    learner = create_user(db_session, "learner_updater@platform.com", role="learner")
    cat = create_category(db_session, name="Protected Category", slug="protected-cat")

    response = client.put(
        f"/api/v1/categories/{cat.id}",
        headers=auth_header(learner),
        json={"name": "Learner Hacked Name"}
    )
    assert response.status_code == 403

def test_instructor_cannot_update_category(client, db_session):
    instructor = create_user(db_session, "inst_updater@platform.com", role="instructor")
    cat = create_category(db_session, name="Instructor Protected", slug="inst-protected")

    response = client.put(
        f"/api/v1/categories/{cat.id}",
        headers=auth_header(instructor),
        json={"name": "Instructor Modified"}
    )
    assert response.status_code == 403

def test_update_duplicate_name_rejected(client, db_session):
    admin = create_user(db_session, "dup_name_upd_admin@platform.com", role="admin")
    create_category(db_session, name="Frontend", slug="frontend")
    cat2 = create_category(db_session, name="Backend", slug="backend")

    # Try renaming Backend -> Frontend
    response = client.put(
        f"/api/v1/categories/{cat2.id}",
        headers=auth_header(admin),
        json={"name": "Frontend"}
    )
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"].lower()

def test_update_duplicate_slug_rejected(client, db_session):
    admin = create_user(db_session, "dup_slug_upd_admin@platform.com", role="admin")
    create_category(db_session, name="Database Systems", slug="database-systems")
    cat2 = create_category(db_session, name="NoSQL Databases", slug="nosql-databases")

    # Try changing slug to existing one
    response = client.put(
        f"/api/v1/categories/{cat2.id}",
        headers=auth_header(admin),
        json={"slug": "database-systems"}
    )
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"].lower()

def test_update_nonexistent_category_returns_404(client, db_session):
    admin = create_user(db_session, "upd_404_admin@platform.com", role="admin")
    response = client.put(
        "/api/v1/categories/nonexistent-cat-uuid-1234",
        headers=auth_header(admin),
        json={"name": "Does Not Matter"}
    )
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

# ==========================================
# DELETE TESTS
# ==========================================

def test_admin_can_delete_unused_category(client, db_session):
    admin = create_user(db_session, "del_admin@platform.com", role="admin")
    cat = create_category(db_session, name="To Delete", slug="to-delete")

    response = client.delete(f"/api/v1/categories/{cat.id}", headers=auth_header(admin))
    assert response.status_code == 200
    assert "deleted successfully" in response.json()["message"].lower()

    # Verify category is removed from DB
    assert db_session.query(Category).filter(Category.id == cat.id).first() is None

def test_super_admin_can_delete_unused_category(client, db_session):
    super_admin = create_user(db_session, "super_del@platform.com", role="super_admin")
    cat = create_category(db_session, name="Super To Delete", slug="super-to-delete")

    response = client.delete(f"/api/v1/categories/{cat.id}", headers=auth_header(super_admin))
    assert response.status_code == 200

    assert db_session.query(Category).filter(Category.id == cat.id).first() is None

def test_learner_cannot_delete_category(client, db_session):
    learner = create_user(db_session, "learner_del@platform.com", role="learner")
    cat = create_category(db_session, name="Safe From Learner", slug="safe-from-learner")

    response = client.delete(f"/api/v1/categories/{cat.id}", headers=auth_header(learner))
    assert response.status_code == 403

    # Verify not deleted
    assert db_session.query(Category).filter(Category.id == cat.id).first() is not None

def test_instructor_cannot_delete_category(client, db_session):
    instructor = create_user(db_session, "inst_del@platform.com", role="instructor")
    cat = create_category(db_session, name="Safe From Instructor", slug="safe-from-inst")

    response = client.delete(f"/api/v1/categories/{cat.id}", headers=auth_header(instructor))
    assert response.status_code == 403

    # Verify not deleted
    assert db_session.query(Category).filter(Category.id == cat.id).first() is not None

def test_delete_nonexistent_category_returns_404(client, db_session):
    admin = create_user(db_session, "del_404_admin@platform.com", role="admin")
    response = client.delete("/api/v1/categories/nonexistent-id-5678", headers=auth_header(admin))
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

def test_category_referenced_by_courses_cannot_be_deleted(client, db_session):
    admin = create_user(db_session, "course_fk_admin@platform.com", role="admin")
    instructor = create_user(db_session, "course_instructor@platform.com", role="instructor")
    cat = create_category(db_session, name="Course Bound Category", slug="course-bound-category")

    # Create a course assigned to this category
    course = Course(
        title="Full Stack Python Mastery",
        instructor_id=instructor.id,
        category_id=cat.id,
        status="PUBLISHED"
    )
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)

    # Attempt deletion of category that is referenced by a course
    response = client.delete(f"/api/v1/categories/{cat.id}", headers=auth_header(admin))
    assert response.status_code == 409
    data = response.json()
    assert "cannot delete category" in data["detail"].lower()
    assert "reference" in data["detail"].lower()

    # Verify category is still intact in the database
    assert db_session.query(Category).filter(Category.id == cat.id).first() is not None

    # Disassociate the course and retry deletion
    course.category_id = None
    db_session.commit()

    del_response = client.delete(f"/api/v1/categories/{cat.id}", headers=auth_header(admin))
    assert del_response.status_code == 200
    assert db_session.query(Category).filter(Category.id == cat.id).first() is None

# ==========================================
# PAGINATION TESTS
# ==========================================

def test_categories_pagination_support(client, db_session):
    learner = create_user(db_session, "page_learner@platform.com", role="learner")
    for i in range(5):
        create_category(db_session, name=f"Pagination Test {i}", slug=f"pagination-test-{i}")

    response = client.get("/api/v1/categories?page=1&limit=2", headers=auth_header(learner))
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
