import pydantic


class TriviaOption(pydantic.BaseModel):
    option_id: str = pydantic.Field(..., description="Unique option identifier")
    text: str = pydantic.Field(..., description="Option answer display text")


class TriviaQuestion(pydantic.BaseModel):
    id: str = pydantic.Field(..., description="Unique question identifier")
    waypoint_id: str = pydantic.Field(..., description="Associated waypoint ID")
    question: str = pydantic.Field(..., description="Trivia question text")
    options: list[TriviaOption] = pydantic.Field(
        ..., min_items=2, description="List of possible answer options"
    )
    correct_option_id: str = pydantic.Field(..., description="ID of the correct option")
    points: int = pydantic.Field(
        default=10, ge=1, description="Points awarded for correct answer"
    )

    class Config:
        extra = "forbid"
