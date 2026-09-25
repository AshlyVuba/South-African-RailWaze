from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_consistent_404_error_shape():
    response = client.get("/waypoints/WP_NON_EXISTENT")
    assert response.status_code == 404
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "HTTP_ERROR"
    assert "not found" in data["error"]["message"].lower()


def test_rate_limiting_429_trigger():
    # Fire 35 rapid requests (limit is set to 30/minute)
    responses = [client.get("/waypoints/WP_PRETORIA/trivia") for _ in range(35)]
    status_codes = [r.status_code for r in responses]

    # At least one request toward the end must hit 429 Rate Limit
    assert 429 in status_codes


def test_cors_origin_headers():
    response = client.options(
        "/waypoints",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert (
        response.headers.get("access-control-allow-origin") == "http://localhost:5173"
    )


def test_unhandled_exception_does_not_leak_stack_trace():
    # Verify global handler sanitizes unexpected exceptions
    import asyncio

    from fastapi import Request

    from app.middleware.error_handler import generic_exception_handler

    dummy_request = Request({"type": "http", "method": "GET", "path": "/test"})
    res = asyncio.run(
        generic_exception_handler(
            dummy_request,
            Exception("Secret DB String: postgresql://admin:secret@localhost:5432/db"),
        )
    )

    assert res.status_code == 500
    body = res.body.decode()
    assert "Secret DB String" not in body
    assert "An unexpected error occurred on the server." in body
