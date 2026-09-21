from fastapi import APIRouter, HTTPException, status

from app.db.seed import SEED_TRIVIA, SEED_WAYPOINTS
from app.schemas.trivia import TriviaQuestion
from app.schemas.waypoint import Waypoint

router = APIRouter(prefix="/waypoints", tags=["Waypoints & Trivia"])


@router.get("", response_model=list[Waypoint], summary="Get all anchor waypoints")
async def get_waypoints() -> list[Waypoint]:
    """Retrieve all seeded anchor station waypoints along the Pretoria-to-Cape Town corridor."""
    return SEED_WAYPOINTS


@router.get(
    "/{waypoint_id}",
    response_model=Waypoint,
    summary="Get waypoint by ID",
)
async def get_waypoint_by_id(waypoint_id: str) -> Waypoint:
    """Retrieve a single waypoint by its unique ID."""
    for waypoint in SEED_WAYPOINTS:
        if waypoint.id == waypoint_id:
            return waypoint
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Waypoint with ID '{waypoint_id}' not found.",
    )


@router.get(
    "/{waypoint_id}/trivia",
    response_model=list[TriviaQuestion],
    summary="Get trivia questions for a waypoint",
)
async def get_waypoint_trivia(waypoint_id: str) -> list[TriviaQuestion]:
    """Retrieve all trivia questions linked to a specific waypoint ID."""
    # Verify waypoint exists first
    await get_waypoint_by_id(waypoint_id)
    return SEED_TRIVIA.get(waypoint_id, [])