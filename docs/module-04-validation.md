# Module 04 validation

Validated against the existing local PostgreSQL/PostGIS service on host port 55432, API on 8000, and Vite on 5173. This gate was completed before Module 05 implementation began.

| Check                             | Result                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------- |
| `ruff check .`                    | All checks passed                                                               |
| `ruff format --check .`           | 45 files already formatted                                                      |
| `python -m pytest -q`             | 86 passed (60 existing + 26 project cases)                                      |
| `python -m pip check`             | No broken requirements found                                                    |
| `alembic check`                   | No new upgrade operations detected                                              |
| `npm run lint`                    | Passed, zero warnings                                                           |
| `npm run build`                   | TypeScript + Vite passed; 120 modules transformed                               |
| `npm run format:check`            | All matched files use Prettier code style                                       |
| `python scripts/project_smoke.py` | Live CRUD + two-user isolation passed; both accounts/data removed               |
| `python scripts/auth_smoke.py`    | Health, register, login, me and authentication failures passed; account removed |
| `npm run test:e2e`                | 5 passed in Chrome (3 authentication + 2 project tests)                         |
| `git diff --check`                | Passed                                                                          |

Project tests cover ownership/non-disclosure, all unauthenticated endpoints, inactive users, request validation, immutable fields, partial updates, persistence, duplicate-name policy, list ordering and API deletion cascades. Browser tests cover protected navigation, empty state, create/detail/refresh/edit, cancellation and confirmation of deletion, error/retry, and no uncaught page errors in the CRUD flow.

Ruff initially found long lines, corrected with formatting and a split diagnostic string. A sandbox restriction prevented Prettier reading the existing Pytest cache and prevented Chrome process spawning; checks were rerun with permission outside the sandbox. Pytest was also rerun outside the sandbox after a cache-write warning. Two existing upstream Starlette/httpx and AnyIO deprecation warnings remain; they were not suppressed. Playwright reports an environment-only NO_COLOR/FORCE_COLOR warning.

The initial review confirmed Module 03 is committed as `a3e35b7` and the working tree was clean. Module 04 reuses the existing models and `0001_core_schema`; no migration or schema change was needed.

The gate review of `git status`, `git diff --stat`, source and migration diffs confirmed no Mapbox implementation, site APIs, analytics or deployment changes. No files were staged, committed or pushed. New files are untracked until manual review; plain `git diff --stat` does not include them.

An initial browser test used the wrong label for the final confirmation button (`Delete project` instead of `Delete permanently`). The selector was corrected to match the accessible UI label; no product behavior or assertion was weakened.
