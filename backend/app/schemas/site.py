from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.project import ProjectDescription, ProjectInput, ProjectName

Longitude = Annotated[float, Field(strict=True, ge=-180, le=180, allow_inf_nan=False)]
Latitude = Annotated[float, Field(strict=True, ge=-90, le=90, allow_inf_nan=False)]
Ring = Annotated[list[tuple[Longitude, Latitude]], Field(min_length=4, max_length=2000)]


class PolygonGeometry(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["Polygon"]
    coordinates: Annotated[list[Ring], Field(min_length=1, max_length=20)]

    @model_validator(mode="after")
    def closed_rings(self):
        if sum(map(len, self.coordinates)) > 10000:
            raise ValueError("Polygon exceeds 10000 positions")
        for ring in self.coordinates:
            if ring[0] != ring[-1] or len(set(ring[:-1])) < 3:
                raise ValueError(
                    "Each ring must close and contain at least three distinct vertices"
                )
        return self


class SiteCreate(ProjectInput):
    name: ProjectName
    description: ProjectDescription | None = None
    geometry: PolygonGeometry


class SiteUpdate(ProjectInput):
    name: ProjectName | None = None
    description: ProjectDescription | None = None
    geometry: PolygonGeometry | None = None

    @model_validator(mode="after")
    def editable_patch(self):
        if not self.model_fields_set:
            raise ValueError("Provide at least one editable field")
        for name in ("name", "geometry"):
            if name in self.model_fields_set and getattr(self, name) is None:
                raise ValueError(f"{name} cannot be null")
        return self


class SiteResponse(BaseModel):
    id: UUID
    project_id: UUID
    name: str
    description: str | None
    geometry: PolygonGeometry
    area_hectares: float
    created_at: datetime
    updated_at: datetime
