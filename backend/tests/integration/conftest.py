"""Actual PostgreSQL integration fixtures; application data is never reset.

Each disposable database name is generated here, never accepted from user input.
The configured role needs CREATEDB and permission to enable PostGIS.
"""

import os
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from uuid import uuid4

import pytest
from alembic.config import Config
from sqlalchemy import Engine, create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from alembic import command
from app.core.config import get_settings

BACKEND_ROOT = Path(__file__).resolve().parents[2]


def migration_config(connection) -> Config:
    config = Config(str(BACKEND_ROOT / "alembic.ini"))
    config.attributes["connection"] = connection
    return config


@pytest.fixture(scope="session")
def admin_engine() -> Iterator[Engine]:
    explicit_url = os.environ.get("TEST_DATABASE_ADMIN_URL")
    configured_url = get_settings().database_url
    if not explicit_url and configured_url is None:
        pytest.fail("Set local DATABASE_URL or explicitly supply TEST_DATABASE_ADMIN_URL.")
    url = make_url(explicit_url or configured_url.get_secret_value())
    if url.get_backend_name() != "postgresql":
        pytest.fail("Integration tests require real PostgreSQL/PostGIS, not SQLite.")
    if not explicit_url and url.host not in {"localhost", "127.0.0.1", "::1"}:
        pytest.fail("Non-local testing requires explicit TEST_DATABASE_ADMIN_URL.")
    engine = create_engine(url, isolation_level="AUTOCOMMIT")
    try:
        yield engine
    finally:
        engine.dispose()


@contextmanager
def disposable_database(admin: Engine) -> Iterator[Engine]:
    name = f"darukaa_test_{uuid4().hex}"
    with admin.connect() as connection:
        connection.execute(text(f'CREATE DATABASE "{name}" TEMPLATE template0'))
    engine = create_engine(admin.url.set(database=name))
    try:
        yield engine
    finally:
        engine.dispose()
        # Only the fresh name generated above is ever dropped; no application DB downgrade.
        with admin.connect() as connection:
            connection.execute(text(f'DROP DATABASE "{name}" WITH (FORCE)'))


@pytest.fixture(scope="session")
def db_engine(admin_engine: Engine) -> Iterator[Engine]:
    with disposable_database(admin_engine) as engine:
        with engine.begin() as connection:
            command.upgrade(migration_config(connection), "head")
        yield engine


@pytest.fixture
def db_session(db_engine: Engine) -> Iterator[Session]:
    with db_engine.connect() as connection:
        transaction = connection.begin()
        with Session(bind=connection, join_transaction_mode="create_savepoint") as session:
            try:
                yield session
            finally:
                session.close()
                transaction.rollback()


@pytest.fixture
def api_client(db_session):
    from fastapi.testclient import TestClient

    from app.api.dependencies import get_db
    from app.main import create_app

    app = create_app()
    app.dependency_overrides[get_db] = lambda: db_session
    with TestClient(app) as client:
        yield client


@pytest.fixture
def owned_projects(api_client):
    import secrets

    result = []
    for email in ("geo-owner@example.com", "geo-other@example.com"):
        account = api_client.post(
            "/api/auth/register", json={"email": email, "password": secrets.token_urlsafe(24)}
        )
        assert account.status_code == 201
        headers = {"Authorization": f"Bearer {account.json()['access_token']}"}
        project = api_client.post(
            "/api/projects", headers=headers, json={"name": "Synthetic test project"}
        )
        assert project.status_code == 201
        result.append((headers, project.json()["id"]))
    return result
