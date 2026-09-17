from collections.abc import Generator

from sqlalchemy.orm import Session

from app.db.session import new_session


def get_db() -> Generator[Session, None, None]:
    with new_session() as session:
        yield session
