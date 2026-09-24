from fastapi import APIRouter, HTTPException, status

from app.db.seed import SEED_TRIVIA_BY_ID
from app.schemas.trivia import TriviaAnswerSubmission

router = APIRouter(prefix="/trivia", tags=["Trivia"])


@router.post("/answer")
def submit_trivia_answer(submission: TriviaAnswerSubmission):
    question = SEED_TRIVIA_BY_ID.get(submission.trivia_id)
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trivia question '{submission.trivia_id}' not found.",
        )

    correct = submission.selected_index == question.answer_index
    return {
        "trivia_id": question.id,
        "correct": correct,
        "correct_index": question.answer_index,
        "explanation": question.explanation,
    }