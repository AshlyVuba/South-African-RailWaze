
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.passport import StampAward

TRIVIA_ID_PATTERN = r"^trivia-[a-z0-9-]+$"


class TriviaQuestion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(..., pattern=TRIVIA_ID_PATTERN)
    waypoint_id: str
    question: str
    options: list[str] = Field(..., min_length=4, max_length=4)
    answer_index: int = Field(..., ge=0, le=3)
    explanation: str


class TriviaAnswerSubmission(BaseModel):
    model_config = ConfigDict(extra="forbid")

    trivia_id: str = Field(..., pattern=TRIVIA_ID_PATTERN)
    selected_index: int = Field(..., ge=0, le=3)


class AnswerSubmission(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    session_id: str = Field(..., alias="sessionId")
    selected_option_index: int = Field(..., alias="selectedOptionIndex", ge=0)


class AnswerResult(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    correct: bool
    correct_option_index: int = Field(..., alias="correctOptionIndex", ge=0)
    explanation: str
    stamp_awarded: StampAward | None = Field(default=None, alias="stampAwarded")