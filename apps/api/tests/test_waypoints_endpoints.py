from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_get_all_waypoints_returns_feature_collection_of_4_anchors():
    response = client.get("/waypoints")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) == 4
    station_ids = [f["id"] for f in data["features"]]
    assert "station-pretoria" in station_ids
    assert "station-cape-town" in station_ids


def test_get_valid_waypoint_by_id():
    response = client.get("/waypoints/station-kimberley")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "Feature"
    assert data["properties"]["name"] == "Kimberley"
    assert data["properties"]["lat"] == -28.7383
    assert data["geometry"]["coordinates"] == [24.7645, -28.7383]


def test_get_invalid_waypoint_returns_404():
    response = client.get("/waypoints/station-nonexistent")
    assert response.status_code == 404
    data = response.json()
    assert "error" in data
    assert "not found" in data["error"]["message"].lower()


def test_get_waypoint_trivia_returns_public_questions_without_answer():
    response = client.get("/waypoints/station-matjiesfontein/trivia")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["waypoint_id"] == "station-matjiesfontein"
    assert len(data[0]["options"]) == 4.0
    assert "answer_index" not in data[0]
    assert "explanation" not in data[0]
    assert set(data[0].keys()) == {"id", "waypoint_id", "question", "options"}
