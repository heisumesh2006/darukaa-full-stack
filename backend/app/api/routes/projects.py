from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.api.dependencies import CurrentUser, get_db
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects", tags=["projects"])


def get_project_service(session: Annotated[Session, Depends(get_db)]) -> ProjectService:
    return ProjectService(session)


Service = Annotated[ProjectService, Depends(get_project_service)]


@router.get("", response_model=list[ProjectResponse])
def list_projects(current_user: CurrentUser, service: Service):
    return service.list(current_user.id)


@router.post("", response_model=ProjectResponse, status_code=201)
def create_project(data: ProjectCreate, current_user: CurrentUser, service: Service):
    return service.create(current_user.id, data)


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: UUID, current_user: CurrentUser, service: Service):
    return service.get(project_id, current_user.id)


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: UUID, data: ProjectUpdate, current_user: CurrentUser, service: Service
):
    return service.update(project_id, current_user.id, data)


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: UUID, current_user: CurrentUser, service: Service):
    service.delete(project_id, current_user.id)
    return Response(status_code=204)
