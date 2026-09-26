from datetime import datetime, timezone
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, model_validator


class TravelerRank(str, Enum):
    STOKER = "Stoker"
    TRACK_MASTER = "Track Master"
    KAROO_SCOUT = "Karoo Scout"
    RAIL_LEGEND = "Rail Legend"


Rank = TravelerRank


class PassportStamp(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        populate_by_name=True,
    )

    stamp_id: str | None = Field(default=None, alias="stampId")
    waypoint_id: str = Field(..., alias="waypointId")
    collected_at: datetime | None = Field(default=None, alias="collectedAt")
    waypoint_name: str | None = Field(default=None, alias="waypointName")
    badge_icon: str | None = Field(default=None, alias="badgeIcon")
    awarded_at: datetime | None = Field(default=None, alias="awardedAt")

    @model_validator(mode="after")
    def sync_stamp_fields(self):
        now = datetime.now(timezone.utc)
        if self.stamp_id is None:
            self.stamp_id = f"stamp-{self.waypoint_id}"
        if self.collected_at is None:
            self.collected_at = self.awarded_at or now
        if self.awarded_at is None:
            self.awarded_at = self.collected_at
        if self.waypoint_name is None:
            self.waypoint_name = self.waypoint_id
        if self.badge_icon is None:
            self.badge_icon = "stamp-default"
        return self


StampAward = PassportStamp


class PassportState(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        populate_by_name=True,
    )

    session_id: str = Field(..., alias="sessionId")
    current_rank: TravelerRank = Field(default=TravelerRank.STOKER, alias="currentRank")
    rank: TravelerRank | None = None
    score: int = Field(default=0, ge=0)
    total_score: int | None = Field(default=None, alias="totalScore")
    collected_stamps: list[PassportStamp] = Field(
        default_factory=list, alias="collectedStamps"
    )
    stamps: list[PassportStamp] | None = None
    completed_trivia_ids: list[str] = Field(
        default_factory=list, alias="completedTriviaIds"
    )
    signature: str | None = Field(
        default=None,
        description=(
            "Hex-encoded ML-DSA (FIPS 204) signature over a canonical subset "
            "of this passport's fields, for optional client-side tamper "
            "verification. Additive field - absent or unverifiable never "
            "blocks the passport from being read or displayed."
        ),
    )

    @model_validator(mode="after")
    def sync_compatibility_fields(self):
        if self.rank is None:
            self.rank = self.current_rank
        elif (
                self.current_rank == TravelerRank.STOKER
                and self.rank != TravelerRank.STOKER
        ):
            self.current_rank = self.rank

        if self.total_score is None:
            self.total_score = self.score
        elif self.score == 0 and self.total_score != 0:
            self.score = self.total_score

        if self.stamps is None:
            self.stamps = self.collected_stamps
        elif not self.collected_stamps and self.stamps:
            self.collected_stamps = self.stamps

        return self