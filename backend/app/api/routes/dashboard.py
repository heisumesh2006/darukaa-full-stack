from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import CurrentUser, get_db
from app.schemas.dashboard import DashboardResponse
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def get_dashboard_service(session: Annotated[Session, Depends(get_db)]) -> DashboardService:
    return DashboardService(session)


@router.get("/summary", response_model=DashboardResponse)
def dashboard(
    current_user: CurrentUser, service: Annotated[DashboardService, Depends(get_dashboard_service)]
):
    return service.summary(current_user.id)
