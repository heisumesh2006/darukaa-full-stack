from uuid import UUID

from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.repositories.site_repository import SiteRepository
from app.schemas.site import SiteCreate, SiteResponse, SiteUpdate
from app.services.project_service import ProjectService


class SiteNotFound(Exception):
    pass


class InvalidBoundary(Exception):
    pass


class SiteService:
    def __init__(self, session: Session):
        self.session = session
        self.sites = SiteRepository(session)
        self.projects = ProjectService(session)

    def require_site(self, owner_id: UUID, project_id: UUID, site_id: UUID):
        self.projects.get(project_id, owner_id)
        site = self.sites.find(project_id, site_id)
        if site is None:
            raise SiteNotFound
        return site

    def list(self, owner_id: UUID, project_id: UUID) -> list[SiteResponse]:
        self.projects.get(project_id, owner_id)
        return [SiteResponse.model_validate(row) for row in self.sites.responses(project_id)]

    def get(self, owner_id: UUID, project_id: UUID, site_id: UUID) -> SiteResponse:
        self.require_site(owner_id, project_id, site_id)
        return SiteResponse.model_validate(self.sites.responses(project_id, site_id)[0])

    def create(self, owner_id: UUID, project_id: UUID, data: SiteCreate) -> SiteResponse:
        self.projects.get(project_id, owner_id)
        try:
            if not self.sites.valid_geometry(data.geometry):
                raise InvalidBoundary
            site = self.sites.create(project_id, data.name, data.description, data.geometry)
            response = SiteResponse.model_validate(self.sites.responses(project_id, site.id)[0])
            self.session.commit()
            return response
        except IntegrityError:
            self.session.rollback()
            raise InvalidBoundary from None
        except (SQLAlchemyError, InvalidBoundary):
            self.session.rollback()
            raise

    def update(
        self, owner_id: UUID, project_id: UUID, site_id: UUID, data: SiteUpdate
    ) -> SiteResponse:
        site = self.require_site(owner_id, project_id, site_id)
        try:
            if data.geometry is not None and not self.sites.valid_geometry(data.geometry):
                raise InvalidBoundary
            self.sites.update(site, data.model_dump(exclude_unset=True), data.geometry)
            response = SiteResponse.model_validate(self.sites.responses(project_id, site_id)[0])
            self.session.commit()
            return response
        except IntegrityError:
            self.session.rollback()
            raise InvalidBoundary from None
        except (SQLAlchemyError, InvalidBoundary):
            self.session.rollback()
            raise

    def delete(self, owner_id: UUID, project_id: UUID, site_id: UUID) -> None:
        site = self.require_site(owner_id, project_id, site_id)
        try:
            self.sites.delete(site)
            self.session.commit()
        except SQLAlchemyError:
            self.session.rollback()
            raise
