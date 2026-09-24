"""
These test the Pydantic models directly rather than over HTTP because the
API currently has no endpoint that accepts a request body - every route is
a GET with only path parameters. That means there's nothing yet for a
malicious/malformed *body* to be rejected on at the HTTP layer. The models
that future body-accepting endpoints (e.g. submitting a trivia answer,
syncing passport state) will reuse are already locked down here, so this
guards the behavior going forward and documents the current gap.
"""

import pytest
from pydantic import ValidationError

from app.schemas.passport import PassportState
from app.schemas.trivia import TriviaOption, TriviaQuestion
from app.schemas.waypoint import Waypoint


def test_waypoint_rejects_unexpected_extra_field():
    with pytest.raises(ValidationError):
        Waypoint(
            id="WP_TEST",
            name="Test Station",
            latitude=0.0,
            longitude=0.0,
            not_a_real_field="nope",
        )


def test_waypoint_accepts_known_fields_only():
    wp = Waypoint(id="WP_TEST", name="Test Station", latitude=0.0, longitude=0.0)
    assert wp.id == "WP_TEST"


def test_trivia_option_rejects_unexpected_extra_field():
    with pytest.raises(ValidationError):
        TriviaOption(option_id="opt_1", text="Answer", bogus_field="nope")


def test_trivia_question_rejects_unexpected_extra_field():
    with pytest.raises(ValidationError):
        TriviaQuestion(
            id="Q1",
            waypoint_id="WP_TEST",
            question="Which station is this?",
            options=[
                TriviaOption(option_id="opt_1", text="A"),
                TriviaOption(option_id="opt_2", text="B"),
            ],
            correct_option_id="opt_1",
            unexpected_field="nope",
        )


def test_passport_state_rejects_unexpected_extra_field():
    with pytest.raises(ValidationError):
        PassportState(user_id="user_1", unexpected_field="nope")