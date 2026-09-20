from uuid import UUID

from sqlalchemy.orm import Session

from app.analytics.summaries import BIODIVERSITY_UNIT, CARBON_UNIT, DATA_POLICY
from app.models import SiteMetric
from app.repositories.dashboard_repository import DashboardRepository
from app.schemas.dashboard import DashboardResponse


class DashboardService:
    def __init__(self, session: Session):
        self.dashboard = DashboardRepository(session)

    def summary(self, owner_id: UUID) -> DashboardResponse:
        project_count = self.dashboard.project_count(owner_id)
        sites = self.dashboard.site_totals(owner_id)
        carbon = self.dashboard.latest_statistics(owner_id, SiteMetric.carbon_value)
        biodiversity = self.dashboard.latest_statistics(owner_id, SiteMetric.biodiversity_value)
        dates = [value for value in (carbon.latest_at, biodiversity.latest_at) if value is not None]
        return DashboardResponse(
            total_projects=project_count,
            total_sites=sites.count,
            total_area_hectares=sites.area,
            latest_carbon_total=carbon.total,
            carbon_sites=carbon.count,
            latest_biodiversity_average=biodiversity.average,
            biodiversity_sites=biodiversity.count,
            latest_observation_at=max(dates) if dates else None,
            data_policy=DATA_POLICY,
            carbon_unit=CARBON_UNIT,
            biodiversity_unit=BIODIVERSITY_UNIT,
            projects=self.dashboard.projects(owner_id),
            sites=self.dashboard.sites(owner_id),
            monthly_observations=list(reversed(self.dashboard.monthly_observations(owner_id))),
        )
