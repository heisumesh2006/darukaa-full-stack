from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4

import pytest

from app.analytics.summaries import summarize
from app.db.seed_site_metrics import seed_site_metrics
from app.models import SiteMetric

pytestmark = pytest.mark.integration


@pytest.fixture
def analytics_site(api_client, owned_projects):
    headers, project = owned_projects[0]
    geometry = {
        "type": "Polygon",
        "coordinates": [[[0, 0], [0.01, 0], [0.01, 0.01], [0, 0.01], [0, 0]]],
    }
    response = api_client.post(
        f"/api/projects/{project}/sites",
        headers=headers,
        json={"name": "Analytics fixture", "geometry": geometry},
    )
    assert response.status_code == 201
    return headers, project, response.json()["id"]


def test_empty_metrics_and_summary(api_client, analytics_site):
    headers, project, site = analytics_site
    path = f"/api/projects/{project}/sites/{site}"
    assert api_client.get(f"{path}/metrics", headers=headers).json() == []
    result = api_client.get(f"{path}/analytics", headers=headers)
    assert result.status_code == 200
    body = result.json()
    assert body["series"] == []
    for key in ("carbon", "biodiversity"):
        assert body[key]["latest"] is None and body[key]["average"] is None
        assert body[key]["observations"] == 0 and body[key]["trend"] == "insufficient_data"


def test_ordering_summary_nulls_and_zero(api_client, analytics_site, db_session):
    headers, project, site = analytics_site
    for day, carbon, bio in ((3, 6, None), (1, 0, 20), (2, None, 40)):
        db_session.add(
            SiteMetric(
                site_id=UUID(site),
                recorded_at=datetime(2025, 1, day, tzinfo=timezone.utc),
                carbon_value=carbon,
                biodiversity_value=bio,
            )
        )
    db_session.commit()
    path = f"/api/projects/{project}/sites/{site}"
    rows = api_client.get(f"{path}/metrics", headers=headers).json()
    assert [row["carbon_value"] for row in rows] == [0, None, 6]
    body = api_client.get(f"{path}/analytics", headers=headers).json()
    assert body["series"] == rows
    assert body["carbon"] == {
        "observations": 2,
        "latest": 6,
        "latest_at": "2025-01-03T00:00:00Z",
        "minimum": 0,
        "maximum": 6,
        "average": 3,
        "change": 6,
        "percentage_change": None,
        "trend": "increasing",
    }
    assert body["biodiversity"]["latest"] == 40
    assert body["biodiversity"]["average"] == 30
    assert body["biodiversity"]["percentage_change"] == 100
    assert "Synthetic" in body["data_policy"] and body["carbon_unit"] == "demo carbon units"


@pytest.mark.parametrize("endpoint", ["metrics", "analytics"])
def test_metrics_ownership_and_missing_sites(api_client, analytics_site, owned_projects, endpoint):
    headers, project, site = analytics_site
    other_headers, other_project = owned_projects[1]
    path = f"/api/projects/{project}/sites/{site}/{endpoint}"
    assert api_client.get(path).status_code == 401
    assert api_client.get(path, headers=other_headers).status_code == 404
    assert (
        api_client.get(
            f"/api/projects/{other_project}/sites/{site}/{endpoint}", headers=other_headers
        ).status_code
        == 404
    )
    assert (
        api_client.get(
            f"/api/projects/{project}/sites/{uuid4()}/{endpoint}", headers=headers
        ).status_code
        == 404
    )


@pytest.mark.parametrize(
    "values,trend,change",
    [([4], "insufficient_data", None), ([4, 4], "stable", 0), ([4, 2], "decreasing", -2)],
)
def test_summary_trend_rules(values, trend, change):
    result = summarize(
        [
            (datetime(2025, 1, index + 1, tzinfo=timezone.utc), Decimal(value))
            for index, value in enumerate(values)
        ]
    )
    assert result.trend == trend and result.change == change


def test_targeted_synthetic_seed_is_idempotent(api_client, analytics_site, db_session):
    headers, project, site = analytics_site
    assert seed_site_metrics(db_session, UUID(site)) == 6
    assert seed_site_metrics(db_session, UUID(site)) == 0
    db_session.commit()
    rows = api_client.get(f"/api/projects/{project}/sites/{site}/metrics", headers=headers).json()
    assert len(rows) == 6
    assert rows[0]["carbon_value"] == 14.75 and rows[-1]["carbon_value"] == 26
