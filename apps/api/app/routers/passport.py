from app.db.session_store import get_passport
from app.schemas.passport import PassportState
from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/passport", tags=["Passport"])


@router.get("/{session_id}", response_model=PassportState)
def get_user_passport(session_id: str):

    return get_passport(session_id)


@router.post(
    "/{session_id}",
    responses={405: {"description": "Rank/stamps cannot be set by the client"}},
)
def reject_passport_mutation(session_id: str):

    raise HTTPException(
        status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
        detail=(
            "Passport rank and stamps cannot be set directly. "
            "Complete trivia via POST /waypoints/{waypointId}/trivia/answer instead."
        ),
    )
