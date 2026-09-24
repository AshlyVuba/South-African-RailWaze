from pydantic import BaseModel, ConfigDict, Field

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