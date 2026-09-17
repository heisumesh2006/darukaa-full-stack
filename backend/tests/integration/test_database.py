import json
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID, uuid4

import pytest
from geoalchemy2 import WKTElement
from sqlalchemy import delete, func, inspect, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.seed import DEMO_EMAIL, demo_id, seed_demo_data
from app.models import Project, Site, SiteMetric, User

pytestmark = pytest.mark.integration
SQUARE = "POLYGON((0 0,0.01 0,0.01 0.01,0 0.01,0 0))"
WHEN = datetime(2025, 1, 1, tzinfo=timezone.utc)


@pytest.fixture
def graph(db_session: Session) -> tuple[User, Project, Site]:
    user = User(email="integration@example.test")
    project = Project(name="Integration project", owner=user)
    site = Site(name="Equatorial square", project=project, geometry=WKTElement(SQUARE, srid=4326))
    db_session.add(site)
    db_session.flush()
    return user, project, site


def test_schema_indexes_and_foreign_keys(db_engine):
    inspector = inspect(db_engine)
    assert {"users", "projects", "sites", "site_metrics"} <= set(inspector.get_table_names())
    assert inspector.get_unique_constraints("users")[0]["column_names"] == ["email"]
    site_indexes = {index["name"]: index for index in inspector.get_indexes("sites")}
    assert site_indexes["idx_sites_geometry"]["dialect_options"]["postgresql_using"] == "gist"
    assert site_indexes["ix_sites_project_id"]["column_names"] == ["project_id"]
    assert any(i["column_names"] == ["owner_id"] for i in inspector.get_indexes("projects"))
    assert any(i["column_names"] == ["recorded_at"] for i in inspector.get_indexes("site_metrics"))
    assert any(
        item["column_names"] == ["site_id", "recorded_at"]
        for item in inspector.get_unique_constraints("site_metrics")
    )
    for table, parent, behavior in (
        ("projects", "users", "RESTRICT"),
        ("sites", "projects", "CASCADE"),
        ("site_metrics", "sites", "CASCADE"),
    ):
        fk = inspector.get_foreign_keys(table)[0]
        assert fk["referred_table"] == parent
        assert fk["options"]["ondelete"] == behavior
    geometry = next(c for c in inspector.get_columns("sites") if c["name"] == "geometry")
    assert geometry["type"].geometry_type == "POLYGON"
    assert geometry["type"].srid == 4326
    assert geometry["nullable"] is False


def test_uuid_defaults_and_relationships(db_session, graph):
    user, project, site = graph
    metric = SiteMetric(site=site, recorded_at=WHEN, carbon_value=Decimal("1.5"))
    db_session.add(metric)
    db_session.flush()
    for entity in (user, project, site, metric):
        assert isinstance(entity.id, UUID)
        assert entity.id.version == 4
        assert entity.created_at.utcoffset() == timedelta(0)
        assert entity.updated_at.utcoffset() == timedelta(0)
    assert user.is_active is True
    assert user.password_hash is None
    assert project.status == "draft"
    db_session.expire_all()
    assert user.projects == [project]
    assert project.sites == [site]
    assert site.metrics == [metric]
    assert metric.site.project.owner.id == user.id


def test_raw_sql_insert_uses_server_defaults(db_session):
    row = db_session.execute(
        text(
            "INSERT INTO users (email) VALUES ('server@example.test') "
            "RETURNING id, is_active, created_at, updated_at"
        )
    ).one()
    assert isinstance(row.id, UUID)
    assert row.id.version == 4
    assert row.is_active is True
    assert row.created_at.tzinfo is not None
    assert row.updated_at == row.created_at


def test_spatial_queries_geojson_and_geodesic_area(db_session, graph):
    site = graph[2]
    assert db_session.scalar(select(func.ST_SRID(Site.geometry)).where(Site.id == site.id)) == 4326
    assert (
        db_session.scalar(select(func.ST_IsValid(Site.geometry)).where(Site.id == site.id)) is True
    )
    # 0.01 degrees at the equator is roughly 1.11 km each side => about 123 hectares.
    assert Decimal("120") < site.area_hectares < Decimal("125")
    viewport = func.ST_MakeEnvelope(-0.01, -0.01, 0.02, 0.02, 4326)
    assert (
        db_session.scalar(select(Site.id).where(func.ST_Intersects(Site.geometry, viewport)))
        == site.id
    )
    assert (
        db_session.scalar(select(Site.id).where(func.ST_Within(Site.geometry, viewport))) == site.id
    )
    outside = func.ST_MakeEnvelope(10, 10, 11, 11, 4326)
    assert (
        db_session.scalar(select(Site.id).where(func.ST_Intersects(Site.geometry, outside))) is None
    )
    payload = json.loads(db_session.scalar(select(func.ST_AsGeoJSON(Site.geometry))))
    assert payload["type"] == "Polygon"
    assert payload["coordinates"][0][1] == [0.01, 0]


def test_generated_area_tracks_raw_sql_geometry_changes(db_session, graph):
    site = graph[2]
    previous = site.area_hectares
    db_session.execute(
        text("UPDATE sites SET geometry = ST_GeomFromText(:wkt, 4326) WHERE id = :id"),
        {"wkt": "POLYGON((0 0,0.02 0,0.02 0.01,0 0.01,0 0))", "id": site.id},
    )
    db_session.refresh(site)
    assert Decimal("1.99") < site.area_hectares / previous < Decimal("2.01")


def test_metrics_sorted_and_duplicate_timestamp_rejected(db_session, graph):
    site = graph[2]
    for day in (3, 1, 2):
        db_session.add(
            SiteMetric(
                site_id=site.id, recorded_at=WHEN + timedelta(days=day), carbon_value=Decimal(day)
            )
        )
    db_session.flush()
    metrics = db_session.scalars(select(SiteMetric).order_by(SiteMetric.recorded_at)).all()
    assert [m.carbon_value for m in metrics] == [Decimal(1), Decimal(2), Decimal(3)]
    with pytest.raises(IntegrityError), db_session.begin_nested():
        db_session.add(
            SiteMetric(
                site_id=site.id,
                recorded_at=metrics[0].recorded_at,
                biodiversity_value=Decimal("50"),
            )
        )
        db_session.flush()


@pytest.mark.parametrize(
    "email", ["integration@example.test", "UPPER@example.test", " padded@example.test ", ""]
)
def test_email_uniqueness_and_normalization(db_session, graph, email):
    with pytest.raises(IntegrityError), db_session.begin_nested():
        db_session.add(User(email=email))
        db_session.flush()


@pytest.mark.parametrize(
    "wkt,srid",
    [
        ("POLYGON((0 0,1 1,1 0,0 1,0 0))", 4326),
        ("POLYGON EMPTY", 4326),
        ("POLYGON((181 0,182 0,182 1,181 1,181 0))", 4326),
        ("POLYGON((0 91,1 91,1 92,0 92,0 91))", 4326),
    ],
)
def test_invalid_boundaries_rejected(db_session, graph, wkt, srid):
    with pytest.raises(IntegrityError), db_session.begin_nested():
        db_session.add(
            Site(project_id=graph[1].id, name="Invalid", geometry=WKTElement(wkt, srid=srid))
        )
        db_session.flush()


def test_geometry_typmod_rejects_wrong_type_and_srid(db_session, graph):
    from sqlalchemy.exc import DBAPIError

    for geometry in (WKTElement("POINT(0 0)", srid=4326), WKTElement(SQUARE, srid=3857)):
        with pytest.raises(DBAPIError), db_session.begin_nested():
            db_session.add(Site(project_id=graph[1].id, name="Wrong type", geometry=geometry))
            db_session.flush()


@pytest.mark.parametrize(
    "carbon,biodiversity", [("-1", None), ("NaN", None), (None, "101"), (None, "-1"), (None, None)]
)
def test_metric_constraints(db_session, graph, carbon, biodiversity):
    with pytest.raises(IntegrityError), db_session.begin_nested():
        db_session.add(
            SiteMetric(
                site_id=graph[2].id,
                recorded_at=WHEN,
                carbon_value=Decimal(carbon) if carbon else None,
                biodiversity_value=Decimal(biodiversity) if biodiversity else None,
            )
        )
        db_session.flush()


def test_invalid_status_and_missing_parent_rejected(db_session, graph):
    with pytest.raises(IntegrityError), db_session.begin_nested():
        db_session.add(Project(owner_id=graph[0].id, name="Bad status", status="unknown"))
        db_session.flush()
    for entity in (
        Project(owner_id=uuid4(), name="Missing owner"),
        Site(project_id=uuid4(), name="Missing project", geometry=WKTElement(SQUARE, srid=4326)),
        SiteMetric(site_id=uuid4(), recorded_at=WHEN, carbon_value=Decimal("1")),
    ):
        with pytest.raises(IntegrityError), db_session.begin_nested():
            db_session.add(entity)
            db_session.flush()


def test_user_delete_restricted_even_with_loaded_projects(db_session, graph):
    user = graph[0]
    assert user.projects
    with pytest.raises(IntegrityError), db_session.begin_nested():
        db_session.delete(user)
        db_session.flush()
    assert db_session.get(Project, graph[1].id) is not None


@pytest.mark.parametrize("target", ["site", "project"])
def test_database_deletion_cascades_only_to_descendants(db_session, graph, target):
    user, project, site = graph
    other_project = Project(owner=user, name="Unrelated project")
    db_session.add_all(
        [other_project, SiteMetric(site=site, recorded_at=WHEN, carbon_value=Decimal("1"))]
    )
    db_session.flush()
    if target == "project":
        db_session.execute(delete(Project).where(Project.id == project.id))
    else:
        db_session.execute(delete(Site).where(Site.id == site.id))
    assert db_session.scalar(select(func.count()).select_from(SiteMetric)) == 0
    assert db_session.scalar(select(func.count()).select_from(Site)) == 0
    assert db_session.scalar(select(User.id)) == user.id
    assert (
        db_session.scalar(select(Project.id).where(Project.id == other_project.id))
        == other_project.id
    )
    if target == "site":
        assert db_session.scalar(select(Project.id).where(Project.id == project.id)) == project.id


def test_timestamps_update_for_orm_and_raw_sql(db_session, graph):
    user, project, site = graph
    metric = SiteMetric(site=site, recorded_at=WHEN, carbon_value=Decimal("1"))
    db_session.add(metric)
    db_session.flush()
    for entity, table, change in (
        (user, "users", "full_name = 'Changed'"),
        (project, "projects", "name = 'Changed'"),
        (site, "sites", "name = 'Changed'"),
        (metric, "site_metrics", "carbon_value = 2"),
    ):
        created, updated = entity.created_at, entity.updated_at
        db_session.execute(text(f"UPDATE {table} SET {change} WHERE id = :id"), {"id": entity.id})
        db_session.refresh(entity)
        assert entity.updated_at > updated
        assert entity.created_at == created
    before = user.updated_at
    user.full_name = "ORM modification"
    db_session.flush()
    db_session.refresh(user)
    assert user.updated_at > before


def test_seed_idempotence_and_preservation(db_session):
    assert seed_demo_data(db_session) == {"users": 1, "projects": 2, "sites": 4, "site_metrics": 24}
    db_session.execute(
        text("UPDATE projects SET name = 'Reviewer edit' WHERE id = :id"),
        {"id": demo_id("project:ghats")},
    )
    assert seed_demo_data(db_session) == {"users": 0, "projects": 0, "sites": 0, "site_metrics": 0}
    assert db_session.get(Project, demo_id("project:ghats")).name == "Reviewer edit"
    user = db_session.scalar(select(User).where(User.email == DEMO_EMAIL))
    assert user.password_hash is None
    assert user.is_active is False
    assert db_session.scalar(select(func.count()).select_from(Site)) == 4
    areas = db_session.scalars(select(Site.area_hectares)).all()
    assert all(area > 0 for area in areas)
    assert len(set(areas)) == 4
    assert db_session.scalar(select(func.count()).select_from(SiteMetric)) == 24
