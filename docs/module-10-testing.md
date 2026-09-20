# Module 10 — Testing and code quality

The existing pytest/PostGIS and Playwright/Chrome suites are extended without adding dependencies, altering persistence models, or introducing CI/deployment configuration.

## Backend coverage

`tests/integration/test_regression_edges.py` verifies account deactivation and removed password credentials across protected feature routes, same-owner wrong-parent access, partial project/site updates preserving omitted fields and metrics, site deletion cascade isolation and refreshed dashboard totals, polygon ring/position/precision/type limits with successful retry, seed conflict preservation and missing-site rejection, null-versus-zero single-field analytics, and UTC monthly grouping with the latest 12 observed months. Security unit tests reject future-issued/future-valid tokens and unapproved signing algorithms.

The original auth, project, site, analytics, dashboard, database and migration tests remain. Integration fixtures create uniquely named disposable databases and roll back test transactions. Migration downgrade tests operate only on disposable databases; no application database reset occurs.

## Browser coverage

Module 09 discovery tests use the actual API/PostGIS to exercise combined filters, literal case-insensitive name/description matching, URL persistence, no results, mobile overflow, map selection and analytics navigation. Module 10 adds controlled delayed loading, recoverable API errors with filters preserved, project switching without stale site data, unavailable project handling, unauthorized-session cleanup, and failed deletion followed by explicit retry and cascade verification.

The reusable portfolio fixture uses random unique identities but deterministic business data; a `finally` block invokes the existing guarded project-smoke cleanup for all owned data. Existing Mapbox/Draw mocks are preserved. Delayed-response tests use explicit promises, and UI assertions wait for observable state; no arbitrary sleeps or automatic retries are used. The auth test targets the main navigation explicitly rather than racing duplicate dashboard links.

## Local validation

With the existing database, API on port 8000, Vite on port 5173, and Google Chrome available, run from the repository root:

```powershell
npm run lint
npm run format:check
npm run build
npm run typecheck:tests
npm run test:e2e
git diff --check
```

From `backend`:

```powershell
.venv/Scripts/ruff.exe check .
.venv/Scripts/ruff.exe format --check .
.venv/Scripts/python.exe -m pytest -q
.venv/Scripts/python.exe -m pip check
.venv/Scripts/alembic.exe check
.venv/Scripts/python.exe scripts/audit_security.py
```

Run the read-only audit after build/browser completion. It checks tracked and untracked reviewable source for configured private secrets and token/hash literals, browser assets for private secrets/JWTs/hashes, ignored environment files and blank example credentials, preserved schema/migration/security/dependency/deployment scope, the original inactive/passwordless demo user, and absence of temporary test accounts. It reports file paths rather than matching secret values. This targeted audit and `pip check` do not claim comprehensive vulnerability scanning.

See `module-10-validation.md` for actual final results. Real hosted Mapbox rendering/Draw gestures and provider licensing remain manual review concerns; environmental observations remain synthetic.
