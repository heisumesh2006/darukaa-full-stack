"""Run with python -m app.db.verify; never prints database credentials."""

from geoalchemy2 import Geometry
from sqlalchemy import func, inspect, select, text

from app.db.session import get_engine
from app.models import Project, Site, SiteMetric, User


def main() -> None:
    with get_engine().connect() as connection:
        print(f"Database connectivity: {connection.scalar(text('SELECT 1'))}")
        print(f"PostGIS: {connection.scalar(select(func.PostGIS_Full_Version()))}")
        geometry = func.ST_GeomFromText("POINT(0 0)", 4326, type_=Geometry("POINT", srid=4326))
        assert connection.scalar(select(func.ST_SRID(geometry))) == 4326
        assert connection.scalar(select(func.ST_IsValid(geometry))) is True
        print("GeoAlchemy2 spatial query: valid geometry, SRID 4326")
        inspector = inspect(connection)
        for model in (User, Project, Site, SiteMetric):
            if not inspector.has_table(model.__tablename__, schema="public"):
                raise RuntimeError("Missing core tables: run alembic upgrade head first.")
            count = connection.scalar(select(func.count()).select_from(model))
            print(f"{model.__tablename__}: {count} rows")
        column = next(
            item
            for item in inspector.get_columns("sites", schema="public")
            if item["name"] == "geometry"
        )
        assert column["type"].geometry_type == "POLYGON" and column["type"].srid == 4326
        indexes = inspector.get_indexes("sites", schema="public")
        assert any(
            item["name"] == "idx_sites_geometry"
            and item["dialect_options"]["postgresql_using"] == "gist"
            for item in indexes
        )
        print("Site geometry: POLYGON/4326, GiST index verified")
        invalid = connection.scalar(
            select(func.count())
            .select_from(Site)
            .where((~func.ST_IsValid(Site.geometry)) | (Site.area_hectares <= 0))
        )
        assert invalid == 0
        print("Stored sites: valid geometry and positive generated area")


if __name__ == "__main__":
    main()
