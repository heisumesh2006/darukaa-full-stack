"""Local API smoke test; random credentials stay in memory and test users are removed."""

import argparse
import re
import secrets
from uuid import uuid4

import httpx
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.db.session import get_engine
from app.models import User


def cleanup(email: str) -> None:
    if not re.fullmatch(r"auth-smoke-[0-9a-f]{32}@example\.com", email):
        raise ValueError("Cleanup is restricted to generated auth smoke-test identities")
    with Session(get_engine()) as session, session.begin():
        session.execute(delete(User).where(User.email == email))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cleanup-email")
    args = parser.parse_args()
    if args.cleanup_email:
        cleanup(args.cleanup_email)
        print("Temporary authentication account cleaned up")
        return

    email = f"auth-smoke-{uuid4().hex}@example.com"
    credentials = {"email": email, "password": secrets.token_urlsafe(24)}
    try:
        with httpx.Client(base_url="http://127.0.0.1:8000/api", timeout=15) as client:
            health = client.get("/health")
            assert health.status_code == 200
            assert health.json() == {"status": "ok", "service": "darukaa-earth-api"}
            registered = client.post("/auth/register", json=credentials)
            assert registered.status_code == 201, f"Registration HTTP {registered.status_code}"
            assert "password_hash" not in registered.text
            login = client.post("/auth/login", json=credentials)
            assert login.status_code == 200
            token = login.json()["access_token"]
            me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
            assert me.status_code == 200 and me.json()["email"] == email
            assert client.get("/auth/me").status_code == 401
            wrong = credentials | {"password": secrets.token_urlsafe(24)}
            assert client.post("/auth/login", json=wrong).status_code == 401
            print(
                "HTTP smoke passed: health 200, register 201, login 200, me 200, missing/wrong 401"
            )
    finally:
        cleanup(email)
        print("Temporary authentication account cleaned up")


if __name__ == "__main__":
    main()
