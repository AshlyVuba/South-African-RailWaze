from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

TRIVIA_URL = "/waypoints/WP_PRETORIA/trivia"
LIMIT = 30  # keep in sync with @limiter.limit("30/minute") on the route


def test_trivia_endpoint_allows_requests_within_the_limit():
    for _ in range(LIMIT):
        response = client.get(TRIVIA_URL)
        assert response.status_code == 200


def test_trivia_endpoint_blocks_requests_over_the_limit():
    for _ in range(LIMIT):
        client.get(TRIVIA_URL)

    limited_response = client.get(TRIVIA_URL)
    assert limited_response.status_code == 429


def test_other_waypoint_endpoints_are_not_rate_limited_at_30_per_minute():
    # Sanity check that the limit is scoped to the trivia route, not global.
    for _ in range(LIMIT + 5):
        response = client.get("/waypoints/WP_PRETORIA")
        assert response.status_code == 200