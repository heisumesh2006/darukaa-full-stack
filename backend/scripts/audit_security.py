"""Read-only local source/build secret, scope and test-account audit.

Run after the production build and browser suite. Never prints matched secrets.
This is not a dependency vulnerability scanner or a penetration test.
"""

import re
import subprocess
from pathlib import Path

from dotenv import dotenv_values
from sqlalchemy import text

from app.core.config import get_settings
from app.db.session import get_engine

ROOT = Path(__file__).resolve().parents[2]


def git(*args: str) -> str:
    return subprocess.check_output(["git", *args], cwd=ROOT).decode().strip()


def main() -> None:
    environment = dotenv_values(ROOT / ".env")
    engine = get_engine()
    private = {
        value.encode()
        for value in (
            environment.get("JWT_SECRET_KEY"),
            environment.get("POSTGRES_PASSWORD"),
            get_settings().jwt_secret_key.get_secret_value(),
            engine.url.password,
        )
        if value
    }
    names = git("ls-files", "--cached", "--others", "--exclude-standard", "-z").split("\0")
    patterns = (
        rb"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{20,}",
        rb"\$argon2id\$v=\d+\$m=\d+[^\s\"']{30,}",
        rb"(?:pk|sk)\.[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{15,}",
    )
    problems = []
    for name in filter(None, names):
        path = ROOT / name
        if path.is_file():
            data = path.read_bytes()
            if any(value in data for value in private) or any(
                re.search(pattern, data) for pattern in patterns
            ):
                problems.append(name)
    assert not problems, f"Sensitive literals in files: {sorted(set(problems))}"
    assert ".env" not in names and git("check-ignore", ".env") == ".env"
    example = dotenv_values(ROOT / ".env.example")
    assert all(
        not example.get(key)
        for key in (
            "JWT_SECRET_KEY",
            "POSTGRES_PASSWORD",
            "DATABASE_URL",
            "VITE_MAPBOX_ACCESS_TOKEN",
        )
    ), "Example environment contains credentials"
    assert not any(
        key.startswith("VITE_") and re.search("JWT|SECRET|PASSWORD", key) for key in environment
    ), "Private environment variable exposed to Vite"
    build = ROOT / "frontend/dist"
    assert (build / "index.html").is_file(), "Run the production build before this audit"
    for path in build.rglob("*"):
        if path.is_file():
            data = path.read_bytes()
            assert not any(value in data for value in private), "Private secret in browser build"
            assert not any(re.search(pattern, data) for pattern in patterns[:2]), (
                "JWT or password hash in browser build"
            )
    protected = [
        "backend/alembic",
        "backend/app/models",
        "backend/app/db/seed.py",
        "backend/app/core/security.py",
        "frontend/src/features/auth/session.ts",
        "frontend/src/services/api.ts",
        ".github",
        "docker-compose.yml",
        "package-lock.json",
        "frontend/package.json",
        "backend/pyproject.toml",
        "backend/requirements.lock.txt",
        "backend/requirements-dev.lock.txt",
    ]
    assert not git("diff", "--name-only", "HEAD", "--", *protected), "Protected scope changed"
    assert not git("ls-files", "--others", "--exclude-standard", "--", *protected), (
        "Unexpected files in protected scope"
    )
    with engine.connect() as connection:
        demo = connection.execute(
            text(
                "SELECT is_active, password_hash IS NULL AS passwordless "
                "FROM users WHERE email = :email"
            ),
            {"email": "demo@darukaa.example"},
        ).one()
        assert not demo.is_active and demo.passwordless, "Original demo identity changed"
        remaining = connection.scalar(
            text(
                "SELECT count(*) FROM users WHERE email LIKE 'auth-smoke-%@example.com' "
                "OR email LIKE 'project-smoke-%@example.com'"
            )
        )
        assert remaining == 0, "Temporary test accounts remain"
    engine.dispose()
    print("Source/build secret audit passed; .env ignored; example credentials blank")
    print("Schema, migrations, security core, dependency files and deployment scope unchanged")
    print("Original demo inactive/passwordless; temporary test accounts remaining: 0")


if __name__ == "__main__":
    main()
