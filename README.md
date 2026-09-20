# Darukaa.Earth

An environmental project management and geospatial analytics platform for administrators managing carbon and biodiversity projects. Built as a hiring-evaluation hackathon project.

## Current status

Modules 01–10 provide developer tooling, JWT authentication, owner-scoped project/site management, Mapbox polygon drawing, site analytics with Highcharts, a portfolio dashboard, project/site search and filtering, map discovery, and expanded automated regression checks. Modules 11–12, including deployment, remain future work. Analytics values are synthetic hackathon examples; the inactive demo user still has no login credentials. See [site management](docs/module-06-sites.md), [analytics and opt-in demo metrics](docs/module-07-analytics.md), [dashboard calculations](docs/module-08-dashboard.md), [search and navigation](docs/module-09-search-ux.md), and [testing](docs/module-10-testing.md).

## Stack and structure

React, Vite, TypeScript, React Router, Axios, Mapbox GL JS/Draw and Highcharts. Python/FastAPI, Pydantic Settings, SQLAlchemy 2, GeoAlchemy2 and Alembic; PostgreSQL 17 with PostGIS 3.5. ESLint, Prettier, Husky, lint-staged, Ruff and Pytest provide quality checks.

```text
darukaa-earth/
  frontend/src/       app, components, features, hooks, services, types, utils, styles
  backend/app/        api, core, db, models, schemas, services, repositories, analytics
  backend/alembic/    core schema migration and migration environment
  backend/tests/     health, database and authentication tests
  docs/              requirements, architecture, module plan, validation
  scripts/           portable backend hook runner
  .github/workflows/ reserved for Module 11
  .husky/            pre-commit hook
  docker-compose.yml
```

## Local prerequisites

- Node.js 24+ and npm (validated with Node 24.15.0).
- Python 3.10+ (validated with Python 3.14).
- Git, Docker Desktop running Linux containers, and Docker Compose v2.
- Free local ports 5173, 8000 and 5432. Database host port is configurable.

Run commands from this repository root unless a step explicitly changes directory. Commands below use PowerShell.

## Environment and installation

```powershell
Copy-Item .env.example .env
npm install
py -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements-dev.lock.txt
backend/.venv/Scripts/python.exe -m pip install --no-deps -e ./backend
```

For intentionally updating Python dependencies, use `backend/.venv/Scripts/python.exe -m pip install -e './backend[dev]'` then regenerate the lock with `pip freeze --exclude-editable`. The lock records the validated environment; platform markers are not retained by pip freeze, so re-resolve from pyproject.toml if a different platform requires it. On macOS/Linux use `python3` and `.venv/bin/` instead of `py` and `.venv/Scripts/`.

If `.env` already exists, preserve it instead of copying over it. This workstation is already configured with a generated password and host port **55432**, because Windows refused port 5432. The example below shows the default for a new setup; the URL port must match `POSTGRES_PORT`.

Edit the root `.env` with a locally generated password and a matching connection URL:

```dotenv
POSTGRES_USER=darukaa
POSTGRES_PASSWORD=<your-local-password>
POSTGRES_DB=darukaa_earth
POSTGRES_PORT=5432
DATABASE_URL=postgresql+psycopg://darukaa:<URL-encoded-password>@127.0.0.1:5432/darukaa_earth
VITE_API_BASE_URL=http://localhost:8000/api
VITE_MAPBOX_ACCESS_TOKEN=
CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173"]
JWT_SECRET_KEY=<generated-random-secret-at-least-32-characters>
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
```

`.env` is ignored by Git. Never commit credentials. Vite exposes `VITE_*` values to the browser: Mapbox must use a public browser token with appropriate URL restrictions, never a secret server token. Without a token the map shows a safe setup state. The old `VITE_MAPBOX_TOKEN` remains a compatibility fallback; prefer `VITE_MAPBOX_ACCESS_TOKEN`. Backend settings and Vite both read the root `.env`; restart servers after editing. CORS origins use a JSON array. JWT configuration is required for API startup; use a randomly generated signing secret, never a literal placeholder or VITE-prefixed secret. The developer environment is already configured. See [authentication setup and tradeoffs](docs/module-03-authentication.md) and [Mapbox configuration](docs/module-05-mapbox.md).

## PostgreSQL/PostGIS

```powershell
docker compose config --quiet
docker compose up -d
docker compose ps
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT PostGIS_Full_Version();"'
Push-Location backend
.venv/Scripts/alembic.exe upgrade head
.venv/Scripts/python.exe -m app.db.seed --demo
.venv/Scripts/python.exe -m app.db.verify
.venv/Scripts/alembic.exe heads
Pop-Location
```

The PostGIS image initializes the extension in a new database automatically; the migration also enables it for empty databases. Credentials are used on first initialization of the persistent volume; editing `.env` later does not change existing database credentials. `docker compose down` stops containers while preserving data. Module 02 adds users, projects, sites and site_metrics; the optional, idempotent demo seed supplies 1 user, 2 projects, 4 sites and 24 synthetic samples. The verification command checks connectivity, core tables and spatial geometry/indexes. See [database operations](docs/module-02-database.md) for migration, seed and integration-test details.

## Run the API

```powershell
cd backend
.venv/Scripts/python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000/docs`. `GET http://127.0.0.1:8000/api/health` returns `{"status":"ok","service":"darukaa-earth-api"}`. This is process liveness, not database readiness; use the database verification command separately.

## Run the frontend

In another terminal at the repository root:

```powershell
npm run dev
```

Open `http://127.0.0.1:5173/login` or `/register`. Registration signs you in; `/dashboard` summarizes your persisted portfolio and `/projects` manages your projects. Project details contain site lists/maps and links to draw/edit boundaries and view site analytics. `/map` provides an India-focused spatial workspace when a public token is configured. Refresh restores the current tab's session through `/api/auth/me`; Sign out clears it. The auth API exposes `POST /api/auth/register`, `POST /api/auth/login` and `GET /api/auth/me`. Passwords use Argon2id and access tokens expire after 30 minutes by default. See [project management](docs/module-04-projects.md) for ownership rules and permanent deletion behavior.

## Checks

```powershell
npm run lint
npm run build
npm run format:check
npm run test:auth # Requires API, frontend and installed Google Chrome
npm run test:projects # Project CRUD and recoverable UI errors
npm run test:map # Token-free map routing/lifecycle/error tests
npm run test:sites # Drawing adapter + real site API/PostGIS flow
npm run test:analytics # Synthetic seed, summaries and charts
npm run test:dashboard # Portfolio KPIs and navigation
npm run test:e2e # All browser tests
npm run test:discovery # Project/site filters and map navigation
npm run test:resilience # Loading, retry, session expiry and deletion recovery
npm run typecheck:tests # Type-check browser tests and application source
backend/.venv/Scripts/ruff.exe check backend
backend/.venv/Scripts/ruff.exe format --check backend
Push-Location backend
.venv/Scripts/python.exe -m pytest
Pop-Location
```

`npm run format` formats supported repository files. `npm install` configures Husky through the prepare script. On commit, lint-staged runs ESLint/Prettier on staged frontend files, Prettier on supported configuration/docs, and Ruff checks/formatting on staged Python files. The backend venv must exist. Full builds/tests stay outside the hook to keep it fast. GitHub Actions and deployment are deferred to Module 11. No remote, commit, push, or repository invitation is performed by Module 01.

## Architecture and delivery

The modular monolith separates presentation, API communication, routes, schemas, services, repositories and persistence. See [architecture](docs/architecture.md), [requirements](docs/requirements.md), [module plan](docs/module-plan.md), [Module 01 validation](docs/module-01-validation.md), [Module 02 validation](docs/module-02-validation.md), [Module 03 validation](docs/module-03-validation.md), [Module 04 validation](docs/module-04-validation.md), and [Module 05 validation](docs/module-05-validation.md).

Future analytics will use explicitly labeled synthetic hackathon data, never misrepresented as satellite or scientific observations. Final delivery will include a private GitHub repository, a public application URL, reviewer instructions and a Word submission document in Module 12.
