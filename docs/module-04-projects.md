# Module 04 — Project management

## Architecture and scope

React project pages and feature hooks → typed project API functions → the existing Axios client → authenticated FastAPI routes → Pydantic schemas → ProjectService → ProjectRepository → the existing PostgreSQL Project model.

The existing `projects` table already supports UUID ownership, name, description, lifecycle status, and timestamps. No model or migration changes were needed. Authentication remains the Module 03 implementation. Sites, maps, metrics, and analytics are not implemented by this module.

## HTTP contract

All endpoints require a valid Bearer token for an active user.

| Method | Path                         | Result                                    |
| ------ | ---------------------------- | ----------------------------------------- |
| GET    | `/api/projects`              | 200, array of the current user's projects |
| POST   | `/api/projects`              | 201, created project                      |
| GET    | `/api/projects/{project_id}` | 200, owned project                        |
| PATCH  | `/api/projects/{project_id}` | 200, updated project                      |
| DELETE | `/api/projects/{project_id}` | 204, empty response                       |

Create accepts `name`, optional `description`, and optional `status` (default `draft`). PATCH accepts only those editable fields; omitted fields stay unchanged, `description: null` clears the description, and explicit null name/status or an empty PATCH is rejected. Names are trimmed and must contain 1–200 characters; descriptions are trimmed and limited to 5,000 characters. Status is `draft`, `active`, or `archived`. Unknown fields, ownership changes, IDs, and timestamps in requests are rejected with 422. Duplicate names are allowed because UUIDs identify projects.

Responses explicitly expose only `id`, `owner_id`, `name`, `description`, `status`, `created_at`, and `updated_at`. UUID/timestamp defaults and timestamp updates retain the existing database behavior.

## Ownership and deletion

The server assigns ownership from `CurrentUser`; clients cannot choose an owner. Repository queries scope both project ID and owner ID. Missing and foreign-owned projects return the same 404 `Project not found` response. Lists only contain owned projects, ordered newest first with UUID as a deterministic tie-breaker. Listing is a single project query without loading sites or metrics; the MVP list is unpaginated. Pagination should be added before serving large portfolios.

Services own mutation transactions and roll back database failures; the existing error handler returns a safe 503 without exposing SQL. DELETE is permanent. The existing foreign keys cascade from project to sites to metric records; unrelated projects and the user remain intact. The UI explicitly explains the cascade and requires confirmation. No site-management API is introduced.

## Frontend

Protected routes: `/projects`, `/projects/new`, `/projects/:projectId`, `/projects/:projectId/edit`. The list has loading, empty, error/retry, cards, and create/edit/delete actions. Shared forms validate input, prevent duplicate submissions, preserve values on failure, and display inline feedback. A native modal dialog provides delete confirmation and blocks cancellation while a deletion is pending. Successful mutations update/navigate to fresh data. Detail pages provide project information and a clearly identified future sites area.

Requests use the existing auth-scoped Axios interceptor. Read requests are aborted on unmount and stale responses ignored. No second Axios client, authentication store, or model exists.

## Validation commands

From `backend` with Docker PostgreSQL available:

```powershell
.venv/Scripts/ruff.exe check .
.venv/Scripts/ruff.exe format --check .
.venv/Scripts/python.exe -m pytest -q
.venv/Scripts/python.exe -m pip check
.venv/Scripts/alembic.exe check
.venv/Scripts/python.exe scripts/project_smoke.py
.venv/Scripts/python.exe scripts/auth_smoke.py
```

From the repository root, with the API on 8000, Vite on 5173 and Google Chrome installed:

```powershell
npm run lint
npm run build
npm run format:check
npm run test:projects
npm run test:auth
npm run test:e2e
git diff --check
```

Integration tests run against disposable, migrated PostgreSQL/PostGIS databases using the existing fixtures. HTTP/browser tests generate random credentials in memory and remove temporary accounts and projects afterward. `scripts/project_smoke.py --cleanup-email` accepts only the narrowly defined generated `project-smoke-<32 hex characters>@example.com` identities and deletes that identity's owned data before its user. It never changes the inactive Module 02 demo user. All project test content is synthetic hackathon data.
