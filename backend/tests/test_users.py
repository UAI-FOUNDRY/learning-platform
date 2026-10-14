import pytest
from app.models.user import User
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

# 1. Authenticated user can get own profile
def test_1_authenticated_user_can_get_own_profile(client, db_session):
    user = create_user(db_session, "profile_user@example.com", full_name="Profile User", role="learner")
    response = client.get("/api/v1/users/me", headers=auth_header(user))
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == user.id
    assert data["email"] == "profile_user@example.com"
    assert data["full_name"] == "Profile User"
    assert data["role"] == "learner"

# 2. Unauthenticated user cannot get own profile
def test_2_unauthenticated_user_cannot_get_own_profile(client):
    response = client.get("/api/v1/users/me")
    assert response.status_code == 401

# 3. User can update own full_name
def test_3_user_can_update_own_full_name(client, db_session):
    user = create_user(db_session, "update_name@example.com", full_name="Original Name")
    response = client.put(
        "/api/v1/users/me",
        headers=auth_header(user),
        json={"full_name": "Updated Full Name"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Updated Full Name"

    # Verify directly in DB
    refreshed = db_session.query(User).filter(User.id == user.id).first()
    assert refreshed.full_name == "Updated Full Name"

# 4. User cannot change their own role
def test_4_user_cannot_change_their_own_role(client, db_session):
    user = create_user(db_session, "role_escalate@example.com", full_name="Escalate User", role="learner")
    response = client.put(
        "/api/v1/users/me",
        headers=auth_header(user),
        json={"full_name": "Legit Name", "role": "super_admin"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "learner"
    assert data["role"] != "super_admin"
    assert data["role"] != "admin"

    # Verify directly in DB
    refreshed = db_session.query(User).filter(User.id == user.id).first()
    assert refreshed.role == "learner"

# 5. User cannot change their own email
def test_5_user_cannot_change_their_own_email(client, db_session):
    user = create_user(db_session, "email_lock@example.com", full_name="Locked Email")
    response = client.put(
        "/api/v1/users/me",
        headers=auth_header(user),
        json={"email": "hacked_email@example.com", "full_name": "New Name"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "email_lock@example.com"

    refreshed = db_session.query(User).filter(User.id == user.id).first()
    assert refreshed.email == "email_lock@example.com"

# 6. Updated profile is returned correctly
def test_6_updated_profile_is_returned_correctly(client, db_session):
    user = create_user(db_session, "profile_return@example.com", full_name="Initial Name")
    response = client.put(
        "/api/v1/users/me",
        headers=auth_header(user),
        json={"full_name": "Complete Return Test"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert "email" in data
    assert "full_name" in data
    assert "role" in data
    assert "created_at" in data
    assert "updated_at" in data
    assert data["full_name"] == "Complete Return Test"

# 7. Super Admin can list users
def test_7_super_admin_can_list_users(client, db_session):
    super_admin = create_user(db_session, "superadmin_lister@example.com", role="super_admin")
    response = client.get("/api/v1/users", headers=auth_header(super_admin))
    assert response.status_code == 200
    data = response.json()
    assert "users" in data
    assert "total" in data
    assert "page" in data
    assert "limit" in data
    assert "total_pages" in data
    assert isinstance(data["users"], list)
    assert len(data["users"]) >= 1

# 8. Non-super-admin cannot list all users
def test_8_non_super_admin_cannot_list_all_users(client, db_session):
    learner = create_user(db_session, "learner_lister@example.com", role="learner")
    response = client.get("/api/v1/users", headers=auth_header(learner))
    assert response.status_code == 403

    instructor = create_user(db_session, "instructor_lister@example.com", role="instructor")
    inst_response = client.get("/api/v1/users", headers=auth_header(instructor))
    assert inst_response.status_code == 403

    unauth_response = client.get("/api/v1/users")
    assert unauth_response.status_code == 401

# 9. Super Admin can get a specific user
def test_9_super_admin_can_get_a_specific_user(client, db_session):
    super_admin = create_user(db_session, "superadmin_get@example.com", role="super_admin")
    target = create_user(db_session, "target_user@example.com", full_name="Target User", role="learner")
    response = client.get(f"/api/v1/users/{target.id}", headers=auth_header(super_admin))
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == target.id
    assert data["email"] == target.email
    assert data["full_name"] == target.full_name

# 10. Non-super-admin cannot get another user's details through admin endpoint
def test_10_non_super_admin_cannot_get_another_user_details(client, db_session):
    learner = create_user(db_session, "regular_peek@example.com", role="learner")
    instructor = create_user(db_session, "instructor_peek@example.com", role="instructor")
    target = create_user(db_session, "target_peek@example.com", role="learner")

    response = client.get(f"/api/v1/users/{target.id}", headers=auth_header(learner))
    assert response.status_code == 403

    inst_response = client.get(f"/api/v1/users/{target.id}", headers=auth_header(instructor))
    assert inst_response.status_code == 403

# 11. Super Admin can update another user's allowed fields
def test_11_super_admin_can_update_another_user_allowed_fields(client, db_session):
    super_admin = create_user(db_session, "superadmin_updater@example.com", role="super_admin")
    target = create_user(db_session, "target_to_update@example.com", full_name="Before Admin Update")
    response = client.put(
        f"/api/v1/users/{target.id}",
        headers=auth_header(super_admin),
        json={"full_name": "After Admin Update"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "After Admin Update"

    refreshed = db_session.query(User).filter(User.id == target.id).first()
    assert refreshed.full_name == "After Admin Update"

# 12. Super Admin can change another user's role if permitted by the role system
def test_12_super_admin_can_change_another_user_role(client, db_session):
    super_admin = create_user(db_session, "superadmin_promoter@example.com", role="super_admin")
    target = create_user(db_session, "promote_me@example.com", role="learner")
    response = client.put(
        f"/api/v1/users/{target.id}",
        headers=auth_header(super_admin),
        json={"role": "instructor"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "instructor"

    refreshed = db_session.query(User).filter(User.id == target.id).first()
    assert refreshed.role == "instructor"

# 13. Unauthorized user cannot change another user's role
def test_13_unauthorized_user_cannot_change_another_user_role(client, db_session):
    learner = create_user(db_session, "learner_hacker@example.com", role="learner")
    instructor = create_user(db_session, "instructor_hacker@example.com", role="instructor")
    target = create_user(db_session, "innocent_target@example.com", role="learner")

    response = client.put(
        f"/api/v1/users/{target.id}",
        headers=auth_header(learner),
        json={"role": "super_admin"}
    )
    assert response.status_code == 403

    inst_response = client.put(
        f"/api/v1/users/{target.id}",
        headers=auth_header(instructor),
        json={"role": "super_admin"}
    )
    assert inst_response.status_code == 403

    refreshed = db_session.query(User).filter(User.id == target.id).first()
    assert refreshed.role == "learner"

# 14. Super Admin can delete a user if deletion is safely supported
def test_14_super_admin_can_delete_a_user_safely(client, db_session):
    super_admin = create_user(db_session, "superadmin_deleter@example.com", role="super_admin")
    target = create_user(db_session, "delete_me@example.com", role="learner")
    response = client.delete(f"/api/v1/users/{target.id}", headers=auth_header(super_admin))
    assert response.status_code == 200
    data = response.json()
    assert "deleted successfully" in data["message"].lower()

    # Confirm user is removed from database
    assert db_session.query(User).filter(User.id == target.id).first() is None

# 15. Non-super-admin cannot delete users
def test_15_non_super_admin_cannot_delete_users(client, db_session):
    learner = create_user(db_session, "bad_deleter@example.com", role="learner")
    instructor = create_user(db_session, "bad_inst_deleter@example.com", role="instructor")
    target = create_user(db_session, "stay_alive@example.com", role="learner")

    response = client.delete(f"/api/v1/users/{target.id}", headers=auth_header(learner))
    assert response.status_code == 403

    inst_response = client.delete(f"/api/v1/users/{target.id}", headers=auth_header(instructor))
    assert inst_response.status_code == 403

    # Confirm user was NOT deleted
    assert db_session.query(User).filter(User.id == target.id).first() is not None

# 16. Nonexistent user returns 404
def test_16_nonexistent_user_returns_404(client, db_session):
    super_admin = create_user(db_session, "superadmin_404@example.com", role="super_admin")
    ghost_id = "ghost-user-nonexistent-1234"

    res_get = client.get(f"/api/v1/users/{ghost_id}", headers=auth_header(super_admin))
    assert res_get.status_code == 404
    assert res_get.json()["detail"] == "User not found"

    res_put = client.put(f"/api/v1/users/{ghost_id}", headers=auth_header(super_admin), json={"full_name": "Ghost"})
    assert res_put.status_code == 404
    assert res_put.json()["detail"] == "User not found"

    res_del = client.delete(f"/api/v1/users/{ghost_id}", headers=auth_header(super_admin))
    assert res_del.status_code == 404
    assert res_del.json()["detail"] == "User not found"

# 17. Search works
def test_17_search_works(client, db_session):
    super_admin = create_user(db_session, "superadmin_searcher@example.com", role="super_admin")
    create_user(db_session, "rohan.sharma@example.com", full_name="Rohan Sharma", role="learner")
    create_user(db_session, "anita.desai@example.com", full_name="Anita Desai", role="learner")

    # Search by full name keyword
    response = client.get("/api/v1/users?search=rohan", headers=auth_header(super_admin))
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    found_emails = [u["email"] for u in data["users"]]
    assert "rohan.sharma@example.com" in found_emails
    assert "anita.desai@example.com" not in found_emails

    # Search by email keyword
    response_email = client.get("/api/v1/users?search=anita.desai", headers=auth_header(super_admin))
    assert response_email.status_code == 200
    data_email = response_email.json()
    assert "anita.desai@example.com" in [u["email"] for u in data_email["users"]]
    assert "rohan.sharma@example.com" not in [u["email"] for u in data_email["users"]]

# 18. Role filtering works
def test_18_role_filtering_works(client, db_session):
    super_admin = create_user(db_session, "superadmin_role_filter@example.com", role="super_admin")
    create_user(db_session, "filter_learner@example.com", role="learner")
    create_user(db_session, "filter_instructor@example.com", role="instructor")

    response = client.get("/api/v1/users?role=instructor", headers=auth_header(super_admin))
    assert response.status_code == 200
    data = response.json()
    assert len(data["users"]) >= 1
    for u in data["users"]:
        assert u["role"] == "instructor"

# 19. Pagination works
def test_19_pagination_works(client, db_session):
    super_admin = create_user(db_session, "superadmin_paginator@example.com", role="super_admin")
    for i in range(5):
        create_user(db_session, f"page_user_{i}@example.com", full_name=f"Page User {i}")

    response = client.get("/api/v1/users?page=1&limit=2", headers=auth_header(super_admin))
    assert response.status_code == 200
    data = response.json()
    assert len(data["users"]) == 2
    assert data["page"] == 1
    assert data["limit"] == 2
    assert data["total"] >= 5
    assert data["total_pages"] >= 3

    # Invalid pagination rejected with 422
    invalid_resp = client.get("/api/v1/users?page=-100", headers=auth_header(super_admin))
    assert invalid_resp.status_code == 422

# 20. User responses never contain hashed_password
def test_20_user_responses_never_contain_hashed_password(client, db_session):
    super_admin = create_user(db_session, "superadmin_security@example.com", role="super_admin")
    target = create_user(db_session, "target_security@example.com", role="learner")

    endpoints_to_check = [
        client.get("/api/v1/users/me", headers=auth_header(target)),
        client.put("/api/v1/users/me", headers=auth_header(target), json={"full_name": "Safe User"}),
        client.get("/api/v1/users", headers=auth_header(super_admin)),
        client.get(f"/api/v1/users/{target.id}", headers=auth_header(super_admin)),
        client.put(f"/api/v1/users/{target.id}", headers=auth_header(super_admin), json={"full_name": "Admin Safe"}),
    ]

    for resp in endpoints_to_check:
        assert resp.status_code == 200
        text = resp.text
        assert "password" not in text.lower() or "hashed_password" not in text
        json_data = resp.json()
        if "users" in json_data:
            for u in json_data["users"]:
                assert "hashed_password" not in u
                assert "password" not in u
        else:
            assert "hashed_password" not in json_data
            assert "password" not in json_data

# 21. AdminUserUpdate with role="admin" is rejected with validation error
def test_21_admin_user_update_with_admin_role_rejected(client, db_session):
    super_admin = create_user(db_session, "superadmin_role_validator@example.com", role="super_admin")
    target = create_user(db_session, "target_for_invalid_role@example.com", role="learner")

    # Attempt to set role to "admin"
    response = client.put(
        f"/api/v1/users/{target.id}",
        headers=auth_header(super_admin),
        json={"role": "admin"}
    )
    assert response.status_code == 422
    error_detail = response.json()["detail"]
    assert any("role must be one of" in str(err).lower() for err in error_detail)

    # Ensure DB role did not change
    refreshed = db_session.query(User).filter(User.id == target.id).first()
    assert refreshed.role == "learner"

# 22. A test user with role="admin" cannot access administrative user endpoints and receives 403
def test_22_legacy_admin_role_rejected_on_user_management(client, db_session):
    legacy_admin = create_user(db_session, "legacy_admin_user@example.com", role="admin")
    target = create_user(db_session, "target_from_legacy@example.com", role="learner")

    # 1. GET /api/v1/users
    res_list = client.get("/api/v1/users", headers=auth_header(legacy_admin))
    assert res_list.status_code == 403
    assert "insufficient permissions" in res_list.json()["detail"].lower()

    # 2. GET /api/v1/users/{user_id}
    res_get = client.get(f"/api/v1/users/{target.id}", headers=auth_header(legacy_admin))
    assert res_get.status_code == 403
    assert "insufficient permissions" in res_get.json()["detail"].lower()

    # 3. PUT /api/v1/users/{user_id}
    res_put = client.put(
        f"/api/v1/users/{target.id}",
        headers=auth_header(legacy_admin),
        json={"full_name": "Hacked Name"}
    )
    assert res_put.status_code == 403
    assert "insufficient permissions" in res_put.json()["detail"].lower()

    # 4. DELETE /api/v1/users/{user_id}
    res_del = client.delete(f"/api/v1/users/{target.id}", headers=auth_header(legacy_admin))
    assert res_del.status_code == 403
    assert "insufficient permissions" in res_del.json()["detail"].lower()

    # Verify target was not modified or deleted
    refreshed = db_session.query(User).filter(User.id == target.id).first()
    assert refreshed is not None
    assert refreshed.full_name != "Hacked Name"
