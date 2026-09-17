"""Run with python -m app.db.verify; never prints database credentials."""

from geoalchemy2 import Geometry
from sqlalchemy import func, select, text

from app.db.session import get_engine


def main() -> None:
    with get_engine().connect() as connection:
        print(f"Database connectivity: {connection.scalar(text('SELECT 1'))}")
        print(f"PostGIS: {connection.scalar(select(func.PostGIS_Full_Version()))}")
        geometry = func.ST_GeomFromText("POINT(0 0)", 4326, type_=Geometry("POINT", srid=4326))
        assert connection.scalar(select(func.ST_SRID(geometry))) == 4326
        assert connection.scalar(select(func.ST_IsValid(geometry))) is True
        print("GeoAlchemy2 spatial query: valid geometry, SRID 4326")


if __name__ == "__main__":
    main()
