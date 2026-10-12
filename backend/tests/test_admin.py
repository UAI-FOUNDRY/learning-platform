def test_admin_router_mounted(client):
    response = client.get("/api/v1/admin/")
    assert response.status_code == 200
    data = response.json()
    assert data["module"] == "admin"
    assert "description" in data
