import secrets
from datetime import datetime, timezone
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from geoalchemy2 import WKTElement
from sqlalchemy import select

from app.api.dependencies import get_db
from app.main import create_app
from app.models import Project, Site, SiteMetric, User

pytestmark = pytest.mark.integration


@pytest.fixture
def client(db_session):
    app = create_app()
    app.dependency_overrides[get_db] = lambda: db_session
    with TestClient(app) as client:
        yield client


@pytest.fixture
def owners(client):
    headers = []
    for email in ("owner@example.com", "other@example.com"):
        response = client.post(
            "/api/auth/register", json={"email": email, "password": secrets.token_urlsafe(24)}
        )
        assert response.status_code == 201
        headers.append({"Authorization": f"Bearer {response.json()['access_token']}"})
    return headers


def test_project_lifecycle_and_persistence(client, owners, db_session):
    auth = owners[0]
    assert client.get("/api/projects", headers=auth).json() == []
    response = client.post(
        "/api/projects",
        headers=auth,
        json={"name": "  Restoration  ", "description": "  Synthetic project  "},
    )
    assert response.status_code == 201
    project = response.json()
    assert set(project) == {
        "id",
        "owner_id",
        "name",
        "description",
        "status",
        "created_at",
        "updated_at",
    }
    assert project["name"] == "Restoration" and project["description"] == "Synthetic project"
    assert project["status"] == "draft"
    saved = db_session.get(Project, UUID(project["id"]))
    assert str(saved.owner_id) == project["owner_id"]
    assert saved.name == "Restoration"
    path = f"/api/projects/{project['id']}"
    assert client.get(path, headers=auth).json() == project
    assert client.get("/api/projects", headers=auth).json() == [project]
    updated = client.patch(
        path, headers=auth, json={"name": "  Updated  ", "description": None, "status": "active"}
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Updated"
    assert updated.json()["description"] is None
    assert updated.json()["status"] == "active"
    assert updated.json()["created_at"] == project["created_at"]
    assert updated.json()["updated_at"] >= project["updated_at"]
    db_session.expire_all()
    assert db_session.get(Project, UUID(project["id"])).name == "Updated"
    deleted = client.delete(path, headers=auth)
    assert deleted.status_code == 204 and deleted.content == b""
    assert client.get(path, headers=auth).status_code == 404
    assert client.get("/api/projects", headers=auth).json() == []
    assert client.delete(path, headers=auth).status_code == 404


def test_owner_isolation_and_non_disclosure(client, owners):
    created = client.post("/api/projects", headers=owners[0], json={"name": "Private"}).json()
    path = f"/api/projects/{created['id']}"
    assert client.get("/api/projects", headers=owners[1]).json() == []
    for method, body in (("get", None), ("patch", {"name": "Stolen"}), ("delete", None)):
        for target in (path, f"/api/projects/{uuid4()}"):
            response = client.request(method, target, headers=owners[1], json=body)
            assert response.status_code == 404
            assert response.json() == {"detail": "Project not found"}
    assert client.get(path, headers=owners[0]).json()["name"] == "Private"


@pytest.mark.parametrize(
    "method,path,body",
    [
        ("get", "", None),
        ("post", "", {"name": "No access"}),
        ("get", "/00000000-0000-0000-0000-000000000001", None),
        ("patch", "/00000000-0000-0000-0000-000000000001", {"name": "No access"}),
        ("delete", "/00000000-0000-0000-0000-000000000001", None),
    ],
)
def test_all_project_routes_require_authentication(client, method, path, body):
    assert client.request(method, f"/api/projects{path}", json=body).status_code == 401


@pytest.mark.parametrize(
    "body",
    [
        {},
        {"name": "   "},
        {"name": "x" * 201},
        {"name": "Valid", "description": "x" * 5001},
        {"name": "Valid", "owner_id": str(uuid4())},
        {"name": "Valid", "created_at": "2026-01-01"},
        {"name": "Valid", "status": "unknown"},
        {"name": None},
    ],
)
def test_create_validation(client, owners, body):
    assert client.post("/api/projects", headers=owners[0], json=body).status_code == 422
    assert client.get("/api/projects", headers=owners[0]).json() == []


@pytest.mark.parametrize(
    "body",
    [
        {},
        {"name": None},
        {"status": None},
        {"name": " "},
        {"id": str(uuid4())},
        {"owner_id": str(uuid4())},
        {"updated_at": "2026-01-01"},
        {"status": "unknown"},
    ],
)
def test_update_validation(client, owners, body):
    project = client.post("/api/projects", headers=owners[0], json={"name": "Original"}).json()
    path = f"/api/projects/{project['id']}"
    assert client.patch(path, headers=owners[0], json=body).status_code == 422
    assert client.get(path, headers=owners[0]).json()["name"] == "Original"


def test_inactive_user_blocked_and_invalid_id_rejected(client, owners, db_session):
    assert client.get("/api/projects/not-a-uuid", headers=owners[0]).status_code == 422
    user = db_session.scalar(select(User).where(User.email == "owner@example.com"))
    user.is_active = False
    db_session.commit()
    assert client.get("/api/projects", headers=owners[0]).status_code == 401


def test_duplicate_names_allowed_and_listing_is_deterministic(client, owners):
    ids = []
    for _ in range(2):
        response = client.post("/api/projects", headers=owners[0], json={"name": "Restoration"})
        assert response.status_code == 201
        ids.append(response.json()["id"])
    listing = client.get("/api/projects", headers=owners[0]).json()
    assert {row["id"] for row in listing} == set(ids)
    assert listing == sorted(listing, key=lambda row: (row["created_at"], row["id"]), reverse=True)


def test_api_delete_cascades_descendants_but_preserves_other_projects(client, owners, db_session):
    project = client.post("/api/projects", headers=owners[0], json={"name": "Parent"}).json()
    unrelated = client.post("/api/projects", headers=owners[0], json={"name": "Keep"}).json()
    # Existing persistence models only: there is no site/metric API in this module.
    site = Site(
        project_id=UUID(project["id"]),
        name="Synthetic fixture",
        geometry=WKTElement("POLYGON((0 0,0.01 0,0.01 0.01,0 0.01,0 0))", srid=4326),
    )
    metric = SiteMetric(
        site=site, recorded_at=datetime(2025, 1, 1, tzinfo=timezone.utc), carbon_value=1
    )
    db_session.add(metric)
    db_session.commit()
    site_id, metric_id = site.id, metric.id
    assert client.delete(f"/api/projects/{project['id']}", headers=owners[0]).status_code == 204
    assert db_session.scalar(select(Site.id).where(Site.id == site_id)) is None
    assert db_session.scalar(select(SiteMetric.id).where(SiteMetric.id == metric_id)) is None
    assert client.get(f"/api/projects/{unrelated['id']}", headers=owners[0]).status_code == 200
