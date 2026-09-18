from collections.abc import Generator
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.security import decode_access_token
from app.db.session import new_session
from app.models import User
from app.services.auth_service import AuthService, InvalidCredentials


def get_db() -> Generator[Session, None, None]:
    with new_session() as session:
        yield session


def get_auth_service(
    session: Annotated[Session, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthService:
    return AuthService(session, settings)


bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    service: Annotated[AuthService, Depends(get_auth_service)],
) -> User:
    error = HTTPException(
        status_code=401,
        detail="Invalid or expired access token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise error
    try:
        user_id = decode_access_token(credentials.credentials, service.settings)
        return service.current_user(user_id)
    except (jwt.InvalidTokenError, InvalidCredentials) as exc:
        raise error from exc


CurrentUser = Annotated[User, Depends(get_current_user)]
