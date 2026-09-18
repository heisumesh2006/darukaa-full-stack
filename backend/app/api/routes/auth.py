from typing import Annotated

from fastapi import APIRouter, Depends, Response

from app.api.dependencies import CurrentUser, get_auth_service
from app.schemas.auth import AuthResponse, Credentials, RegisterRequest, UserResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["authentication"])
Service = Annotated[AuthService, Depends(get_auth_service)]


@router.post("/register", response_model=AuthResponse, status_code=201)
def register(data: RegisterRequest, service: Service, response: Response) -> AuthResponse:
    response.headers["Cache-Control"] = "no-store"
    return service.register(data)


@router.post("/login", response_model=AuthResponse)
def login(data: Credentials, service: Service, response: Response) -> AuthResponse:
    response.headers["Cache-Control"] = "no-store"
    return service.login(data)


@router.get("/me", response_model=UserResponse)
def me(current_user: CurrentUser, response: Response) -> UserResponse:
    response.headers["Cache-Control"] = "no-store"
    return UserResponse.model_validate(current_user)
