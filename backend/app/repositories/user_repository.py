from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import User


class UserRepository:
    def __init__(self, session: Session):
        self.session = session

    def by_email(self, email: str) -> User | None:
        return self.session.scalar(select(User).where(User.email == email))

    def by_id(self, user_id: UUID) -> User | None:
        return self.session.get(User, user_id)

    def create(self, *, email: str, password_hash: str, full_name: str | None) -> User:
        user = User(email=email, password_hash=password_hash, full_name=full_name, is_active=True)
        self.session.add(user)
        self.session.flush()
        return user
