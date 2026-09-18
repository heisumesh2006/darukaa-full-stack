from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.security import create_access_token, hash_password, verify_password
from app.models import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import AuthResponse, Credentials, RegisterRequest, UserResponse


class EmailAlreadyRegistered(Exception):
    pass


class InvalidCredentials(Exception):
    pass


class AuthService:
    def __init__(self, session: Session, settings: Settings):
        self.session = session
        self.users = UserRepository(session)
        self.settings = settings

    def response(self, user: User) -> AuthResponse:
        return AuthResponse(
            access_token=create_access_token(user.id, self.settings),
            expires_in=self.settings.jwt_access_token_expire_minutes * 60,
            user=UserResponse.model_validate(user),
        )

    def register(self, data: RegisterRequest) -> AuthResponse:
        if self.users.by_email(str(data.email)) is not None:
            raise EmailAlreadyRegistered
        try:
            user = self.users.create(
                email=str(data.email),
                full_name=data.full_name,
                password_hash=hash_password(data.password.get_secret_value()),
            )
            self.session.commit()
        except IntegrityError as exc:
            self.session.rollback()
            if (
                getattr(getattr(exc.orig, "diag", None), "constraint_name", None)
                == "uq_users_email"
            ):
                raise EmailAlreadyRegistered from exc
            raise
        return self.response(user)

    def login(self, data: Credentials) -> AuthResponse:
        user = self.users.by_email(str(data.email))
        valid = verify_password(
            data.password.get_secret_value(), user.password_hash if user else None
        )
        if user is None or not valid or not user.is_active:
            raise InvalidCredentials
        return self.response(user)

    def current_user(self, user_id: UUID) -> User:
        user = self.users.by_id(user_id)
        if user is None or not user.is_active or user.password_hash is None:
            raise InvalidCredentials
        return user
