from fastapi import APIRouter, HTTPException, status

from app.db.session_store import get_passport
from app.schemas.passport import PassportState
from app.security.pqc import sign_passport

router = APIRouter(prefix="/passport", tags=["Passport"])


@router.get("/{session_id}", response_model=PassportState)
def get_user_passport(session_id: str):

    passport = get_passport(session_id)
    passport.signature = sign_passport(passport)
    return passport


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