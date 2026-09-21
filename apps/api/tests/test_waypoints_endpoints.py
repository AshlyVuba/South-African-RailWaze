from app.main import app  # Changed from apps.api.app.main
from fastapi.testclient import TestClient

client = TestClient(app)


def test_get_all_waypoints_returns_4_anchors():
    response = client.get("/waypoints")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 4
    station_ids = [wp["id"] for wp in data]
    assert "WP_PRETORIA" in station_ids
    assert "WP_DE_AAR" in station_ids


def test_get_valid_waypoint_by_id():
    response = client.get("/waypoints/WP_KIMBERLEY")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Kimberley Station"
    assert data["latitude"] == -28.7419


def test_get_invalid_waypoint_returns_404():
    response = client.get("/waypoints/WP_NON_EXISTENT")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_get_waypoint_trivia_returns_validated_questions():
    response = client.get("/waypoints/WP_MATJIESFONTEIN/trivia")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["waypoint_id"] == "WP_MATJIESFONTEIN"
    assert "options" in data[0]


client = TestClient(app)


def test_get_all_waypoints_returns_4_anchors():
    response = client.get("/waypoints")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 4
    station_ids = [wp["id"] for wp in data]
    assert "WP_PRETORIA" in station_ids
    assert "WP_DE_AAR" in station_ids


def test_get_valid_waypoint_by_id():
    response = client.get("/waypoints/WP_KIMBERLEY")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Kimberley Station"
    assert data["latitude"] == -28.7419


def test_get_invalid_waypoint_returns_404():
    response = client.get("/waypoints/WP_NON_EXISTENT")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_get_waypoint_trivia_returns_validated_questions():
    response = client.get("/waypoints/WP_MATJIESFONTEIN/trivia")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["waypoint_id"] == "WP_MATJIESFONTEIN"
    assert "options" in data[0]
