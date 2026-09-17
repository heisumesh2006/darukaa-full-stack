from geoalchemy2 import alembic_helpers

from alembic import context
from app.db.base import Base
from app.db.session import get_engine

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
        context.run_migrations()


if context.is_offline_mode():
    configure()
else:
    with get_engine().connect() as connection:
        configure(connection)
