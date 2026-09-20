from uuid import UUID

from sqlalchemy.orm import Session

from app.analytics.summaries import BIODIVERSITY_UNIT, CARBON_UNIT, DATA_POLICY, summarize
from app.repositories.metric_repository import MetricRepository
from app.schemas.analytics import MetricResponse, SiteAnalytics
from app.services.site_service import SiteService


class AnalyticsService:
    def __init__(self, session: Session):
        self.sites = SiteService(session)
        self.metrics = MetricRepository(session)

    def list(self, owner_id: UUID, project_id: UUID, site_id: UUID) -> list[MetricResponse]:
        self.sites.require_site(owner_id, project_id, site_id)
        return [MetricResponse.model_validate(row) for row in self.metrics.list_for_site(site_id)]

    def summary(self, owner_id: UUID, project_id: UUID, site_id: UUID) -> SiteAnalytics:
        self.sites.require_site(owner_id, project_id, site_id)
        rows = self.metrics.list_for_site(site_id)
        return SiteAnalytics(
            site_id=site_id,
            data_policy=DATA_POLICY,
            carbon_unit=CARBON_UNIT,
            biodiversity_unit=BIODIVERSITY_UNIT,
            carbon=summarize([(row.recorded_at, row.carbon_value) for row in rows]),
            biodiversity=summarize([(row.recorded_at, row.biodiversity_value) for row in rows]),
            series=[MetricResponse.model_validate(row) for row in rows],
        )
