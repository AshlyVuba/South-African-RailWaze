from pydantic import BaseModel, ConfigDict, Field

from app.schemas.passport import StampAward

TRIVIA_ID_PATTERN = r"^trivia-[a-z0-9-]+$"


class TriviaQuestion(BaseModel):
    """
    Internal representation only - includes answer_index/explanation.
    Used for seed loading and server-side answer validation. Never
    serialize this directly in an HTTP response - see
    TriviaQuestionPublic, which is what GET /waypoints/{id}/trivia
    actually returns.
    """

    model_config = ConfigDict(extra="forbid")

    id: str = Field(..., pattern=TRIVIA_ID_PATTERN)
    waypoint_id: str
    question: str
    options: list[str] = Field(..., min_length=4, max_length=4)
    answer_index: int = Field(..., ge=0, le=3)
    explanation: str


class TriviaQuestionPublic(BaseModel):
    """
    What GET /waypoints/{id}/trivia serializes to clients - deliberately
    excludes answer_index and explanation so the correct answer can
    never be read off the question payload (issue #17 DoD item 1).
    """

    model_config = ConfigDict(extra="forbid")

    id: str
    waypoint_id: str
    question: str
    options: list[str]

    @classmethod
    def from_internal(cls, question: TriviaQuestion) -> "TriviaQuestionPublic":
        return cls(
            id=question.id,
            waypoint_id=question.waypoint_id,
            question=question.question,
            options=question.options,
        )


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