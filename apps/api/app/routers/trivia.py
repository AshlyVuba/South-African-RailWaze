from fastapi import APIRouter, HTTPException, Request, Response, status

from app.db.seed import SEED_TRIVIA
from app.db.session_store import record_stamp
from app.rate_limit import limiter
from app.routers.waypoints import get_waypoint_by_id
from app.schemas.trivia import AnswerResult, AnswerSubmission

router = APIRouter(prefix="/waypoints", tags=["Trivia"])


@router.post("/{waypoint_id}/trivia/answer", response_model=AnswerResult)
@limiter.limit("5/minute")
async def submit_trivia_answer(
        request: Request,
        response: Response,
        waypoint_id: str,
        submission: AnswerSubmission,
):
    # async def (not def) is required here - see the comment on
    # get_waypoint_trivia in routers/waypoints.py for why.
    #
    # response: Response is required for the same reason noted there -
    # slowapi's @limiter.limit decorator needs a real Response object to
    # attach rate-limit headers to, or it raises on every call.
    waypoint = get_waypoint_by_id(waypoint_id)  # raises 404 if unknown

    questions = SEED_TRIVIA.get(waypoint_id)
    if not questions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No trivia found for waypoint '{waypoint_id}'.",
        )
    # Each waypoint currently has exactly one seeded question.
    question = questions[0]

    is_correct = submission.selected_option_index == question.answer_index

    stamp_awarded = None
    if is_correct:
        stamp_awarded = record_stamp(
            session_id=submission.session_id,
            waypoint_id=waypoint.id,
            waypoint_name=waypoint.properties.name,
            badge_icon=waypoint.properties.passport_stamp_id,
        )

    return AnswerResult(
        correct=is_correct,
        correct_option_index=question.answer_index,
        explanation=question.explanation,
        stamp_awarded=stamp_awarded,
    )