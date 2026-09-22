from fastapi import APIRouter, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.db.seed import SEED_TRIVIA, SEED_WAYPOINTS
from app.schemas.trivia import TriviaQuestion
from app.schemas.waypoint import Waypoint

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/waypoints", tags=["Waypoints"])


@router.get("", response_model=list[Waypoint])
def get_waypoints():
    return SEED_WAYPOINTS


@router.get("/{waypoint_id}", response_model=Waypoint)
def get_waypoint_by_id(waypoint_id: str):
    waypoint = next((wp for wp in SEED_WAYPOINTS if wp.id == waypoint_id), None)
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