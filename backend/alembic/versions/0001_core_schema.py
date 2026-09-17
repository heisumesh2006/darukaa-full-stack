"""Create core relational and PostGIS schema.

Revision ID: 0001_core_schema
Revises: None
"""

import sqlalchemy as sa
from geoalchemy2 import Geometry

from alembic import op

revision = "0001_core_schema"
down_revision = None
branch_labels = None
depends_on = None


def identity_timestamps() -> list[sa.Column]:
    return [
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    ]


def upgrade() -> None:
    # PostgreSQL 17 supplies gen_random_uuid() natively; pgcrypto is not required.
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.create_table(
        "users",
        *identity_timestamps(),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=True),
        sa.Column("full_name", sa.String(200), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.UniqueConstraint("email", name="uq_users_email"),
        sa.CheckConstraint("email = lower(btrim(email)) AND email <> ''", name="email_normalized"),
    )
    op.create_table(
        "projects",
        *identity_timestamps(),
        sa.Column("owner_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), server_default=sa.text("'draft'"), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="RESTRICT"),
        sa.CheckConstraint("status IN ('draft', 'active', 'archived')", name="status_allowed"),
        sa.CheckConstraint("btrim(name) <> ''", name="name_not_blank"),
    )
    op.create_index("ix_projects_owner_id", "projects", ["owner_id"])
    op.create_table(
        "sites",
        *identity_timestamps(),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("geometry", Geometry("POLYGON", srid=4326, spatial_index=False), nullable=False),
        sa.Column(
            "area_hectares",
            sa.Numeric(18, 6),
            sa.Computed("ST_Area(geometry::geography) / 10000.0", persisted=True),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.CheckConstraint("btrim(name) <> ''", name="name_not_blank"),
        sa.CheckConstraint(
            "NOT ST_IsEmpty(geometry) AND ST_IsValid(geometry)", name="geometry_valid"
        ),
        sa.CheckConstraint(
            "ST_XMin(Box3D(geometry)) >= -180 AND ST_XMax(Box3D(geometry)) <= 180 "
            "AND ST_YMin(Box3D(geometry)) >= -90 AND ST_YMax(Box3D(geometry)) <= 90",
            name="geometry_wgs84_bounds",
        ),
        sa.CheckConstraint("area_hectares > 0", name="area_positive"),
    )
    op.create_index("ix_sites_project_id", "sites", ["project_id"])
    op.create_index("idx_sites_geometry", "sites", ["geometry"], postgresql_using="gist")
    op.create_table(
        "site_metrics",
        *identity_timestamps(),
        sa.Column("site_id", sa.Uuid(), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("carbon_value", sa.Numeric(16, 4), nullable=True),
        sa.Column("biodiversity_value", sa.Numeric(7, 4), nullable=True),
        sa.ForeignKeyConstraint(["site_id"], ["sites.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("site_id", "recorded_at", name="uq_site_metrics_site_recorded_at"),
        sa.CheckConstraint(
            "carbon_value >= 0 AND carbon_value < 'Infinity'::numeric", name="carbon_nonnegative"
        ),
        sa.CheckConstraint("biodiversity_value BETWEEN 0 AND 100", name="biodiversity_range"),
        sa.CheckConstraint(
            "carbon_value IS NOT NULL OR biodiversity_value IS NOT NULL", name="has_measurement"
        ),
    )
    op.create_index("ix_site_metrics_recorded_at", "site_metrics", ["recorded_at"])
    # One ordinary PostgreSQL trigger function covers ORM, bulk and direct SQL writes.
    op.execute("""
        CREATE FUNCTION darukaa_touch_updated_at() RETURNS trigger
        LANGUAGE plpgsql AS $$
        BEGIN
            NEW.updated_at = statement_timestamp();
            RETURN NEW;
        END;
        $$
    """)
    for table in ("users", "projects", "sites", "site_metrics"):
        op.execute(
            f"CREATE TRIGGER trg_{table}_updated_at BEFORE UPDATE ON {table} "
            "FOR EACH ROW EXECUTE FUNCTION darukaa_touch_updated_at()"
        )


def downgrade() -> None:
    for table in ("site_metrics", "sites", "projects", "users"):
        op.drop_table(table)
    op.execute("DROP FUNCTION darukaa_touch_updated_at()")
    # PostGIS may predate this application and be shared. Never drop the extension.
