from fastapi import APIRouter, HTTPException, Request, Response, status

from app.db.seed import SEED_TRIVIA, SEED_WAYPOINTS
from app.rate_limit import limiter
from app.schemas.trivia import TriviaQuestionPublic
from app.schemas.waypoint import WaypointFeature, WaypointFeatureCollection

router = APIRouter(prefix="/waypoints", tags=["Waypoints"])


@router.get("", response_model=WaypointFeatureCollection)
def get_waypoints():
    return SEED_WAYPOINTS


@router.get("/{waypoint_id}", response_model=WaypointFeature)
def get_waypoint_by_id(waypoint_id: str):
    waypoint = next(
        (f for f in SEED_WAYPOINTS.features if f.id == waypoint_id), None
    )
    if not waypoint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Waypoint with ID '{waypoint_id}' not found.",
        )
    return waypoint


@router.get("/{waypoint_id}/trivia", response_model=list[TriviaQuestionPublic])
@limiter.limit("30/minute")
def get_waypoint_trivia(request: Request, response: Response, waypoint_id: str):
    # response: Response is required here, not decorative - slowapi's
    # @limiter.limit decorator needs a real Response object to attach
    # rate-limit headers to. Without this parameter, FastAPI never injects
    # one, slowapi receives None, and _inject_headers raises on every
    # request (even ones under the limit), not just on the 429 path.
    get_waypoint_by_id(waypoint_id)
    return [
        TriviaQuestionPublic.from_internal(q)
        for q in SEED_TRIVIA.get(waypoint_id, [])
    ]