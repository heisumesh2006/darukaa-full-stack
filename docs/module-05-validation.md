# Module 05 validation

Module 04's complete gate passed before any Mapbox implementation was added; see [its validation record](module-04-validation.md).

The complete gate passed before Module 06 started:

| Check                                              | Result                                                 |
| -------------------------------------------------- | ------------------------------------------------------ |
| Backend Ruff / format                              | Passed; 45 files formatted                             |
| Backend Pytest                                     | 86 passed, 2 upstream deprecation warnings             |
| pip check                                          | No broken requirements found                           |
| Alembic check                                      | No new upgrade operations detected                     |
| Frontend lint / format                             | Passed                                                 |
| Frontend build                                     | Passed; 130 modules transformed                        |
| Authentication / project HTTP smoke                | Both passed; temporary accounts removed                |
| Complete Playwright suite                          | 13 passed in 53.8s: 3 auth, 2 project, 8 map           |
| Compose config / database health                   | Passed; PostgreSQL 17.5, PostGIS 3.5, healthy on 55432 |
| Secret audit / migration review / git diff --check | Passed                                                 |

The map lifecycle harness initially imported Vite's optimized CommonJS React DOM module as named exports. Correcting the harness to use its default export fixed the test; the full suite was rerun. A cleanup audit attempted during active browser tests correctly detected their temporary accounts; after tests finished, the audit confirmed zero remaining accounts. No production behavior or checks were weakened.

Models, migration history, seed identity and authentication security were preserved. The seeded user remains inactive/passwordless. No commit or push was performed.

No valid local Mapbox token is configured. Real browser checks cover protected navigation, missing-token rendering and responsive layout. A test-only Mapbox module covers configuration, navigation-control installation, resize, disposal, safe errors and retry; it does not verify hosted tiles or real WebGL map interaction. These limits must not be represented as live Mapbox rendering validation.

Build output includes an expected large Mapbox renderer chunk warning. It is dynamically imported; the warning is not hidden by raising the chunk-size threshold. Existing backend deprecation warnings and Playwright's NO_COLOR/FORCE_COLOR environment warning remain visible.
