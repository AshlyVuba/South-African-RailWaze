from fastapi import APIRouter, HTTPException, Request, status

from app.db.seed import SEED_TRIVIA, SEED_TRIVIA_BY_ID
from app.db.session_store import record_stamp
from app.rate_limit import limiter
from app.schemas.trivia import AnswerResult, AnswerSubmission

router = APIRouter(prefix="/waypoints", tags=["Trivia"])


@router.post("/{waypoint_id}/trivia/answer", response_model=AnswerResult)
@limiter.limit("5/minute")
def submit_trivia_answer(
    request: Request,
    waypoint_id: str,
    submission: AnswerSubmission,
):
    question = None
    if SEED_TRIVIA.get(waypoint_id):
        question = SEED_TRIVIA[waypoint_id][0]
    elif SEED_TRIVIA.get(f"station-{waypoint_id}"):
        question = SEED_TRIVIA[f"station-{waypoint_id}"][0]
    elif waypoint_id in SEED_TRIVIA_BY_ID:
        question = SEED_TRIVIA_BY_ID[waypoint_id]

    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trivia not found for waypoint: {waypoint_id}",
        )

    correct_idx = getattr(question, "correctOptionIndex", getattr(question, "answer_index", 0))
    is_correct = submission.selected_option_index == correct_idx
    explanation = getattr(question, "explanation", "")

    stamp_awarded = None
    if is_correct:
        stamp_awarded = record_stamp(
            session_id=submission.session_id,
            waypoint_id=question.waypoint_id,
            waypoint_name=getattr(question, "waypointName", getattr(question, "title", waypoint_id)),
            badge_icon=getattr(question, "badgeIcon", "stamp-default"),
        )

    return AnswerResult(
        correct=is_correct,
        correctOptionIndex=correct_idx,
        explanation=explanation,
        stampAwarded=stamp_awarded,
    )