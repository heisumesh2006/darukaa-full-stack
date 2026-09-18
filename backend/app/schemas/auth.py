from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, SecretStr, field_validator


class Credentials(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)
    email: Annotated[EmailStr, Field(max_length=320)]
    password: Annotated[SecretStr, Field(min_length=1, max_length=128)]

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value):
        return value.strip().lower() if isinstance(value, str) else value


class RegisterRequest(Credentials):
    password: Annotated[SecretStr, Field(min_length=12, max_length=128)]
    full_name: Annotated[str | None, Field(max_length=200)] = None

    @field_validator("password")
    @classmethod
    def require_nonblank_password(cls, value: SecretStr) -> SecretStr:
        if not value.get_secret_value().strip():
            raise ValueError("Password must not contain only whitespace")
        return value

    @field_validator("full_name")
    @classmethod
    def normalize_name(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    email: str
    full_name: str | None
    is_active: bool


class AuthResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    user: UserResponse
