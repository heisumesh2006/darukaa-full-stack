from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import CurrentUser, get_db
from app.schemas.analytics import MetricResponse, SiteAnalytics
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/projects/{project_id}/sites/{site_id}", tags=["analytics"])


def get_analytics_service(session: Annotated[Session, Depends(get_db)]) -> AnalyticsService:
    return AnalyticsService(session)


Service = Annotated[AnalyticsService, Depends(get_analytics_service)]


@router.get("/metrics", response_model=list[MetricResponse])
def metrics(project_id: UUID, site_id: UUID, current_user: CurrentUser, service: Service):
    return service.list(current_user.id, project_id, site_id)


@router.get("/analytics", response_model=SiteAnalytics)
def analytics(project_id: UUID, site_id: UUID, current_user: CurrentUser, service: Service):
    return service.summary(current_user.id, project_id, site_id)
