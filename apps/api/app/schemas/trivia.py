from pydantic import BaseModel, Field


class TriviaOption(BaseModel):
    option_id: str = Field(..., description="Unique option identifier")
    text: str = Field(..., description="Option answer display text")


class TriviaQuestion(BaseModel):
    id: str = Field(..., description="Unique question identifier")
    waypoint_id: str = Field(..., description="Associated waypoint ID")
    question: str = Field(..., description="Trivia question text")
    options: list[TriviaOption] = Field(
        ..., min_items=2, description="List of possible answer options"
    )
    correct_option_id: str = Field(..., description="ID of the correct option")
    points: int = Field(
        default=10, ge=1, description="Points awarded for correct answer"
    )

    class Config:
        extra = "forbid"
