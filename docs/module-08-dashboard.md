# Module 08 — Dashboard and visualization

The protected Dashboard is now a persisted-data portfolio view. It reuses MetricCard, TimeSeriesChart, the centralized Axios/auth system and project/site navigation. No business aggregations are duplicated in React. Dashboard and site analytics load chart code lazily; Mapbox retains its dynamic import.

## API and ownership

GET `/api/dashboard/summary` requires an active authenticated user. The route delegates to DashboardService and DashboardRepository. Every repository query filters through `Project.owner_id`; no owner identifier is accepted from clients. The response contains totals, coverage, latest observation date, bounded project/site overviews, monthly observations, and explicit synthetic units/provenance.

There are seven fixed SQL queries plus the existing current-user query, independent of project/site count. Integration tests verify eight SELECTs with 25 sites. Aggregation happens in PostgreSQL; relationships are not loaded in loops. No schema/model/index/migration changes were necessary.

## Calculation rules

- Project and site counts include only owned records, including projects with no sites.
- Area sums the database-generated geodesic hectares of owned sites. It is **not** a union of overlapping polygons; overlapping sites count their individual areas.
- Carbon total sums each site's latest non-null carbon observation. Old observations are not added again. If no sites have observations, the result is null rather than zero. A measured zero remains zero.
- Biodiversity averages each site's latest non-null score, with equal weight per site, not area-weighted. Separate coverage counts show how many sites contribute to each KPI.
- Latest observation date is the newest contributing observation across both fields. Sites may have different dates; this is not a synchronized snapshot.
- Monthly charts show arithmetic averages of non-null observations grouped by UTC calendar month, with counts of recorded rows. They include the most recent 12 months **with observations**, returned chronologically. They are observation-weighted histories, not cumulative totals or the KPI's latest-per-site calculation. Months without observations are omitted, never invented as zero. Null fields remain gaps.
- Project overview is limited to six recently updated projects; site overview to eight recently updated sites. Totals cover all owned data and are not limited to these lists.

The UI explains these differences, identifies all environmental values as synthetic demo data, and provides loading/error/retry states, true empty states, accessible tables and responsive charts. Links lead to Projects, individual projects, site boundaries/analytics and Map. No search/filtering, deployment, CI or submission features were added.

## Verification

Run `python -m pytest -q tests/integration/test_dashboard.py` from `backend`, or the full suite. Run `npm run test:dashboard` / `npm run test:e2e` with the local API, Vite, PostgreSQL and Google Chrome. The dashboard browser test registers a temporary account, verifies an empty dashboard, creates actual project/site data, explicitly seeds deterministic metrics, checks KPIs/charts/tables, navigates to site/project/map, tests recovery and logs out. The combined site test also covers drawing events → persisted area → analytics → dashboard → deletion/logout.

See [final validation](module-08-validation.md). Real Mapbox/Draw pointer interaction remains a manual check when a valid public token is available; the existing token-free adapters are explicitly test-only.
