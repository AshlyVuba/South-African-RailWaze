from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

# waypoint_id -> correct answer_index, from apps/api/app/data/trivia.json.
# Answering all four legitimately is the only way to reach "Rail Legend"
# (db/session_store.compute_rank requires stamp_count >= 4).
CORRECT_ANSWERS = {
    "station-pretoria": 1,
    "station-kimberley": 0,
    "station-matjiesfontein": 1,
    "station-cape-town": 1,
}


def _session_header(session_id: str) -> dict:
    return {"X-Session-Id": session_id}


def _answer(session_id: str, waypoint_id: str, selected_option_index: int):
    return client.post(
        f"/waypoints/{waypoint_id}/trivia/answer",
        json={"sessionId": session_id, "selectedOptionIndex": selected_option_index},
        headers=_session_header(session_id),
    )


def _get_passport(session_id: str, **query):
    return client.get(f"/passport/{session_id}", params=query or None)


# --- DoD item 1: rank/stamps computed server-side from trivia results -----


def test_fresh_session_starts_at_stoker_with_no_stamps():
    response = _get_passport("dod1-fresh-session")
    assert response.status_code == 200
    data = response.json()
    assert data["rank"] == "Stoker"
    assert data["currentRank"] == "Stoker"
    assert data["totalScore"] == 0
    assert data["stamps"] == []


def test_rank_progresses_only_as_real_trivia_is_answered_correctly():
    session_id = "dod1-legit-progression"

    # Zero stamps -> Stoker.
    assert _get_passport(session_id).json()["rank"] == "Stoker"

    # One correct answer -> Track Master.
    res = _answer(session_id, "station-pretoria", CORRECT_ANSWERS["station-pretoria"])
    assert res.status_code == 200 and res.json()["correct"] is True
    assert _get_passport(session_id).json()["rank"] == "Track Master"

    # Two more correct answers -> Karoo Scout (3 stamps).
    _answer(session_id, "station-kimberley", CORRECT_ANSWERS["station-kimberley"])
    _answer(
        session_id,
        "station-matjiesfontein",
        CORRECT_ANSWERS["station-matjiesfontein"],
    )
    passport = _get_passport(session_id).json()
    assert passport["rank"] == "Karoo Scout"
    assert len(passport["stamps"]) == 3

    # Fourth correct answer -> Rail Legend, earned honestly this time.
    _answer(session_id, "station-cape-town", CORRECT_ANSWERS["station-cape-town"])
    passport = _get_passport(session_id).json()
    assert passport["rank"] == "Rail Legend"
    assert passport["totalScore"] == 400
    assert len(passport["stamps"]) == 4


def test_get_passport_ignores_rank_and_score_passed_as_query_params():
    # Nothing in GET /passport/{sessionId} reads query params for rank/
    # score at all, but this locks that in explicitly rather than by
    # accident - a client cannot influence the response via the query
    # string either.
    session_id = "dod1-query-param-injection"
    response = _get_passport(
        session_id, rank="Rail Legend", score="999999", totalScore="999999"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["rank"] == "Stoker"
    assert data["totalScore"] == 0


# --- DoD item 2 + 3: POSTing a fabricated rank/stamp is rejected -----------


def test_post_fabricated_rail_legend_rank_is_rejected():
    session_id = "dod2-rank-cheater"

    response = client.post(
        f"/passport/{session_id}",
        json={
            "sessionId": session_id,
            "rank": "Rail Legend",
            "currentRank": "Rail Legend",
            "score": 999999,
            "totalScore": 999999,
        },
    )

    assert response.status_code == 405
    assert response.status_code != 200
    assert response.status_code != 201

    # Confirm the attempt left no trace: the session still reads back as
    # a brand-new, unranked traveler.
    passport = _get_passport(session_id).json()
    assert passport["rank"] == "Stoker"
    assert passport["totalScore"] == 0
    assert passport["stamps"] == []


def test_post_fabricated_stamp_is_rejected():
    session_id = "dod2-stamp-cheater"

    response = client.post(
        f"/passport/{session_id}",
        json={
            "sessionId": session_id,
            "collectedStamps": [
                {"waypointId": "station-cape-town", "stampId": "stamp-forged"}
            ],
            "stamps": [{"waypointId": "station-cape-town", "stampId": "stamp-forged"}],
        },
    )

    assert response.status_code == 405

    passport = _get_passport(session_id).json()
    assert passport["stamps"] == []
    assert passport["rank"] == "Stoker"


def test_put_and_delete_on_passport_are_also_rejected():
    # DoD calls out POST specifically, but the same "no client mutation"
    # rule should hold for any other write verb aimed at the same path.
    session_id = "dod2-other-verbs"

    assert (
            client.put(f"/passport/{session_id}", json={"rank": "Rail Legend"}).status_code
            == 405
    )
    assert client.delete(f"/passport/{session_id}").status_code == 405

    passport = _get_passport(session_id).json()
    assert passport["rank"] == "Stoker"


def test_injecting_a_rank_field_into_a_real_trivia_answer_is_rejected():
    # A second "bypass trivia" vector: try to smuggle a rank straight
    # into the legitimate answer-submission body instead of a separate
    # /passport POST. AnswerSubmission has extra="forbid", so this must
    # fail validation (422), not silently ignore the extra field and
    # award a real, correct-answer stamp alongside a fabricated rank.
    session_id = "dod2-trivia-payload-injection"

    response = client.post(
        "/waypoints/station-kimberley/trivia/answer",
        json={
            "sessionId": session_id,
            "selectedOptionIndex": CORRECT_ANSWERS["station-kimberley"],
            "rank": "Rail Legend",
        },
        headers=_session_header(session_id),
    )

    assert response.status_code == 422

    # No partial effect: the malformed request must not have awarded a
    # stamp for the (otherwise-correct) answer that rode along with it.
    passport = _get_passport(session_id).json()
    assert passport["stamps"] == []
    assert passport["rank"] == "Stoker"