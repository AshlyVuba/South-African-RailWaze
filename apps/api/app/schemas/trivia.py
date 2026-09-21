from pydantic import BaseModel, ConfigDict, Field


class TriviaOption(BaseModel):
    model_config = ConfigDict(extra="forbid")

    option_id: str
    text: str


class TriviaQuestion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    waypoint_id: str
    question: str
    options: list[TriviaOption] = Field(..., min_length=2, max_length=4)
    correct_option_id: str
    points: int = Field(default=10, ge=1)
