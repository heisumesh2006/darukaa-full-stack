from geoalchemy2 import alembic_helpers

from alembic import context
from app.db.base import Base
from app.db.session import get_engine
from app.models import Project, Site, SiteMetric, User  # noqa: F401 -- register metadata

target_metadata = Base.metadata


def configure(connection=None) -> None:
    options = {
        "target_metadata": target_metadata,
        "include_object": alembic_helpers.include_object,
        "render_item": alembic_helpers.render_item,
    }
    if connection is None:
        context.configure(url=get_engine().url, literal_binds=True, **options)
    else:
        context.configure(connection=connection, **options)
    with context.begin_transaction():
        # Docker's PostGIS image adds tiger/topology to search_path. Application
        # migrations own public only; don't reflect extension tables as removed models.
        context.execute("SET LOCAL search_path TO public")
        context.run_migrations()


if context.is_offline_mode():
    configure()
elif context.config.attributes.get("connection") is not None:
    configure(context.config.attributes["connection"])
else:
    with get_engine().connect() as connection:
        configure(connection)
