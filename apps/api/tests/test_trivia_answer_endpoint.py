from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

def test_correct_answer_awards_stamp():
    session_id = "test-session-1"
    response = client.post(
        "/waypoints/kimberley/trivia/answer",
        json={"sessionId": session_id, "selectedOptionIndex": 0}  # assuming 0 is correct in test fixture
    )
    assert response.status_code == 200
    data = response.json()
    assert data["correct"] is True
    assert data["stampAwarded"] is not None

    # Verify passport reflects stamp
    p_res = client.get(f"/passport/{session_id}")
    assert p_res.status_code == 200
    passport = p_res.json()
    assert len(passport["stamps"]) == 1

def test_incorrect_answer_no_stamp():
    session_id = "test-session-2"
    response = client.post(
        "/waypoints/kimberley/trivia/answer",
        json={"sessionId": session_id, "selectedOptionIndex": 99}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["correct"] is False
    assert data["stampAwarded"] is None

def test_rate_limiting_rapid_submissions():
    session_id = "test-session-rate"
    for _ in range(5):
        client.post(
            "/waypoints/kimberley/trivia/answer",
            json={"sessionId": session_id, "selectedOptionIndex": 0}
        )
    # 6th request triggers 429
    blocked = client.post(
        "/waypoints/kimberley/trivia/answer",
        json={"sessionId": session_id, "selectedOptionIndex": 0}
    )
    assert blocked.status_code == 429

def test_fabricated_client_rank_rejected():
    # Calling GET compute endpoint ignores any client assumptions
    session_id = "new-user-cheater"
    p_res = client.get(f"/passport/{session_id}")
    data = p_res.json()
    assert data["rank"] == "Stoker"
    assert data["totalScore"] == 0