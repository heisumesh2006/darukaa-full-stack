"""Password hashing and signed access tokens; no HTTP or database concerns."""

import secrets
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from uuid import UUID

import jwt
from pwdlib import PasswordHash
from pwdlib.exceptions import UnknownHashError

from app.core.config import Settings

password_hasher = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


@lru_cache
def dummy_hash() -> str:
    # Unknown users still incur a password verification operation.
    return hash_password(secrets.token_urlsafe(32))


def verify_password(password: str, encoded: str | None) -> bool:
    try:
        valid = password_hasher.verify(password, encoded or dummy_hash())
        return valid and encoded is not None
    except (UnknownHashError, ValueError):
        # Legacy/invalid stored hashes cannot authenticate; never expose their content.
        password_hasher.verify(password, dummy_hash())
        return False


def create_access_token(user_id: UUID, settings: Settings) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {
            "sub": str(user_id),
            "iat": now,
            "exp": now + timedelta(minutes=settings.jwt_access_token_expire_minutes),
        },
        settings.jwt_secret_key.get_secret_value(),
        algorithm=settings.jwt_algorithm,
    )


def decode_access_token(token: str, settings: Settings) -> UUID:
    if len(token) > 4096:
        raise jwt.InvalidTokenError("Invalid access token")
    claims = jwt.decode(
        token,
        settings.jwt_secret_key.get_secret_value(),
        algorithms=[settings.jwt_algorithm],
        options={"require": ["sub", "exp", "iat"]},
    )
    if (
        type(claims["exp"]) is not int
        or type(claims["iat"]) is not int
        or claims["exp"] <= claims["iat"]
    ):
        raise jwt.InvalidTokenError("Invalid access token")
    try:
        return UUID(claims["sub"])
    except (ValueError, TypeError, AttributeError) as exc:
        raise jwt.InvalidTokenError("Invalid access token") from exc
