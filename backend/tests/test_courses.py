def test_courses_router_mounted(client):
    response = client.get("/api/v1/courses/")
    assert response.status_code == 200
    data = response.json()
    assert data["module"] == "courses"
    assert "description" in data
