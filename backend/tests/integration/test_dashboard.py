from datetime import datetime, timezone
from uuid import UUID

import pytest
from geoalchemy2 import WKTElement
from sqlalchemy import event

from app.models import Site, SiteMetric

pytestmark = pytest.mark.integration


def test_dashboard_auth_and_empty_account(api_client, owned_projects):
    assert api_client.get("/api/dashboard/summary").status_code == 401
    headers, _ = owned_projects[0]
    body = api_client.get("/api/dashboard/summary", headers=headers).json()
    assert body["total_projects"] == 1
    assert body["total_sites"] == 0 and body["total_area_hectares"] == 0
    assert body["latest_carbon_total"] is None and body["latest_biodiversity_average"] is None
    assert body["carbon_sites"] == 0 and body["latest_observation_at"] is None
    assert body["monthly_observations"] == [] and body["sites"] == []


def test_dashboard_aggregates_latest_per_field_and_excludes_other_owner(
    api_client, owned_projects, db_session
):
    headers, project = owned_projects[0]
    other_headers, other_project = owned_projects[1]
    sites = []
    for owner_project in (project, project, project, other_project):
        site = Site(
            project_id=UUID(owner_project),
            name="Synthetic site",
            geometry=WKTElement("POLYGON((0 0,0.01 0,0.01 0.01,0 0.01,0 0))", srid=4326),
        )
        db_session.add(site)
        db_session.flush()
        sites.append(site)
    for site, month, carbon, biodiversity in (
        (sites[0], 1, 100, 20),
        (sites[0], 2, 10, None),
        (sites[1], 1, 0, 40),
        (sites[1], 2, None, 60),
        (sites[3], 2, 9000, 99),
    ):
        db_session.add(
            SiteMetric(
                site=site,
                recorded_at=datetime(2025, month, 1, tzinfo=timezone.utc),
                carbon_value=carbon,
                biodiversity_value=biodiversity,
            )
        )
    db_session.commit()
    response = api_client.get("/api/dashboard/summary", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["total_projects"] == 1 and body["total_sites"] == 3
    assert 360 < body["total_area_hectares"] < 375
    assert body["latest_carbon_total"] == 10  # latest 10 + latest zero, not 100+10+0
    assert body["latest_biodiversity_average"] == 40  # latest 20 and 60
    assert body["carbon_sites"] == 2 and body["biodiversity_sites"] == 2
    assert body["projects"][0]["site_count"] == 3
    assert {row["id"] for row in body["sites"]} == {str(site.id) for site in sites[:3]}
    assert [row["carbon_average"] for row in body["monthly_observations"]] == [50, 10]
    assert [row["biodiversity_average"] for row in body["monthly_observations"]] == [30, 60]
    assert [row["observations"] for row in body["monthly_observations"]] == [2, 2]
    other = api_client.get("/api/dashboard/summary", headers=other_headers).json()
    assert other["total_sites"] == 1 and other["latest_carbon_total"] == 9000


def test_dashboard_query_count_and_overview_limits(api_client, owned_projects, db_session):
    headers, project = owned_projects[0]
    for number in range(25):
        db_session.add(
            Site(
                project_id=UUID(project),
                name=f"Synthetic site {number}",
                geometry=WKTElement("POLYGON((0 0,0.01 0,0.01 0.01,0 0.01,0 0))", srid=4326),
            )
        )
    db_session.commit()
    queries = []

    def record(_connection, _cursor, statement, _parameters, _context, _many):
        if statement.lstrip().upper().startswith("SELECT"):
            queries.append(statement)

    connection = db_session.get_bind()
    event.listen(connection, "before_cursor_execute", record)
    try:
        response = api_client.get("/api/dashboard/summary", headers=headers)
    finally:
        event.remove(connection, "before_cursor_execute", record)
    assert response.status_code == 200
    assert response.json()["total_sites"] == 25 and len(response.json()["sites"]) == 8
    assert len(queries) == 8  # one current-user query + seven fixed summary queries


def test_brand_new_dashboard_has_zero_counts(api_client):
    import secrets

    registered = api_client.post(
        "/api/auth/register",
        json={"email": "new-dashboard@example.com", "password": secrets.token_urlsafe(24)},
    )
    assert registered.status_code == 201
    response = api_client.get(
        "/api/dashboard/summary",
        headers={"Authorization": f"Bearer {registered.json()['access_token']}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total_projects"] == 0 and body["total_sites"] == 0
    assert body["projects"] == [] and body["sites"] == []
