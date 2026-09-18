import secrets
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt
import pytest
from pydantic import ValidationError

from app.core.config import Settings, get_settings
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_argon2id_password_hash_and_verification():
    password = secrets.token_urlsafe(24)
    encoded = hash_password(password)
    assert encoded.startswith("$argon2id$")
    assert encoded != password
    assert password not in encoded
    assert verify_password(password, encoded)
    assert not verify_password(secrets.token_urlsafe(24), encoded)
    assert not verify_password(password, None)
    assert not verify_password(password, "invalid-legacy-hash")
    assert hash_password(password) != encoded


def test_jwt_subject_expiration_and_minimal_payload():
    settings = get_settings()
    user_id = uuid4()
    token = create_access_token(user_id, settings)
    assert decode_access_token(token, settings) == user_id
    payload = jwt.decode(token, settings.jwt_secret_key.get_secret_value(), algorithms=["HS256"])
    assert set(payload) == {"sub", "iat", "exp"}
    assert payload["exp"] - payload["iat"] == settings.jwt_access_token_expire_minutes * 60


@pytest.mark.parametrize(
    "change",
    [
        {"sub": None},
        {"sub": "not-a-uuid"},
        {"sub": 123},
        {"exp": "not-a-date"},
        {"exp": None},
        {"iat": None},
        {"exp": True},
    ],
)
def test_malformed_signed_claims_rejected(change):
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {"sub": str(uuid4()), "iat": now, "exp": now + timedelta(minutes=5)} | change
    token = jwt.encode(payload, settings.jwt_secret_key.get_secret_value(), algorithm="HS256")
    with pytest.raises(jwt.InvalidTokenError):
        decode_access_token(token, settings)


@pytest.mark.parametrize("claim", ["sub", "iat", "exp"])
def test_required_claims(claim):
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {"sub": str(uuid4()), "iat": now, "exp": now + timedelta(minutes=5)}
    del payload[claim]
    token = jwt.encode(payload, settings.jwt_secret_key.get_secret_value(), algorithm="HS256")
    with pytest.raises(jwt.InvalidTokenError):
        decode_access_token(token, settings)


def test_invalid_signature_expired_unsigned_and_oversized_tokens():
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(uuid4()),
        "iat": now - timedelta(hours=2),
        "exp": now - timedelta(hours=1),
    }
    expired = jwt.encode(payload, settings.jwt_secret_key.get_secret_value(), algorithm="HS256")
    foreign = jwt.encode(payload, secrets.token_urlsafe(48), algorithm="HS256")
    unsigned = jwt.encode(payload, key="", algorithm="none")
    for token in (expired, foreign, unsigned, "x" * 4097, "malformed"):
        with pytest.raises(jwt.InvalidTokenError):
            decode_access_token(token, settings)


def test_auth_configuration_fails_closed():
    for overrides in (
        {"jwt_secret_key": "short"},
        {"jwt_algorithm": "none"},
        {"jwt_access_token_expire_minutes": 0},
    ):
        with pytest.raises(ValidationError):
            Settings(**overrides)
