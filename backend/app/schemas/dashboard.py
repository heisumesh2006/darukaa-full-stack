from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ProjectOverview(BaseModel):
    id: UUID
    name: str
    status: str
    site_count: int
    area_hectares: float


class SiteOverview(BaseModel):
    id: UUID
    project_id: UUID
    project_name: str
    name: str
    area_hectares: float


class MonthlyObservation(BaseModel):
    recorded_at: datetime
    observations: int
    carbon_average: float | None
    biodiversity_average: float | None


class DashboardResponse(BaseModel):
    total_projects: int
    total_sites: int
    total_area_hectares: float
    latest_carbon_total: float | None
    carbon_sites: int
    latest_biodiversity_average: float | None
    biodiversity_sites: int
    latest_observation_at: datetime | None
    data_policy: str
    carbon_unit: str
    biodiversity_unit: str
    projects: list[ProjectOverview]
    sites: list[SiteOverview]
    monthly_observations: list[MonthlyObservation]
