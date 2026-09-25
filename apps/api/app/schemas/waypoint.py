from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

WaypointId = Literal[
    "station-pretoria",
    "station-kimberley",
    "station-matjiesfontein",
    "station-cape-town",
]

WaypointName = Literal[
    "Pretoria",
    "Kimberley",
    "Matjiesfontein",
    "Hex River Pass",
    "Hex River / Cape Town",
    "Cape Town",
]

Biome = Literal["Highveld", "Diamond Fields", "Great Karoo", "Cape Fynbos"]

Latitude = Annotated[float, Field(ge=-90, le=90)]
Longitude = Annotated[float, Field(ge=-180, le=180)]


class WaypointProperties(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: WaypointId
    name: WaypointName
    lat: Latitude
    lng: Longitude
    km_mark: float = Field(..., ge=0)
    elevation_m: float = Field(..., ge=-500, le=5000)
    biome: Biome
    memory_vault: str = Field(..., pattern=r"^vault-[a-z0-9-]+$")
    audio_capsule_id: str = Field(..., pattern=r"^audio-[a-z0-9-]+$")
    memory_vault_id: str = Field(..., pattern=r"^vault-[a-z0-9-]+$")
    passport_stamp_id: str = Field(..., pattern=r"^stamp-[a-z0-9-]+$")


class Geometry(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["Point"] = "Point"
    # GeoJSON coordinate order is [longitude, latitude] - matches the
    # prefixItems order in contracts/waypoint.schema.json exactly.
    coordinates: tuple[Longitude, Latitude]


class WaypointFeature(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["Feature"] = "Feature"
    id: WaypointId
    geometry: Geometry
    properties: WaypointProperties


class WaypointFeatureCollection(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[WaypointFeature]
