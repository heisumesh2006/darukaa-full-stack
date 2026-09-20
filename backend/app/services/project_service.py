from uuid import UUID

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models import Project
from app.repositories.project_repository import ProjectRepository
from app.schemas.project import ProjectCreate, ProjectUpdate


class ProjectNotFound(Exception):
    """Missing and foreign-owned resources deliberately have the same public response."""


class ProjectService:
    def __init__(self, session: Session):
        self.session = session
        self.projects = ProjectRepository(session)

    def list(self, owner_id: UUID) -> list[Project]:
        return self.projects.list_for_owner(owner_id)

    def get(self, project_id: UUID, owner_id: UUID) -> Project:
        project = self.projects.find_owned(project_id, owner_id)
        if project is None:
            raise ProjectNotFound
        return project

    def create(self, owner_id: UUID, data: ProjectCreate) -> Project:
        try:
            project = self.projects.create(owner_id, **data.model_dump())
            self.session.commit()
            return project
        except SQLAlchemyError:
            self.session.rollback()
            raise

    def update(self, project_id: UUID, owner_id: UUID, data: ProjectUpdate) -> Project:
        project = self.get(project_id, owner_id)
        try:
            self.projects.update(project, data.model_dump(exclude_unset=True))
            self.session.commit()
            return project
        except SQLAlchemyError:
            self.session.rollback()
            raise

    def delete(self, project_id: UUID, owner_id: UUID) -> None:
        project = self.get(project_id, owner_id)
        try:
            self.projects.delete(project)
            self.session.commit()
        except SQLAlchemyError:
            self.session.rollback()
            raise
