# Module 01 validation

Validated on 2026-09-17 on Windows. Only foundation functionality is implemented. No commit, remote, push, invitation or deployment was created.

## Environment inspected

The parent workspace was empty; no AGENTS.md was found in it or its immediate parent. Node 24.15.0, npm 11.12.1, Python 3.14.0 (Python 3.10 also installed), Git 2.54.0.windows.1, Docker 24.0.6, Compose v2.23.0-desktop.1. Docker Desktop was started after the initial daemon-unavailable error.

## Commands executed and results

Commands below were executed from the repository root, except backend commands shown after `cd backend`. Some commands required permission to access Docker's pipe, spawn processes or write Python temporary files; these were rerun successfully with permission.

| Command/check                                                                                                                                                                                    | Final result                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `git init darukaa-earth` (from parent)                                                                                                                                                           | Empty Git repository initialized                                                                    |
| `npm install`                                                                                                                                                                                    | Workspace dependencies installed, Husky prepare executed                                            |
| `npm install -D eslint@^10 @eslint/js@^10 --workspace frontend`                                                                                                                                  | Updated from deprecated ESLint 9; 0 vulnerabilities reported                                        |
| `py -m venv backend/.venv`                                                                                                                                                                       | Virtual environment created after retry with filesystem permission                                  |
| `backend/.venv/Scripts/python.exe -m pip install -e './backend[dev]'`                                                                                                                            | All backend and development dependencies installed                                                  |
| `npm run lint`                                                                                                                                                                                   | Exit 0; ESLint with `--max-warnings 0`, no errors or warnings                                       |
| `npm run build`                                                                                                                                                                                  | Exit 0; TypeScript and Vite 7.3.6 passed; 44 modules transformed; build in 2.63s                    |
| `npm run format`                                                                                                                                                                                 | Passed after resolving sandbox directory-access errors                                              |
| `npm run format:check`                                                                                                                                                                           | All matched files use Prettier code style                                                           |
| `cd backend; .venv/Scripts/ruff.exe check .`                                                                                                                                                     | All checks passed!                                                                                  |
| `.venv/Scripts/ruff.exe format --check .`                                                                                                                                                        | 19 files already formatted                                                                          |
| `.venv/Scripts/python.exe -m pytest`                                                                                                                                                             | 3 passed, 2 warnings in 0.86s                                                                       |
| `.venv/Scripts/python.exe -m pip check`                                                                                                                                                          | No broken requirements found                                                                        |
| `.venv/Scripts/python.exe -m pip freeze --exclude-editable`                                                                                                                                      | Recorded exact installed Python versions in requirements-dev.lock.txt                               |
| `docker compose config --quiet`                                                                                                                                                                  | Exit 0; uses quiet mode to avoid printing resolved credentials                                      |
| `docker compose up -d`                                                                                                                                                                           | Passed after local port changed to 55432                                                            |
| `docker compose ps`                                                                                                                                                                              | darukaa-earth-db-1 healthy; 127.0.0.1:55432->5432                                                   |
| `docker compose exec -T db psql -U darukaa -d darukaa_earth -c 'SELECT version(); SELECT extname, extversion FROM pg_extension; SELECT tablename FROM pg_tables WHERE schemaname = ''public'';'` | PostgreSQL 17.5, PostGIS 3.5.2; only spatial_ref_sys in public; no business tables                  |
| `.venv/Scripts/python.exe -m app.db.verify` (backend)                                                                                                                                            | SELECT 1 returned 1; PostGIS_Full_Version returned 3.5.2; GeoAlchemy2 geometry valid with SRID 4326 |
| `.venv/Scripts/alembic.exe heads` and `current` (backend)                                                                                                                                        | Exit 0, no revisions, as expected                                                                   |
| `python -m uvicorn app.main:app --host 127.0.0.1 --port 8000` (backend venv)                                                                                                                     | API started                                                                                         |
| `npm run dev`                                                                                                                                                                                    | Vite started on 127.0.0.1:5173                                                                      |
| PowerShell `Invoke-WebRequest` to API and frontend                                                                                                                                               | Both HTTP 200; API body exactly as required                                                         |
| Headless Chrome route assertions                                                                                                                                                                 | `/`, `/projects`, `/map`, `/not-found` rendered correct headings and navigation                     |
| Headless Chrome screenshot                                                                                                                                                                       | Desktop screenshot inspected; no layout issue observed                                              |
| `git add` selected verification files then `git hook run pre-commit`                                                                                                                             | ESLint, Prettier and Ruff tasks executed successfully                                               |
| Temporary staged Python probe with an undefined variable                                                                                                                                         | Hook correctly rejected F821 and exited 1                                                           |
| Remove probe, rerun hook, unstage verification files                                                                                                                                             | Hook passed; probe removed; index restored to empty                                                 |
| `git check-ignore`                                                                                                                                                                               | .env, venv, node_modules, build output and browser artifacts ignored                                |
| `git remote -v`, `git log -1`, `git config --get core.hooksPath`                                                                                                                                 | No remote; no commits; hooks path .husky/_                                                          |

Production artifacts: index.html 0.45 kB (gzip 0.29), CSS 3.64 kB (gzip 1.43), JS 317.97 kB (gzip 101.45). Future Mapbox and chart libraries are installed but not imported by the shell.

API response:

```json
{ "status": "ok", "service": "darukaa-earth-api" }
```

## Installed direct dependencies

Frontend: React/React DOM 19.3.0; React Router DOM 7.18.4; Axios 1.20.0; Mapbox GL 3.30.0; Mapbox GL Draw 1.5.2; Highcharts 12.6.0; highcharts-react-official 3.2.3.

Frontend tooling: Vite 7.3.6; React Vite plugin 5.2.0; TypeScript 5.9.3; ESLint 10.10.0; @eslint/js 10.0.1; typescript-eslint 8.70.0; react-hooks plugin 7.1.1; react-refresh plugin 0.4.26; globals 16.5.0; React, DOM, Node and Draw type packages. Root tooling: Husky 9.1.7; lint-staged 16.4.0; Prettier 3.9.7. Exact transitive versions are in package-lock.json.

Backend: FastAPI 0.141.1; Uvicorn 0.53.0; Pydantic Settings 2.15.0 (Pydantic 2.13.5); SQLAlchemy 2.0.54; Alembic 1.20.0; GeoAlchemy2 0.20.0; psycopg and psycopg-binary 3.3.5. Development: Pytest 9.1.1; HTTPX 0.28.1; Ruff 0.16.8. Full resolved versions are in requirements-dev.lock.txt.

## Resolved failures and warnings

- Python ensurepip and pytest cache access failed under sandbox restrictions. Installation and tests passed with required filesystem permission; the failed temporary cache directory was removed.
- Vite's esbuild subprocess was blocked by the sandbox; the build passed with process permission.
- Ruff found one import-order issue; it was fixed and checks rerun successfully.
- Port 5432 could not bind on Windows. The ignored local `.env` now uses 55432 consistently for Compose and DATABASE_URL. Other users may retain the example's 5432 if available.
- ESLint 9 installation emitted a support warning; it was replaced with supported ESLint 10 after checking plugin compatibility.
- Pytest retains two upstream deprecation warnings: Starlette recommends httpx2 for its TestClient, and uses the deprecated anyio.abc.BlockingPortal alias. No warning filters suppress them; all three tests pass.
- lint-staged warns it cannot create a backup before the first commit. This is expected for the required uncommitted repository; the staged-file hook was still verified successfully.
- The in-app browser was unavailable. Installed Chrome was used headlessly to validate actual React rendering; temporary browser artifacts stay in ignored `.verification`.

## Handoff

The API, frontend dev server and database were left running for review at http://127.0.0.1:8000/docs and http://127.0.0.1:5173. Generated database credentials are stored only in ignored `.env`. Mapbox credentials are not needed until Module 05. No Module 01 setup remains; review and commit manually when ready. Stop before Module 02.

Suggested commit: `chore: establish Darukaa.Earth module 01 foundation`
