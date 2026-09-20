from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.api.dependencies import CurrentUser, get_db
from app.schemas.site import SiteCreate, SiteResponse, SiteUpdate
from app.services.site_service import SiteService

router = APIRouter(prefix="/projects/{project_id}/sites", tags=["sites"])


def get_site_service(session: Annotated[Session, Depends(get_db)]) -> SiteService:
    return SiteService(session)


Service = Annotated[SiteService, Depends(get_site_service)]


@router.get("", response_model=list[SiteResponse])
def list_sites(project_id: UUID, current_user: CurrentUser, service: Service):
    return service.list(current_user.id, project_id)


@router.post("", response_model=SiteResponse, status_code=201)
def create_site(project_id: UUID, data: SiteCreate, current_user: CurrentUser, service: Service):
    return service.create(current_user.id, project_id, data)


@router.get("/{site_id}", response_model=SiteResponse)
def get_site(project_id: UUID, site_id: UUID, current_user: CurrentUser, service: Service):
    return service.get(current_user.id, project_id, site_id)


@router.patch("/{site_id}", response_model=SiteResponse)
def update_site(
    project_id: UUID, site_id: UUID, data: SiteUpdate, current_user: CurrentUser, service: Service
):
    return service.update(current_user.id, project_id, site_id, data)


@router.delete("/{site_id}", status_code=204)
def delete_site(project_id: UUID, site_id: UUID, current_user: CurrentUser, service: Service):
    service.delete(current_user.id, project_id, site_id)
    return Response(status_code=204)
