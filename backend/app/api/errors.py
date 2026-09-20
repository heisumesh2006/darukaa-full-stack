from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.services.auth_service import EmailAlreadyRegistered, InvalidCredentials
from app.services.project_service import ProjectNotFound
from app.services.site_service import InvalidBoundary, SiteNotFound


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(SiteNotFound)
    async def site_not_found(_request: Request, _exc: SiteNotFound):
        return JSONResponse(status_code=404, content={"detail": "Site not found"})

    @app.exception_handler(InvalidBoundary)
    async def invalid_boundary(_request: Request, _exc: InvalidBoundary):
        return JSONResponse(
            status_code=422,
            content={"detail": "Boundary must be a valid Polygon with positive geodesic area"},
        )

    @app.exception_handler(ProjectNotFound)
    async def project_not_found(_request: Request, _exc: ProjectNotFound):
        return JSONResponse(status_code=404, content={"detail": "Project not found"})

    @app.exception_handler(RequestValidationError)
    async def validation_error(_request: Request, exc: RequestValidationError):
        # FastAPI's default validation errors echo input. Never reflect submitted secrets.
        errors = [
            {"loc": item["loc"], "msg": item["msg"], "type": item["type"]} for item in exc.errors()
        ]
        return JSONResponse(status_code=422, content={"detail": errors})

    @app.exception_handler(EmailAlreadyRegistered)
    async def duplicate_email(_request: Request, _exc: EmailAlreadyRegistered):
        return JSONResponse(status_code=409, content={"detail": "Email is already registered"})

    @app.exception_handler(InvalidCredentials)
    async def invalid_credentials(_request: Request, _exc: InvalidCredentials):
        return JSONResponse(
            status_code=401,
            content={"detail": "Invalid email or password"},
            headers={"WWW-Authenticate": "Bearer"},
        )

    @app.exception_handler(SQLAlchemyError)
    async def database_unavailable(_request: Request, _exc: SQLAlchemyError):
        # Database exception strings can contain parameters; never expose or log them here.
        return JSONResponse(status_code=503, content={"detail": "Service temporarily unavailable"})
