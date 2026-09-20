from uuid import UUID

from geoalchemy2 import Geography
from sqlalchemy import JSON, cast, func, select
from sqlalchemy.orm import Session

from app.models import Site
from app.schemas.site import PolygonGeometry


class SiteRepository:
    def __init__(self, session: Session):
        self.session = session

    @staticmethod
    def geometry_expression(geometry: PolygonGeometry):
        return func.ST_SetSRID(func.ST_GeomFromGeoJSON(geometry.model_dump_json()), 4326)

    def valid_geometry(self, geometry: PolygonGeometry) -> bool:
        expression = self.geometry_expression(geometry)
        valid = self.session.scalar(select(func.ST_IsValid(expression, 1)))
        if not valid:
            return False
        area = self.session.scalar(select(func.ST_Area(cast(expression, Geography(srid=4326)))))
        # The generated numeric(18,6) hectares column must remain strictly positive.
        return area is not None and area >= 0.005

    def find(self, project_id: UUID, site_id: UUID) -> Site | None:
        return self.session.scalar(
            select(Site).where(Site.project_id == project_id, Site.id == site_id)
        )

    def responses(self, project_id: UUID, site_id: UUID | None = None) -> list[dict]:
        query = select(
            Site.id,
            Site.project_id,
            Site.name,
            Site.description,
            Site.area_hectares,
            Site.created_at,
            Site.updated_at,
            cast(func.ST_AsGeoJSON(Site.geometry, 15), JSON).label("geometry"),
        )
        query = query.where(Site.project_id == project_id).order_by(Site.created_at, Site.id)
        if site_id is not None:
            query = query.where(Site.id == site_id)
        return [dict(row) for row in self.session.execute(query).mappings()]

    def create(
        self, project_id: UUID, name: str, description: str | None, geometry: PolygonGeometry
    ) -> Site:
        site = Site(
            project_id=project_id,
            name=name,
            description=description,
            geometry=self.geometry_expression(geometry),
        )
        self.session.add(site)
        self.session.flush()
        return site

    def update(self, site: Site, changes: dict, geometry: PolygonGeometry | None) -> None:
        for name in ("name", "description"):
            if name in changes:
                setattr(site, name, changes[name])
        if geometry is not None:
            site.geometry = self.geometry_expression(geometry)
        self.session.flush()

    def delete(self, site: Site) -> None:
        self.session.delete(site)
        self.session.flush()
