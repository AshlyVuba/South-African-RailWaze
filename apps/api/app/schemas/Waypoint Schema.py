from pydantic import BaseModel, Field


class Waypoint(BaseModel):
    id: str = Field(..., description="Unique identifier for the waypoint")
    name: str = Field(..., description="Name of the rail stop or geographic point")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude coordinate")
    longitude: float = Field(
        ..., ge=-180.0, le=180.0, description="Longitude coordinate"
    )
    elevation_meters: float | None = Field(
        None, description="Elevation above sea level"
    )
    biome: str | None = Field(None, description="Regional biome designation")
    tags: list[str] = Field(default_factory=list, description="Categorical tags")

    class Config:
        extra = "forbid"
