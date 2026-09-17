# Module 02 validation

Validated on 2026-09-17 against the existing local Docker PostgreSQL/PostGIS service. Module 01 commit `0de21e4` and its Git history were preserved. The working tree was clean before implementation. No files were staged, committed or pushed during Module 02.

## Delivered scope

- SQLAlchemy 2.x models: User, Project, Site and SiteMetric; shared server UUID/audit columns; model-package exports.
- Alembic revision **0001_core_schema**, including PostGIS enablement, constraints, indexes, generated area and timestamp triggers; reversible application schema.
- Explicit, deterministic synthetic seed and expanded database verification CLI.
- Real PostgreSQL integration tests using disposable databases, with migration and extension-search-path regression coverage.
- Database design/operations documentation plus targeted README and architecture updates.

No authentication, project/site APIs, maps, analytics services, frontend screens or deployment were added. Existing dependency versions, Docker image, `.env` connection/port and frontend code are unchanged.

## Executed checks

Commands without an explicit root directory below were run from `backend` using its existing virtual environment.

| Command/check                                              | Result                                                                                                          |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `.venv/Scripts/ruff.exe check .`                           | All checks passed!                                                                                              |
| `.venv/Scripts/ruff.exe format --check .`                  | 29 files already formatted                                                                                      |
| `.venv/Scripts/python.exe -m pytest -q`                    | **31 passed, 2 warnings in 7.71s**; no skipped integration tests                                                |
| `.venv/Scripts/python.exe -m pip check`                    | No broken requirements found                                                                                    |
| `.venv/Scripts/alembic.exe upgrade head`                   | Applied 0001_core_schema successfully to development database                                                   |
| `.venv/Scripts/alembic.exe current`                        | 0001_core_schema (head)                                                                                         |
| `.venv/Scripts/alembic.exe heads`                          | 0001_core_schema (head)                                                                                         |
| `.venv/Scripts/alembic.exe check`                          | No new upgrade operations detected, after fixing extension search-path reflection                               |
| Empty-database upgrade → populated downgrade → upgrade     | Passed against disposable database created from template0                                                       |
| Extended PostGIS search-path regression                    | Tiger tables preserved and ignored as non-application schema; deliberate unexpected public table still detected |
| `.venv/Scripts/python.exe -m app.db.seed --demo`           | First run: 1 user, 2 projects, 4 sites, 24 metrics inserted                                                     |
| Same seed command again                                    | All inserted counts zero; idempotent                                                                            |
| `.venv/Scripts/python.exe -m app.db.verify`                | Connectivity, PostGIS, table counts, Polygon/4326, GiST and positive valid sites verified                       |
| `docker compose config --quiet` (root)                     | Passed without displaying credentials                                                                           |
| `docker compose ps` (root)                                 | darukaa-earth-db-1 healthy at 127.0.0.1:55432 → 5432                                                            |
| Docker psql schema/index/FK inspection                     | Four core tables, ten application indexes, correct FK rules and geometry metadata confirmed                     |
| Remaining `darukaa_test_%` databases                       | 0; test databases cleaned up                                                                                    |
| `npm run lint` (root)                                      | Exit 0, no ESLint errors/warnings                                                                               |
| `npm run build` (root)                                     | Exit 0; 44 modules transformed; Vite build in 1.93s                                                             |
| `npm run format:check` (root)                              | All matched files use Prettier code style                                                                       |
| `GET /api/health`                                          | HTTP 200, unchanged expected JSON                                                                               |
| `git status`, `git diff --stat`, `git diff --check` (root) | Only Module 02 source/documentation changes; no whitespace errors or staging                                    |

Build output: HTML 0.45 kB (gzip 0.29), CSS 3.64 kB (gzip 1.43), JavaScript 317.97 kB (gzip 101.45). No frontend implementation changes were necessary.

## Database evidence

PostgreSQL **17.5**, PostGIS **3.5.2**. `geometry_columns` reports `sites / POLYGON / 4326`. `pg_indexes` reports `idx_sites_geometry USING gist (geometry)` alongside owner/project lookup indexes, unique normalized email and per-site timestamp uniqueness. Foreign keys use RESTRICT for user ownership and CASCADE for project→site→metric descendants.

Seeded areas computed by PostgreSQL from geography:

| Synthetic site |   Hectares |
| -------------- | ---------: |
| Canopy plot A  | 116.884023 |
| Canopy plot B  | 233.768048 |
| Wetland plot A | 116.059259 |
| Wetland plot B | 261.129349 |

The independent equatorial-square test accepts 120–125 ha, verifies positive generated area, and checks that doubling its width approximately doubles area. It also performs real spatial intersection/containment and GeoJSON serialization.

## Test coverage

The suite comprises 28 integration cases plus the original 3 health/CORS cases. It checks:

- Schema, geometry typmod, indexes, FK definitions and server UUID defaults, including a raw SQL insert.
- ORM relationships, UTC-aware audit values, and timestamp updates through ORM and raw SQL.
- Email uniqueness/normalization, lifecycle status, nonnegative finite carbon, biodiversity bounds and nonempty samples.
- Valid SRID 4326 polygon insertion; self-intersection, empty polygons, invalid coordinate bounds, wrong SRID and wrong geometry-type rejection.
- Geography-derived area, generated-area changes, ST_Intersects, ST_Within and ST_AsGeoJSON.
- Chronological metric retrieval and duplicate site/timestamp rejection.
- Missing-parent failures, restricted user deletion and descendant-only database cascades.
- Seed idempotence, preservation of reviewer edits, an inactive passwordless demo identity and fixture row counts.
- Empty-database extension creation, upgrade, populated downgrade and re-upgrade; no application-model drift.
- Extension-aware schema discovery that still detects unexpected public schema changes.

## Failures diagnosed and resolved

Initial formatting/import-order findings were corrected using Ruff without changing its rules. The subsequent lint and format checks passed.

The existing Docker image's search path is `"$user", public, topology, tiger`. The first development `alembic check` reflected Tiger extension tables and proposed their removal, although the schema itself migrated correctly. The Alembic environment now sets search_path to public within its migration transaction. A real Tiger-extension regression test confirms the fix and checks that genuine unexpected public tables still cause drift failure. No extension tables were removed or application checks disabled.

Docker access initially encountered the Windows sandbox's named-pipe restriction; checks were rerun with permission. Existing sandbox filesystem/subprocess limitations were handled with permission for Python tooling and frontend build commands.

## Warnings and review notes

Two existing upstream test-client deprecation warnings remain: Starlette recommends httpx2, and its TestClient uses the deprecated AnyIO BlockingPortal alias. These are unchanged from Module 01 and are not suppressed. All tests pass.

Tests require a local role allowed to create temporary databases and enable extensions. They never downgrade or reset the application database. An abrupt process termination can bypass fixture cleanup; normal execution left no test databases. The explicitly documented PostgreSQL 17/PostGIS 3.5 Docker environment is the validated target.

Review the intentional ownership/deletion rules, generated-area strategy, one-sample-per-site/time policy, and demo-only metric units before committing. Full details and commands are in [database design](module-02-database.md). The demo account is inactive with NULL password_hash, so there is no demo password to share. Downgrade is destructive to application tables and deliberately retains PostGIS; it was tested only in disposable databases.

Suggested commit: `feat: add core PostGIS schema migrations and synthetic seed`

**Module 03 and later functionality is not implemented. No Git commit or push was performed.**
