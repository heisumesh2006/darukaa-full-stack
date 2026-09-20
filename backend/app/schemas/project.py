from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

ProjectStatus = Literal["draft", "active", "archived"]
ProjectName = Annotated[str, Field(min_length=1, max_length=200)]
ProjectDescription = Annotated[str, Field(max_length=5000)]


class ProjectInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    @field_validator("name", "description", mode="before", check_fields=False)
    @classmethod
    def trim_text(cls, value):
        return value.strip() if isinstance(value, str) else value


class ProjectCreate(ProjectInput):
    name: ProjectName
    description: ProjectDescription | None = None
    status: ProjectStatus = "draft"


class ProjectUpdate(ProjectInput):
    name: ProjectName | None = None
    description: ProjectDescription | None = None
    status: ProjectStatus | None = None

    @model_validator(mode="after")
    def validate_patch(self):
        if not self.model_fields_set:
            raise ValueError("Provide at least one editable field")
        for name in ("name", "status"):
            if name in self.model_fields_set and getattr(self, name) is None:
                raise ValueError(f"{name} cannot be null")
        return self


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    owner_id: UUID
    name: str
    description: str | None
    status: ProjectStatus
    created_at: datetime
    updated_at: datetime
