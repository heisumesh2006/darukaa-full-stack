from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import SiteMetric


class MetricRepository:
    def __init__(self, session: Session):
        self.session = session

    def list_for_site(self, site_id: UUID) -> list[SiteMetric]:
        return list(
            self.session.scalars(
                select(SiteMetric)
                .where(SiteMetric.site_id == site_id)
                .order_by(SiteMetric.recorded_at, SiteMetric.id)
            )
        )
