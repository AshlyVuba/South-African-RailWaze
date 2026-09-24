from fastapi import APIRouter

from app.db.session_store import get_passport
from app.schemas.passport import PassportState

router = APIRouter(prefix="/passport", tags=["Passport"])


@router.get("/{session_id}", response_model=PassportState)
def get_user_passport(session_id: str):
    return get_passport(session_id)