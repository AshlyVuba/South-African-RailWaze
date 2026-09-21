from pydantic import BaseModel, Field
from typing import List
from datetime import datetime

class Stamp(BaseModel):
    waypoint_id: str = Field(..., description="Waypoint ID associated with stamp")
    unlocked_at: datetime = Field(..., description="Timestamp when stamp was awarded")

class PassportState(BaseModel):
    user_id: str = Field(..., description="Unique user identifier")
    rank: str = Field(default="Stoker", description="Traveler progression rank e.g. Stoker, Rail Legend")
    total_points: int = Field(default=0, ge=0, description="Cumulative trivia points")
    stamps: List[Stamp] = Field(default_factory=list, description="Unlocked digital passport stamps")

    class Config:
        extra = "forbid"