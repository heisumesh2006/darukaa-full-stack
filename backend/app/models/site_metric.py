from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.common import IdentityTimestampMixin

if TYPE_CHECKING:
    from app.models.site import Site


class SiteMetric(IdentityTimestampMixin, Base):
    __tablename__ = "site_metrics"
    __table_args__ = (
        UniqueConstraint("site_id", "recorded_at", name="uq_site_metrics_site_recorded_at"),
        CheckConstraint(
            "carbon_value >= 0 AND carbon_value < 'Infinity'::numeric", name="carbon_nonnegative"
        ),
        CheckConstraint("biodiversity_value BETWEEN 0 AND 100", name="biodiversity_range"),
        CheckConstraint(
            "carbon_value IS NOT NULL OR biodiversity_value IS NOT NULL", name="has_measurement"
        ),
    )

    # The unique (site_id, recorded_at) B-tree also indexes lookups by site_id alone.
    site_id: Mapped[UUID] = mapped_column(
        ForeignKey("sites.id", ondelete="CASCADE"), nullable=False
    )
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    carbon_value: Mapped[Decimal | None] = mapped_column(Numeric(16, 4))
    biodiversity_value: Mapped[Decimal | None] = mapped_column(Numeric(7, 4))

    site: Mapped[Site] = relationship(back_populates="metrics")
