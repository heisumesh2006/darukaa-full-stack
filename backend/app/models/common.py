"""Shared persistence columns; timestamp updates are enforced by migration triggers."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, FetchedValue, func, text
from sqlalchemy.orm import Mapped, mapped_column


class IdentityTimestampMixin:
    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        server_onupdate=FetchedValue(),
    )
