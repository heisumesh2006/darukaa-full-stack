# Module 07 — Environmental analytics

GET `/api/projects/{project_id}/sites/{site_id}/metrics` returns observations chronologically. GET the same prefix with `/analytics` returns the series plus independent carbon/biodiversity summaries. Both reuse SiteService's project ownership and parent/site checks before querying metrics. Missing/foreign resources return 404; missing authentication returns 401. Routes delegate to AnalyticsService, MetricRepository and deterministic summary functions. The existing SiteMetric model and migration are unchanged.

Only the existing `carbon_value` and `biodiversity_value` fields are exposed. Carbon is **demo carbon units**, not verified sequestration tonnes or carbon credits. Biodiversity is a synthetic application score from 0–100. No vegetation/forest-cover column exists, so none was invented. Responses/UI explicitly identify synthetic hackathon data. Real scientific ingestion requires provenance/unit design outside this module.

## Summary semantics

For each field, independently exclude null observations, retaining numeric zero. The latest value and timestamp mean the latest non-null observation for that field. Min/max/arithmetic mean cover non-null observations. Change is last minus first, provided there are at least two observations. Percentage change is `100 * change / first`; it is null for a zero baseline or fewer than two observations. Trend is increasing/decreasing/stable according to absolute change, or insufficient_data when fewer than two observations exist. Empty summaries contain count zero and null numeric values. Calculations use database Decimal values before JSON number conversion; dates are timezone-aware and ordered ascending. An all-history response is appropriate for this small demo; pagination/downsampling is a future scale concern.

## Frontend

Site detail composes reusable MetricCard and Highcharts TimeSeriesChart components. It obtains summaries from the API instead of recalculating business statistics. Accessible charts include the Highcharts accessibility module and expandable HTML tables. Dates use UTC; nulls leave chart gaps and display "No data", not zero. Loading/error/retry/empty states are explicit. Area stays visible independently of missing analytics.

## Explicit synthetic seed

The original inactive/passwordless Module 02 demo user is unchanged. To review analytics on a site created through your own account, copy its UUID from its URL and run from `backend`:

```powershell
.venv/Scripts/python.exe -m app.db.seed_site_metrics --demo --site-id <site-uuid>
```

This development-only database command inserts six fixed January–June 2025 samples with deterministic IDs and values consistent with the existing demo strategy. It is idempotent, never overwrites observations, requires an existing site and explicit opt-in, and never creates or activates accounts. It is not an HTTP write endpoint. All seeded values are synthetic; no random runtime data is generated.

## Verification

Run the full backend suite or `python -m pytest -q tests/integration/test_analytics.py` from `backend`. Run `npm run test:analytics` with the API, Vite, PostgreSQL and Chrome running. It verifies no-data state, explicit seeding, summary/chart/table rendering and retry after an API failure. Generated accounts/projects/sites/metrics are cleaned up. See [validation](module-07-validation.md).
