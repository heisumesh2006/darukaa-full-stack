"""Local project HTTP smoke test. Generated credentials stay in memory; data is removed."""

import argparse
import re
import secrets
from uuid import uuid4

import httpx
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db.session import get_engine
from app.models import Project, User


def cleanup(email: str) -> None:
    if not re.fullmatch(r"project-smoke-[0-9a-f]{32}@example\.com", email):
        raise ValueError("Cleanup is restricted to generated project smoke-test identities")
    with Session(get_engine()) as session, session.begin():
        owner = session.scalar(select(User.id).where(User.email == email))
        if owner is not None:
            session.execute(delete(Project).where(Project.owner_id == owner))
            session.execute(delete(User).where(User.id == owner))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cleanup-email")
    args = parser.parse_args()
    if args.cleanup_email:
        cleanup(args.cleanup_email)
        print("Temporary project account and owned data cleaned up")
        return
    emails = [f"project-smoke-{uuid4().hex}@example.com" for _ in range(2)]
    try:
        with httpx.Client(base_url="http://127.0.0.1:8000/api", timeout=15) as client:
            headers = []
            for email in emails:
                credentials = {"email": email, "password": secrets.token_urlsafe(24)}
                assert client.post("/auth/register", json=credentials).status_code == 201
                login = client.post("/auth/login", json=credentials)
                assert login.status_code == 200
                headers.append({"Authorization": f"Bearer {login.json()['access_token']}"})
            assert client.get("/projects").status_code == 401
            created = client.post(
                "/projects", headers=headers[0], json={"name": "Synthetic smoke project"}
            )
            assert created.status_code == 201
            project = created.json()
            path = f"/projects/{project['id']}"
            assert client.get("/projects", headers=headers[0]).json() == [project]
            assert client.get(path, headers=headers[0]).json() == project
            assert client.get("/projects", headers=headers[1]).json() == []
            for method, body in (("GET", None), ("PATCH", {"name": "Denied"}), ("DELETE", None)):
                assert (
                    client.request(method, path, headers=headers[1], json=body).status_code == 404
                )
            updated = client.patch(
                path,
                headers=headers[0],
                json={"name": "Updated synthetic project", "status": "active"},
            )
            assert updated.status_code == 200 and updated.json()["status"] == "active"
            assert client.delete(path, headers=headers[0]).status_code == 204
            assert client.get(path, headers=headers[0]).status_code == 404
            assert client.get("/projects", headers=headers[0]).json() == []
            print(
                "Project HTTP smoke passed: registration/login, CRUD, ownership isolation, "
                "deletion, unauthenticated rejection"
            )
    finally:
        for email in emails:
            cleanup(email)
        print("Both temporary accounts and owned project data cleaned up")


if __name__ == "__main__":
    main()
