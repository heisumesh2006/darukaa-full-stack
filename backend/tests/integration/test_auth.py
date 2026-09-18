import secrets
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.api.dependencies import get_db
from app.core.config import get_settings
from app.core.security import create_access_token, verify_password
from app.main import create_app
from app.models import User
from app.repositories.user_repository import UserRepository

pytestmark = pytest.mark.integration


@pytest.fixture
def client(db_session):
    app = create_app()
    app.dependency_overrides[get_db] = lambda: db_session
    with TestClient(app) as client:
        yield client


@pytest.fixture
def account(client):
    credentials = {"email": "member@example.com", "password": secrets.token_urlsafe(24)}
    response = client.post("/api/auth/register", json=credentials | {"full_name": "Member"})
    assert response.status_code == 201
    return credentials, response.json()


def test_registration_normalizes_email_hashes_password_and_returns_only_safe_fields(
    client, db_session
):
    password = secrets.token_urlsafe(24)
    response = client.post(
        "/api/auth/register",
        json={
            "email": "  Person@Example.COM  ",
            "password": password,
            "full_name": "  Example User  ",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert set(body) == {"access_token", "token_type", "expires_in", "user"}
    assert set(body["user"]) == {"id", "email", "full_name", "is_active"}
    assert body["user"]["email"] == "person@example.com"
    assert body["user"]["full_name"] == "Example User"
    assert body["token_type"] == "bearer"
    assert response.headers["cache-control"] == "no-store"
    assert password not in response.text and "password_hash" not in response.text
    user = db_session.scalar(select(User).where(User.email == "person@example.com"))
    assert user.is_active
    assert user.password_hash.startswith("$argon2id$")
    assert verify_password(password, user.password_hash)


def test_duplicate_email_and_database_unique_conflict(client, account, monkeypatch):
    credentials = account[0]
    assert client.post("/api/auth/register", json=credentials).status_code == 409
    # Simulate another transaction registering after the service's optimistic check.
    monkeypatch.setattr(UserRepository, "by_email", lambda *_: None)
    conflict = client.post("/api/auth/register", json=credentials)
    assert conflict.status_code == 409
    assert conflict.json() == {"detail": "Email is already registered"}


@pytest.mark.parametrize("password", ["", "p4ssx!", " " * 12, "x" * 129])
def test_registration_password_policy_and_redacted_errors(client, password):
    response = client.post(
        "/api/auth/register", json={"email": "member@example.com", "password": password}
    )
    assert response.status_code == 422
    assert all("input" not in item and "ctx" not in item for item in response.json()["detail"])
    if password:
        assert password not in response.text


def test_registration_required_fields_email_validation_and_extra_fields(client):
    for data in (
        {"email": "member@example.com"},
        {"password": secrets.token_urlsafe(24)},
        {"email": "invalid", "password": secrets.token_urlsafe(24)},
        {"email": "member@example.com", "password": secrets.token_urlsafe(24), "is_active": False},
    ):
        assert client.post("/api/auth/register", json=data).status_code == 422


def test_login_normalization_and_me(client, account):
    credentials, _ = account
    login = client.post("/api/auth/login", json=credentials | {"email": " MEMBER@EXAMPLE.COM "})
    assert login.status_code == 200
    body = login.json()
    assert body["token_type"] == "bearer"
    assert len(body["access_token"].split(".")) == 3
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.status_code == 200
    assert me.json() == body["user"]
    assert "password" not in login.text and "password" not in me.text


def test_wrong_password_unknown_inactive_and_null_hash_all_use_generic_failure(
    client, account, db_session
):
    credentials, _ = account
    results = [
        client.post("/api/auth/login", json=credentials | {"password": secrets.token_urlsafe(24)}),
        client.post("/api/auth/login", json=credentials | {"email": "absent@example.com"}),
    ]
    user = db_session.scalar(select(User).where(User.email == credentials["email"]))
    user.is_active = False
    db_session.flush()
    results.append(client.post("/api/auth/login", json=credentials))
    user.is_active = True
    user.password_hash = None
    db_session.flush()
    results.append(client.post("/api/auth/login", json=credentials))
    for response in results:
        assert response.status_code == 401
        assert response.json() == {"detail": "Invalid email or password"}
        assert response.headers["www-authenticate"] == "Bearer"


@pytest.mark.parametrize("header", [None, "Bearer invalid", "Basic invalid", "Bearer"])
def test_me_rejects_missing_or_malformed_bearer(client, header):
    response = client.get("/api/auth/me", headers={"Authorization": header} if header else {})
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_me_rejects_expired_foreign_missing_subject_and_unknown_user(client, account):
    settings = get_settings()
    now = datetime.now(timezone.utc)
    claims = {
        "sub": account[1]["user"]["id"],
        "iat": now - timedelta(hours=2),
        "exp": now - timedelta(hours=1),
    }
    expired = jwt.encode(claims, settings.jwt_secret_key.get_secret_value(), algorithm="HS256")
    claims["exp"] = now + timedelta(minutes=10)
    foreign = jwt.encode(claims, secrets.token_urlsafe(48), algorithm="HS256")
    del claims["sub"]
    missing_sub = jwt.encode(claims, settings.jwt_secret_key.get_secret_value(), algorithm="HS256")
    for token in (expired, foreign, missing_sub, create_access_token(uuid4(), settings)):
        response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 401
        assert "password" not in response.text


def test_me_rechecks_account_activation_and_password_availability(client, account, db_session):
    credentials, auth = account
    user = db_session.scalar(select(User).where(User.email == credentials["email"]))
    user.is_active = False
    db_session.flush()
    headers = {"Authorization": f"Bearer {auth['access_token']}"}
    assert client.get("/api/auth/me", headers=headers).status_code == 401
    user.is_active = True
    user.password_hash = None
    db_session.flush()
    assert client.get("/api/auth/me", headers=headers).status_code == 401
