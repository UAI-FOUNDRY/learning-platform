def test_enrollments_router_mounted(client):
    response = client.get("/api/v1/enrollments/")
    assert response.status_code == 200
    data = response.json()
    assert data["module"] == "enrollments"
    assert "description" in data
