def test_quizzes_router_mounted(client):
    response = client.get("/api/v1/quizzes/")
    assert response.status_code == 200
    data = response.json()
    assert data["module"] == "quizzes"
    assert "description" in data
