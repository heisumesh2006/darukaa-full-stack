"""Cross-module API invariants, using disposable PostGIS and rolled-back fixtures."""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID, uuid4

import pytest
from sqlalchemy import select

from app.db.seed_site_metrics import seed_site_metrics
from app.models import SiteMetric, User

pytestmark = pytest.mark.integration
POLYGON = {"type": "Polygon", "coordinates": [[[0, 0], [0.01, 0], [0.01, 0.01], [0, 0.01], [0, 0]]]}


@pytest.fixture
def site_record(api_client, owned_projects):
    headers, project = owned_projects[0]
    path = f"/api/projects/{project}/sites"
    response = api_client.post(
        path,
        headers=headers,
        json={"name": "Keep site", "description": "Keep description", "geometry": POLYGON},
    )
    assert response.status_code == 201
    return headers, project, response.json()


@pytest.mark.parametrize("state", ["inactive", "passwordless"])
def test_existing_tokens_lose_access_across_all_feature_routes(
    api_client, site_record, db_session, state
):
    headers, project, site = site_record
    user = db_session.scalar(select(User).where(User.email == "geo-owner@example.com"))
    if state == "inactive":
        user.is_active = False
    else:
        user.password_hash = None
    db_session.flush()
    project_path = f"/api/projects/{project}"
    site_path = f"{project_path}/sites/{site['id']}"
    for method, path, payload in [
        ("GET", "/api/auth/me", None),
        ("GET", "/api/projects", None),
        ("POST", "/api/projects", {"name": "Denied"}),
        ("PATCH", project_path, {"name": "Denied"}),
        ("DELETE", project_path, None),
        ("GET", f"{project_path}/sites", None),
        ("POST", f"{project_path}/sites", {"name": "Denied", "geometry": POLYGON}),
        ("GET", site_path, None),
        ("PATCH", site_path, {"name": "Denied"}),
        ("DELETE", site_path, None),
        ("GET", f"{site_path}/metrics", None),
        ("GET", f"{site_path}/analytics", None),
        ("GET", "/api/dashboard/summary", None),
    ]:
        response = api_client.request(method, path, headers=headers, json=payload)
        assert response.status_code == 401, (method, path)
        assert response.headers["www-authenticate"] == "Bearer"
        assert response.json() == {"detail": "Invalid or expired access token"}


def test_wrong_parent_is_rejected_even_for_same_owner(api_client, site_record):
    headers, project, site = site_record
    second = api_client.post(
        "/api/projects", headers=headers, json={"name": "Other owned project"}
    ).json()
    path = f"/api/projects/{second['id']}/sites/{site['id']}"
    for method, suffix, payload in [
        ("GET", "", None),
        ("PATCH", "", {"name": "Wrong"}),
        ("DELETE", "", None),
        ("GET", "/analytics", None),
        ("GET", "/metrics", None),
    ]:
        response = api_client.request(method, path + suffix, headers=headers, json=payload)
        assert response.status_code == 404
        assert response.json() == {"detail": "Site not found"}
    assert (
        api_client.get(f"/api/projects/{project}/sites/{site['id']}", headers=headers).json()
        == site
    )


def test_partial_project_and_site_updates_preserve_omitted_fields(
    api_client, site_record, db_session
):
    headers, project, site = site_record
    project_path = f"/api/projects/{project}"
    api_client.patch(
        project_path, headers=headers, json={"description": "Keep", "status": "archived"}
    )
    updated_project = api_client.patch(project_path, headers=headers, json={"name": "Renamed"})
    assert updated_project.status_code == 200
    assert updated_project.json()["description"] == "Keep"
    assert updated_project.json()["status"] == "archived"
    seed_site_metrics(db_session, UUID(site["id"]))
    db_session.flush()
    path = f"{project_path}/sites/{site['id']}"
    before_metrics = api_client.get(path + "/metrics", headers=headers).json()
    updated = api_client.patch(path, headers=headers, json={"name": "Renamed site"})
    assert updated.status_code == 200
    for field in ["id", "project_id", "geometry", "area_hectares", "description", "created_at"]:
        assert updated.json()[field] == site[field]
    assert api_client.get(path + "/metrics", headers=headers).json() == before_metrics


def test_site_delete_removes_only_its_metrics_and_refreshes_dashboard(
    api_client, site_record, db_session
):
    headers, project, site = site_record
    path = f"/api/projects/{project}/sites"
    other = api_client.post(
        path, headers=headers, json={"name": "Keep sibling", "geometry": POLYGON}
    ).json()
    for target in [site, other]:
        seed_site_metrics(db_session, UUID(target["id"]))
    db_session.flush()
    assert (
        api_client.get("/api/dashboard/summary", headers=headers).json()["latest_carbon_total"]
        == 52
    )
    assert api_client.delete(f"{path}/{site['id']}", headers=headers).status_code == 204
    assert api_client.delete(f"{path}/{site['id']}", headers=headers).status_code == 404
    assert (
        db_session.scalar(select(SiteMetric.id).where(SiteMetric.site_id == UUID(site["id"])))
        is None
    )
    assert len(api_client.get(f"{path}/{other['id']}/metrics", headers=headers).json()) == 6
    dashboard = api_client.get("/api/dashboard/summary", headers=headers).json()
    assert dashboard["total_sites"] == 1 and dashboard["latest_carbon_total"] == 26
    assert dashboard["sites"][0]["id"] == other["id"]


@pytest.mark.parametrize(
    "geometry",
    [
        {"type": "Polygon", "coordinates": [POLYGON["coordinates"][0]] * 21},
        {"type": "Polygon", "coordinates": [[[0, 0]] * 2001]},
        {
            "type": "Polygon",
            "coordinates": [[*POLYGON["coordinates"][0][:-1], *([[0, 0]] * 1996)]] * 6,
        },
        {"type": "Polygon", "coordinates": [[[False, 0], [0.01, 0], [0.01, 0.01], [False, 0]]]},
        {
            "type": "Polygon",
            "coordinates": [[[0, 0], [0.00000001, 0], [0.00000001, 0.00000001], [0, 0]]],
        },
    ],
)
def test_geometry_limits_fail_safely_and_allow_a_valid_retry(api_client, owned_projects, geometry):
    headers, project = owned_projects[0]
    path = f"/api/projects/{project}/sites"
    response = api_client.post(
        path, headers=headers, json={"name": "Invalid", "geometry": geometry}
    )
    assert response.status_code == 422
    assert "ST_" not in response.text and "INSERT" not in response.text
    assert api_client.get(path, headers=headers).json() == []
    assert (
        api_client.post(
            path, headers=headers, json={"name": "Valid retry", "geometry": POLYGON}
        ).status_code
        == 201
    )


def test_seed_preserves_existing_timestamp_and_missing_site_is_rejected(
    api_client, site_record, db_session
):
    headers, project, site = site_record
    original = SiteMetric(
        site_id=UUID(site["id"]),
        recorded_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
        carbon_value=Decimal("99.125"),
    )
    db_session.add(original)
    db_session.flush()
    assert seed_site_metrics(db_session, UUID(site["id"])) == 5
    assert seed_site_metrics(db_session, UUID(site["id"])) == 0
    with pytest.raises(ValueError, match="target site does not exist"):
        seed_site_metrics(db_session, uuid4())
    rows = api_client.get(
        f"/api/projects/{project}/sites/{site['id']}/metrics", headers=headers
    ).json()
    assert len(rows) == 6 and rows[0]["carbon_value"] == 99.125
    assert rows[0]["biodiversity_value"] is None


def test_analytics_single_field_observations_keep_other_summary_empty(
    api_client, site_record, db_session
):
    headers, project, site = site_record
    db_session.add(
        SiteMetric(
            site_id=UUID(site["id"]),
            recorded_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
            biodiversity_value=0,
        )
    )
    db_session.flush()
    body = api_client.get(
        f"/api/projects/{project}/sites/{site['id']}/analytics", headers=headers
    ).json()
    assert body["carbon"]["observations"] == 0 and body["carbon"]["latest"] is None
    assert body["biodiversity"]["latest"] == 0
    assert body["biodiversity"]["change"] is None
    assert body["biodiversity"]["trend"] == "insufficient_data"
    dashboard = api_client.get("/api/dashboard/summary", headers=headers).json()
    assert dashboard["latest_carbon_total"] is None and dashboard["carbon_sites"] == 0
    assert dashboard["latest_biodiversity_average"] == 0 and dashboard["biodiversity_sites"] == 1


def test_dashboard_months_use_utc_latest_twelve_and_retain_all_history_kpis(
    api_client, site_record, db_session
):
    headers, _, site = site_record
    for index in range(14):
        db_session.add(
            SiteMetric(
                site_id=UUID(site["id"]),
                recorded_at=datetime(2024 + index // 12, index % 12 + 1, 1, tzinfo=timezone.utc),
                carbon_value=index + 1,
            )
        )
    db_session.add(
        SiteMetric(
            site_id=UUID(site["id"]),
            recorded_at=datetime(2025, 2, 28, 23, tzinfo=timezone(timedelta(hours=-2))),
            carbon_value=100,
        )
    )
    db_session.flush()
    body = api_client.get("/api/dashboard/summary", headers=headers).json()
    months = body["monthly_observations"]
    assert len(months) == 12
    assert months[0]["recorded_at"] == "2024-04-01T00:00:00Z"
    assert months[-1]["recorded_at"] == "2025-03-01T00:00:00Z"
    assert [row["carbon_average"] for row in months] == [*range(4, 15), 100]
    assert all(row["biodiversity_average"] is None for row in months)
    assert body["latest_carbon_total"] == 100
    assert body["latest_observation_at"] == "2025-03-01T01:00:00Z"
