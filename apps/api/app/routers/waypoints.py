from fastapi import APIRouter, HTTPException, Request, status

from app.db.seed import SEED_TRIVIA, SEED_WAYPOINTS
from app.rate_limit import limiter
from app.schemas.trivia import TriviaQuestion
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


@router.get("/{waypoint_id}/trivia", response_model=list[TriviaQuestion])
@limiter.limit("30/minute")
def get_waypoint_trivia(request: Request, waypoint_id: str):
    get_waypoint_by_id(waypoint_id)
    return SEED_TRIVIA.get(waypoint_id, [])