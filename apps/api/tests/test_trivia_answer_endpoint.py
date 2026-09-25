from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

KIMBERLEY_ANSWER_URL = "/waypoints/station-kimberley/trivia/answer"
CORRECT_PAYLOAD = {"sessionId": "unused", "selectedOptionIndex": 0}  # answer_index 0
INCORRECT_PAYLOAD = {"sessionId": "unused", "selectedOptionIndex": 99}


def _payload(session_id: str, selected_option_index: int) -> dict:
    return {"sessionId": session_id, "selectedOptionIndex": selected_option_index}


def _session_header(session_id: str) -> dict:
    return {"X-Session-Id": session_id}


# --- Correct / incorrect answers (DoD item 1 + 4) -------------------------


def test_correct_answer_awards_stamp():
    session_id = "test-session-1"
    response = client.post(
        KIMBERLEY_ANSWER_URL,
        json=_payload(session_id, 0),  # 0 is the real correct index
        headers=_session_header(session_id),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["correct"] is True
    assert data["stampAwarded"] is not None
    assert data["stampAwarded"]["waypointId"] == "station-kimberley"

    # Verify passport reflects the stamp.
    p_res = client.get(f"/passport/{session_id}")
    assert p_res.status_code == 200
    passport = p_res.json()
    assert len(passport["stamps"]) == 1


def test_incorrect_answer_no_stamp():
    session_id = "test-session-2"
    response = client.post(
        KIMBERLEY_ANSWER_URL,
        json=_payload(session_id, 99),
        headers=_session_header(session_id),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["correct"] is False
    assert data["stampAwarded"] is None


def test_unknown_waypoint_returns_404_not_a_wrong_answer():
    response = client.post(
        "/waypoints/station-nonexistent/trivia/answer",
        json=_payload("test-session-404", 0),
        headers=_session_header("test-session-404"),
    )
    assert response.status_code == 404


def test_get_trivia_still_does_not_leak_the_answer_for_this_waypoint():
    response = client.get("/waypoints/station-kimberley/trivia")
    assert response.status_code == 200
    for question in response.json():
        assert "answer_index" not in question
        assert "explanation" not in question


# --- Rate limiting (DoD item 2 + 3) ---------------------------------------


def test_rate_limiting_rapid_submissions():
    session_id = "test-session-rate"
    headers = _session_header(session_id)
    for _ in range(5):
        response = client.post(
            KIMBERLEY_ANSWER_URL, json=_payload(session_id, 99), headers=headers
        )
        assert response.status_code == 200

    # 6th request in the same minute, same session, must be blocked.
    blocked = client.post(
        KIMBERLEY_ANSWER_URL, json=_payload(session_id, 99), headers=headers
    )
    assert blocked.status_code == 429
    assert blocked.status_code != 500


def test_rate_limit_exceeded_response_has_retry_after_header():
    session_id = "test-session-retry-after"
    headers = _session_header(session_id)
    for _ in range(5):
        client.post(
            KIMBERLEY_ANSWER_URL, json=_payload(session_id, 99), headers=headers
        )

    blocked = client.post(
        KIMBERLEY_ANSWER_URL, json=_payload(session_id, 99), headers=headers
    )
    assert blocked.status_code == 429
    header_names = {name.lower() for name in blocked.headers}
    assert "retry-after" in header_names


def test_rate_limit_is_scoped_per_session_not_shared_globally():
    # Exhaust session A's budget...
    session_a = _session_header("session-a")
    for _ in range(5):
        client.post(
            KIMBERLEY_ANSWER_URL, json=_payload("session-a", 99), headers=session_a
        )
    exhausted = client.post(
        KIMBERLEY_ANSWER_URL, json=_payload("session-a", 99), headers=session_a
    )
    assert exhausted.status_code == 429

    # ...session B should be unaffected, even though both requests come
    # from the same test-client IP address.
    session_b = _session_header("session-b")
    fresh = client.post(
        KIMBERLEY_ANSWER_URL, json=_payload("session-b", 99), headers=session_b
    )
    assert fresh.status_code == 200


# --- Passport sanity check (unrelated to trivia rate limiting, kept from
#     the existing suite - a fresh session should never start pre-ranked) --


def test_fabricated_client_rank_rejected():
    session_id = "new-user-cheater"
    p_res = client.get(f"/passport/{session_id}")
    data = p_res.json()
    assert data["rank"] == "Stoker"
    assert data["totalScore"] == 0
