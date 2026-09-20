from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class MetricResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    site_id: UUID
    recorded_at: datetime
    carbon_value: float | None
    biodiversity_value: float | None


class MetricSummary(BaseModel):
    observations: int
    latest: float | None
    latest_at: datetime | None
    minimum: float | None
    maximum: float | None
    average: float | None
    change: float | None
    percentage_change: float | None
    trend: Literal["increasing", "decreasing", "stable", "insufficient_data"]


class SiteAnalytics(BaseModel):
    site_id: UUID
    data_policy: str
    carbon_unit: str
    biodiversity_unit: str
    carbon: MetricSummary
    biodiversity: MetricSummary
    series: list[MetricResponse]
