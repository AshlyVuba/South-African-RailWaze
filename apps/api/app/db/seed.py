import json
from pathlib import Path

from app.schemas.trivia import TriviaQuestion
from app.schemas.waypoint import WaypointFeatureCollection

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def _load_waypoints() -> WaypointFeatureCollection:
    raw = json.loads((DATA_DIR / "waypoints.geojson").read_text())
    return WaypointFeatureCollection.model_validate(raw)


def _load_trivia_by_waypoint() -> dict[str, list[TriviaQuestion]]:
    raw = json.loads((DATA_DIR / "trivia.json").read_text())
    questions = [TriviaQuestion.model_validate(item) for item in raw]

    by_waypoint: dict[str, list[TriviaQuestion]] = {}
    for question in questions:
        by_waypoint.setdefault(question.waypoint_id, []).append(question)
    return by_waypoint


SEED_WAYPOINTS: WaypointFeatureCollection = _load_waypoints()
SEED_TRIVIA: dict[str, list[TriviaQuestion]] = _load_trivia_by_waypoint()

# Flat index used by the trivia-answer endpoint to look up a question by
# its id alone, without needing the caller to also pass a waypoint_id.
SEED_TRIVIA_BY_ID: dict[str, TriviaQuestion] = {
    question.id: question
    for questions in SEED_TRIVIA.values()
    for question in questions
}