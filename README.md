# Darukaa.Earth

An environmental project management and geospatial analytics platform for administrators managing carbon and biodiversity projects. Built as a hiring-evaluation hackathon project.

## Current status

Module 01 provides developer tooling, a responsive application shell with placeholder Dashboard, Projects and Map routes, a FastAPI health endpoint, and a PostgreSQL/PostGIS connection foundation. Authentication, project/site management, maps, analytics and deployment are **planned, not implemented**. No environmental measurements or demo credentials exist yet.

## Stack and structure

React, Vite, TypeScript, React Router and Axios; Mapbox GL JS/Draw and Highcharts installed for later modules. Python/FastAPI, Pydantic Settings, SQLAlchemy 2, GeoAlchemy2 and Alembic; PostgreSQL 17 with PostGIS 3.5. ESLint, Prettier, Husky, lint-staged, Ruff and Pytest provide quality checks.

```text
darukaa-earth/
  frontend/src/       app, components, features, hooks, services, types, utils, styles
  backend/app/        api, core, db, models, schemas, services, repositories, analytics
  backend/alembic/    migration environment (no business migrations yet)
  backend/tests/     health contract and CORS tests
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
VITE_MAPBOX_TOKEN=
CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173"]
```

`.env` is ignored by Git. Never commit credentials. Vite exposes `VITE_*` values to the browser: the later Mapbox integration must use a public, URL-restricted Mapbox token, never a secret token. Leave it empty for Module 01. Backend settings and Vite both read the root `.env`; restart servers after editing. CORS origins use a JSON array. JWT secrets will be introduced in Module 03.

## PostgreSQL/PostGIS

```powershell
docker compose config --quiet
docker compose up -d
docker compose ps
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT PostGIS_Full_Version();"'
Push-Location backend
.venv/Scripts/python.exe -m app.db.verify
.venv/Scripts/alembic.exe heads
Pop-Location
```

The PostGIS image initializes the extension in a new database automatically. Credentials are used on first initialization of the persistent volume; editing `.env` later does not change existing database credentials. `docker compose down` stops containers while preserving data. No business tables or migrations are created in this module. The spatial verification command executes a real GeoAlchemy2 query without persisting feature data.

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

Open `http://127.0.0.1:5173`. Dashboard, Projects and Map explorer are intentionally labeled placeholders. Unknown paths render a 404 page. No login, map tiles, or environmental data are loaded.

## Checks

```powershell
npm run lint
npm run build
npm run format:check
backend/.venv/Scripts/ruff.exe check backend
backend/.venv/Scripts/ruff.exe format --check backend
Push-Location backend
.venv/Scripts/python.exe -m pytest
Pop-Location
```

`npm run format` formats supported repository files. `npm install` configures Husky through the prepare script. On commit, lint-staged runs ESLint/Prettier on staged frontend files, Prettier on supported configuration/docs, and Ruff checks/formatting on staged Python files. The backend venv must exist. Full builds/tests stay outside the hook to keep it fast. GitHub Actions and deployment are deferred to Module 11. No remote, commit, push, or repository invitation is performed by Module 01.

## Architecture and delivery

The modular monolith separates presentation, API communication, routes, schemas, services, repositories and persistence. See [architecture](docs/architecture.md), [requirements](docs/requirements.md), [module plan](docs/module-plan.md), and [validation record](docs/module-01-validation.md).

Future analytics will use explicitly labeled synthetic hackathon data, never misrepresented as satellite or scientific observations. Final delivery will include a private GitHub repository, a public application URL, reviewer instructions and a Word submission document in Module 12.
