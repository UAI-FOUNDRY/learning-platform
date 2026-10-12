def test_assignments_router_mounted(client):
    response = client.get("/api/v1/assignments/")
    assert response.status_code == 200
    data = response.json()
    assert data["module"] == "assignments"
    assert "description" in data
