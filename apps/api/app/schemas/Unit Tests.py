from apps.api.app.schemas.waypoint import Waypoint
from fastapi import FastAPI
from fastapi.testclient import TestClient

app = FastAPI()


@app.post("/test/waypoint")
async def validate_waypoint(data: Waypoint):
    return data


client = TestClient(app)


def test_valid_waypoint_passes():
    payload = {
        "id": "WP_DE_AAR",
        "name": "De Aar Station",
        "latitude": -30.6497,
        "longitude": 24.0122,
        "elevation_meters": 1240.0,
        "tags": ["heritage", "karoo"],
    }
    response = client.post("/test/waypoint", json=payload)
    assert response.status_code == 200


def test_malformed_latitude_rejected_with_422():
    # Invalid latitude > 90
    payload = {
        "id": "WP_INVALID",
        "name": "Invalid Location",
        "latitude": 105.0,
        "longitude": 24.0122,
    }
    response = client.post("/test/waypoint", json=payload)
    assert response.status_code == 422
    assert response.json()["detail"][0]["type"] == "less_than_equal"


def test_divergent_extra_field_rejected_with_422():
    # Attempting to send an undocumented field forbidden by extra = 'forbid'
    payload = {
        "id": "WP_DE_AAR",
        "name": "De Aar Station",
        "latitude": -30.6497,
        "longitude": 24.0122,
        "invented_field": "Should fail contract",
    }
    response = client.post("/test/waypoint", json=payload)
    assert response.status_code == 422
