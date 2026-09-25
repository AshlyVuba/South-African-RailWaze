"""
We spin up a tiny sibling FastAPI app wired to the SAME handler functions
the real app uses, plus two throwaway routes whose only job is to fail on
purpose. We don't add fail-on-purpose routes to app.main itself - a
production app shouldn't ship a route that exists solely to blow up.
"""

from app.middleware.error_handler import (
    generic_exception_handler,
    http_exception_handler,
    validation_exception_handler,
)
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.testclient import TestClient
from starlette.exceptions import HTTPException as StarletteHTTPException

_probe_app = FastAPI()
_probe_app.add_exception_handler(StarletteHTTPException, http_exception_handler)
_probe_app.add_exception_handler(RequestValidationError, validation_exception_handler)
_probe_app.add_exception_handler(Exception, generic_exception_handler)


@_probe_app.get("/boom")
def boom():
    raise ValueError("super secret internal detail: db password is hunter2")


@_probe_app.get("/items/{item_id}")
def get_item(item_id: int):
    return {"item_id": item_id}


# raise_server_exceptions=False is required here - otherwise TestClient
# re-raises the unhandled exception in-process instead of letting us see
# the 500 response our handler actually produces.
client = TestClient(_probe_app, raise_server_exceptions=False)


def test_unhandled_exception_returns_consistent_shape():
    response = client.get("/boom")
    assert response.status_code == 500
    body = response.json()
    assert body == {
        "error": {
            "code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred on the server.",
            "details": None,
        }
    }


def test_unhandled_exception_does_not_leak_internal_details():
    response = client.get("/boom")
    assert "hunter2" not in response.text
    assert "Traceback" not in response.text
    assert "ValueError" not in response.text


def test_validation_error_returns_consistent_shape():
    response = client.get("/items/not-an-integer")
    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert body["error"]["message"] == "Invalid request payload or parameters"
    assert isinstance(body["error"]["details"], list)
    assert len(body["error"]["details"]) > 0
