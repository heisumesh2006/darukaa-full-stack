from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Project, Site, SiteMetric


class DashboardRepository:
    def __init__(self, session: Session):
        self.session = session

    def project_count(self, owner_id: UUID) -> int:
        return self.session.scalar(
            select(func.count(Project.id)).where(Project.owner_id == owner_id)
        )

    def site_totals(self, owner_id: UUID):
        return self.session.execute(
            select(
                func.count(Site.id).label("count"),
                func.coalesce(func.sum(Site.area_hectares), 0).label("area"),
            )
            .join(Project, Site.project_id == Project.id)
            .where(Project.owner_id == owner_id)
        ).one()

    def latest_statistics(self, owner_id: UUID, field):
        # Filter ownership and nulls before ranking; a missing field is not a zero.
        ranked = select(
            field.label("value"),
            SiteMetric.recorded_at,
            func.row_number()
            .over(partition_by=SiteMetric.site_id, order_by=SiteMetric.recorded_at.desc())
            .label("rank"),
        )
        ranked = (
            ranked.join(Site, SiteMetric.site_id == Site.id)
            .join(Project, Site.project_id == Project.id)
            .where(Project.owner_id == owner_id, field.is_not(None))
            .subquery()
        )
        return self.session.execute(
            select(
                func.count().label("count"),
                func.sum(ranked.c.value).label("total"),
                func.avg(ranked.c.value).label("average"),
                func.max(ranked.c.recorded_at).label("latest_at"),
            ).where(ranked.c.rank == 1)
        ).one()

    def projects(self, owner_id: UUID) -> list[dict]:
        query = (
            select(
                Project.id,
                Project.name,
                Project.status,
                func.count(Site.id).label("site_count"),
                func.coalesce(func.sum(Site.area_hectares), 0).label("area_hectares"),
            )
            .outerjoin(Site, Site.project_id == Project.id)
            .where(Project.owner_id == owner_id)
            .group_by(Project.id)
            .order_by(Project.updated_at.desc(), Project.id)
            .limit(6)
        )
        return [dict(row) for row in self.session.execute(query).mappings()]

    def sites(self, owner_id: UUID) -> list[dict]:
        query = (
            select(
                Site.id,
                Site.project_id,
                Project.name.label("project_name"),
                Site.name,
                Site.area_hectares,
            )
            .join(Project, Site.project_id == Project.id)
            .where(Project.owner_id == owner_id)
            .order_by(Site.updated_at.desc(), Site.id)
            .limit(8)
        )
        return [dict(row) for row in self.session.execute(query).mappings()]

    def monthly_observations(self, owner_id: UUID) -> list[dict]:
        month = func.date_trunc("month", SiteMetric.recorded_at, "UTC")
        query = (
            select(
                month.label("recorded_at"),
                func.count(SiteMetric.id).label("observations"),
                func.avg(SiteMetric.carbon_value).label("carbon_average"),
                func.avg(SiteMetric.biodiversity_value).label("biodiversity_average"),
            )
            .join(Site, SiteMetric.site_id == Site.id)
            .join(Project, Site.project_id == Project.id)
            .where(Project.owner_id == owner_id)
            .group_by(month)
            .order_by(month.desc())
            .limit(12)
        )
        return [dict(row) for row in self.session.execute(query).mappings()]
