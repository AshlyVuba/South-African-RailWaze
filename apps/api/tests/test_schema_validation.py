import pytest
from pydantic import ValidationError

from app.schemas.passport import PassportStamp, PassportState, TravelerRank
from app.schemas.trivia import TriviaAnswerSubmission, TriviaQuestion
from app.schemas.waypoint import (
    Geometry,
    WaypointFeature,
    WaypointFeatureCollection,
    WaypointProperties,
)


def _valid_properties_kwargs():
    return {
        "id": "station-pretoria",
        "name": "Pretoria",
        "lat": -25.7565,
        "lng": 28.1895,
        "km_mark": 0,
        "elevation_m": 1339,
        "biome": "Highveld",
        "memory_vault": "vault-station-pretoria",
        "audio_capsule_id": "audio-station-pretoria",
        "memory_vault_id": "vault-station-pretoria",
        "passport_stamp_id": "stamp-station-pretoria",
    }


def _valid_feature():
    return WaypointFeature(
        id="station-pretoria",
        geometry=Geometry(coordinates=(28.1895, -25.7565)),
        properties=WaypointProperties(**_valid_properties_kwargs()),
    )


# --- Waypoint schemas -------------------------------------------------


def test_waypoint_properties_rejects_unexpected_extra_field():
    with pytest.raises(ValidationError):
        WaypointProperties(**_valid_properties_kwargs(), unexpected_field="nope")


def test_waypoint_properties_rejects_id_not_in_contract_enum():
    kwargs = _valid_properties_kwargs()
    kwargs["id"] = "station-de-aar"  # not one of the 4 contract stations
    with pytest.raises(ValidationError):
        WaypointProperties(**kwargs)


def test_waypoint_properties_accepts_known_fields():
    props = WaypointProperties(**_valid_properties_kwargs())
    assert props.id == "station-pretoria"


def test_waypoint_feature_rejects_unexpected_extra_field():
    with pytest.raises(ValidationError):
        WaypointFeature(
            id="station-pretoria",
            geometry=Geometry(coordinates=(28.1895, -25.7565)),
            properties=WaypointProperties(**_valid_properties_kwargs()),
            unexpected_field="nope",
        )


def test_waypoint_feature_collection_rejects_unexpected_extra_field():
    with pytest.raises(ValidationError):
        WaypointFeatureCollection(features=[_valid_feature()], unexpected_field="nope")


# --- Trivia schemas -----------------------------------------------------


def _valid_trivia_kwargs():
    return {
        "id": "trivia-pretoria-nzasm",
        "waypoint_id": "station-pretoria",
        "question": "Which railway company built this line?",
        "options": ["A", "B", "C", "D"],
        "answer_index": 1,
        "explanation": "Because history.",
    }


def test_trivia_question_rejects_unexpected_extra_field():
    with pytest.raises(ValidationError):
        TriviaQuestion(**_valid_trivia_kwargs(), unexpected_field="nope")


def test_trivia_question_rejects_wrong_number_of_options():
    kwargs = _valid_trivia_kwargs()
    kwargs["options"] = ["A", "B", "C"]  # contract requires exactly 4
    with pytest.raises(ValidationError):
        TriviaQuestion(**kwargs)


def test_trivia_question_rejects_out_of_range_answer_index():
    kwargs = _valid_trivia_kwargs()
    kwargs["answer_index"] = 4  # contract caps at 3
    with pytest.raises(ValidationError):
        TriviaQuestion(**kwargs)


def test_trivia_answer_submission_rejects_unexpected_extra_field():
    with pytest.raises(ValidationError):
        TriviaAnswerSubmission(
            trivia_id="trivia-pretoria-nzasm",
            selected_index=1,
            unexpected_field="nope",
        )


# --- Passport schemas -----------------------------------------------------


def test_traveler_rank_is_a_constrained_type_not_a_free_string():
    assert list(TravelerRank) == [
        TravelerRank.STOKER,
        TravelerRank.TRACK_MASTER,
        TravelerRank.KAROO_SCOUT,
        TravelerRank.RAIL_LEGEND,
    ]
    with pytest.raises(ValueError):
        TravelerRank("Not A Real Rank")


def test_passport_state_rejects_invalid_rank_string():
    with pytest.raises(ValidationError):
        PassportState(
            session_id="11111111-1111-1111-1111-111111111111",
            current_rank="Not A Real Rank",
            score=0,
        )


def test_passport_state_rejects_unexpected_extra_field():
    with pytest.raises(ValidationError):
        PassportState(
            session_id="11111111-1111-1111-1111-111111111111",
            current_rank=TravelerRank.STOKER,
            score=0,
            unexpected_field="nope",
        )


def test_passport_stamp_rejects_unexpected_extra_field():
    with pytest.raises(ValidationError):
        PassportStamp(
            stamp_id="stamp-station-pretoria",
            waypoint_id="station-pretoria",
            collected_at="2026-09-24T12:00:00Z",
            unexpected_field="nope",
        )
