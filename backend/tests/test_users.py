def test_users_router_mounted(client):
    response = client.get("/api/v1/users/")
    assert response.status_code == 200
    data = response.json()
    assert data["module"] == "users"
    assert "description" in data
