# apps/api/app/db/session_store.py
from datetime import datetime, timezone

from app.schemas.passport import PassportState, Rank, StampAward

# In-memory store: sessionId -> Dict of waypointId -> StampAward
_USER_STAMPS: dict[str, dict[str, StampAward]] = {}


def compute_rank(stamp_count: int) -> Rank:
    if stamp_count >= 4:
        return Rank.RAIL_LEGEND
    if stamp_count >= 3:
        return Rank.KAROO_SCOUT
    if stamp_count >= 1:
        return Rank.TRACK_MASTER
    return Rank.STOKER


def record_stamp(session_id: str, waypoint_id: str, waypoint_name: str, badge_icon: str) -> StampAward:
    if session_id not in _USER_STAMPS:
        _USER_STAMPS[session_id] = {}

    if waypoint_id in _USER_STAMPS[session_id]:
        return _USER_STAMPS[session_id][waypoint_id]

    stamp = StampAward(
        waypointId=waypoint_id,
        waypointName=waypoint_name,
        awardedAt=datetime.now(timezone.utc),
        badgeIcon=badge_icon,
    )
    _USER_STAMPS[session_id][waypoint_id] = stamp
    return stamp


def get_passport(session_id: str) -> PassportState:
    user_stamps = list(_USER_STAMPS.get(session_id, {}).values())
    total_stamps = len(user_stamps)
    rank = compute_rank(total_stamps)
    score = total_stamps * 100
    return PassportState(
        sessionId=session_id,
        stamps=user_stamps,
        collectedStamps=user_stamps,
        rank=rank,
        currentRank=rank,
        totalScore=score,
        score=score,
        completedTriviaIds=[s.waypoint_id for s in user_stamps],
    )