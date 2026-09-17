from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from geoalchemy2 import Geometry, WKBElement
from sqlalchemy import CheckConstraint, Computed, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.common import IdentityTimestampMixin

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.site_metric import SiteMetric


class Site(IdentityTimestampMixin, Base):
    __tablename__ = "sites"
    __table_args__ = (
        CheckConstraint("btrim(name) <> ''", name="name_not_blank"),
        CheckConstraint("NOT ST_IsEmpty(geometry) AND ST_IsValid(geometry)", name="geometry_valid"),
        CheckConstraint(
            "ST_XMin(Box3D(geometry)) >= -180 AND ST_XMax(Box3D(geometry)) <= 180 "
            "AND ST_YMin(Box3D(geometry)) >= -90 AND ST_YMax(Box3D(geometry)) <= 90",
            name="geometry_wgs84_bounds",
        ),
        CheckConstraint("area_hectares > 0", name="area_positive"),
    )

    project_id: Mapped[UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    geometry: Mapped[WKBElement] = mapped_column(
        Geometry(geometry_type="POLYGON", srid=4326, spatial_index=True), nullable=False
    )
    # Stored generated column: correct geodesic area, refreshed even on raw SQL updates.
    area_hectares: Mapped[Decimal] = mapped_column(
        Numeric(18, 6),
        Computed("ST_Area(geometry::geography) / 10000.0", persisted=True),
        nullable=False,
    )

    project: Mapped[Project] = relationship(back_populates="sites")
    metrics: Mapped[list[SiteMetric]] = relationship(
        back_populates="site", cascade="all, delete-orphan", passive_deletes=True
    )
