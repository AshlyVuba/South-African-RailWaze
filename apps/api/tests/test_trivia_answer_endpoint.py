from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

VALID_TRIVIA_ID = "trivia-pretoria-nzasm"  # NZASM question, correct answer_index 1


def test_malformed_payload_missing_required_field_returns_422():
    response = client.post("/trivia/answer", json={"trivia_id": VALID_TRIVIA_ID})
    assert response.status_code == 422


def test_malformed_payload_with_unexpected_extra_field_returns_422():
    response = client.post(
        "/trivia/answer",
        json={
            "trivia_id": VALID_TRIVIA_ID,
            "selected_index": 1,
            "unexpected_field": "nope",
        },
    )
    assert response.status_code == 422


def test_malformed_payload_with_out_of_range_index_returns_422():
    response = client.post(
        "/trivia/answer",
        json={"trivia_id": VALID_TRIVIA_ID, "selected_index": 7},
    )
    assert response.status_code == 422


def test_malformed_payload_with_wrong_type_returns_422():
    response = client.post(
        "/trivia/answer",
        json={"trivia_id": VALID_TRIVIA_ID, "selected_index": "not-a-number"},
    )
    assert response.status_code == 422


def test_correct_answer_is_recognized():
    response = client.post(
        "/trivia/answer",
        json={"trivia_id": VALID_TRIVIA_ID, "selected_index": 1},
    )
    assert response.status_code == 200
    assert response.json()["correct"] is True


def test_incorrect_answer_is_recognized():
    response = client.post(
        "/trivia/answer",
        json={"trivia_id": VALID_TRIVIA_ID, "selected_index": 0},
    )
    assert response.status_code == 200
    assert response.json()["correct"] is False


def test_unknown_trivia_id_returns_404_not_422():
    response = client.post(
        "/trivia/answer",
        json={"trivia_id": "trivia-does-not-exist", "selected_index": 0},
    )
    assert response.status_code == 404