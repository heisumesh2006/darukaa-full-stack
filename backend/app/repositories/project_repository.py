from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Project


class ProjectRepository:
    def __init__(self, session: Session):
        self.session = session

    def list_for_owner(self, owner_id: UUID) -> list[Project]:
        statement = (
            select(Project)
            .where(Project.owner_id == owner_id)
            .order_by(Project.created_at.desc(), Project.id.desc())
        )
        return list(self.session.scalars(statement))

    def find_owned(self, project_id: UUID, owner_id: UUID) -> Project | None:
        return self.session.scalar(
            select(Project).where(Project.id == project_id, Project.owner_id == owner_id)
        )

    def create(self, owner_id: UUID, *, name: str, description: str | None, status: str) -> Project:
        project = Project(owner_id=owner_id, name=name, description=description, status=status)
        self.session.add(project)
        self.session.flush()
        return project

    def update(self, project: Project, changes: dict) -> Project:
        # The service passes only ProjectUpdate's explicitly validated editable fields.
        for key in ("name", "description", "status"):
            if key in changes:
                setattr(project, key, changes[key])
        self.session.flush()
        self.session.refresh(project)
        return project

    def delete(self, project: Project) -> None:
        self.session.delete(project)
        self.session.flush()
