from pydantic import BaseModel, ConfigDict, Field


class PassportStamp(BaseModel):
    model_config = ConfigDict(extra="forbid")

    waypoint_id: str
    stamped_at: str
    synced: bool = True


class PassportState(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: str
    stamps: list[PassportStamp] = Field(default_factory=list)
