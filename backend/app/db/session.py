from functools import lru_cache

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session

from app.core.config import get_settings


@lru_cache
def get_engine() -> Engine:
    url = get_settings().database_url
    if url is None or not url.get_secret_value():
        raise RuntimeError("Set DATABASE_URL in the root .env before accessing the database.")
    return create_engine(url.get_secret_value(), pool_pre_ping=True)


def new_session() -> Session:
    return Session(get_engine(), expire_on_commit=False)
