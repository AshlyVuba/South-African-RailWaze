from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TravelerRank(str, Enum):
    STOKER = "Stoker"
    TRACK_MASTER = "Track Master"
    KAROO_SCOUT = "Karoo Scout"
    RAIL_LEGEND = "Rail Legend"


class PassportStamp(BaseModel):
    model_config = ConfigDict(extra="forbid")

    stamp_id: str
    waypoint_id: str
    collected_at: datetime


class PassportState(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: UUID
    current_rank: TravelerRank
    score: int = Field(..., ge=0)
    collected_stamps: list[PassportStamp] = Field(default_factory=list)
    completed_trivia_ids: list[str] = Field(default_factory=list)