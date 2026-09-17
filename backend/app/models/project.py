from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import CheckConstraint, ForeignKey, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.common import IdentityTimestampMixin

if TYPE_CHECKING:
    from app.models.site import Site
    from app.models.user import User


class Project(IdentityTimestampMixin, Base):
    __tablename__ = "projects"
    __table_args__ = (
        CheckConstraint("status IN ('draft', 'active', 'archived')", name="status_allowed"),
        CheckConstraint("btrim(name) <> ''", name="name_not_blank"),
    )

    owner_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("'draft'"))

    owner: Mapped[User] = relationship(back_populates="projects")
    sites: Mapped[list[Site]] = relationship(
        back_populates="project", cascade="all, delete-orphan", passive_deletes=True
    )
