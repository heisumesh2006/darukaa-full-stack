# Module plan

Implement exactly one module at a time. Validate its acceptance criteria, review the diff, then let the user commit/push manually. Do not begin the next module automatically.

| Module | Scope                                                 | Dependencies | Completion gate                                                                                                  |
| ------ | ----------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------- |
| 01     | Foundation, architecture and developer tooling        | None         | Shell, health API, PostGIS connectivity, lint/build/tests, working staged hooks and docs                         |
| 02     | Database, PostGIS and migrations                      | 01           | User/project/site/metric schema, constraints, spatial types and reversible migrations validated                  |
| 03     | Authentication and authorization                      | 02           | Registration/login, password hashing, JWT, current user, logout, protected routes and tested access policy       |
| 04     | Project management                                    | 03           | Project CRUD and validation work across UI/API/database                                                          |
| 05     | Mapbox map infrastructure                             | 04           | Environment token, navigation, map lifecycle and error states verified                                           |
| 06     | Site management and polygon drawing                   | 02, 04, 05   | Multiple sites per project; draw/edit/remove/save valid polygons; selection/details and spatial queries verified |
| 07     | Environmental analytics and metrics                   | 06           | Documented synthetic time series, metric APIs, units and aggregation correctness                                 |
| 08     | Dashboard and data visualization                      | 07           | Real persisted KPIs, Highcharts, map and site/project information integrated                                     |
| 09     | Search, filtering, UX and product polish              | 08           | Consistent search/filter behavior, accessibility, responsive/loading/empty/error states                          |
| 10     | Automated testing and code quality                    | 09           | Expanded unit/integration/end-to-end coverage and full quality checks pass                                       |
| 11     | GitHub Actions CI/CD and production deployment        | 10           | Private repo workflows, supported PostGIS hosting, secret configuration and public smoke-tested URL              |
| 12     | Final documentation, demo data and submission package | 11           | Comprehensive docs, demo/reviewer notes and Word document containing actual links                                |

## Module 01 boundaries

Installed future libraries are not implemented features. No authentication, CRUD, map rendering/drawing, metric data, dashboard KPIs, business migrations or deployment workflows. `.github/workflows` and frontend feature directories are reserved only.

## Per-module execution contract

Inspect instructions and existing work; implement only the current module. Keep routes thin, business logic in services and persistence access separate. Add meaningful tests for new behavior. Execute relevant lint/build/test and runtime checks; diagnose actual failures and rerun. Record commands, results, limitations and a suggested commit message. Never silently skip failed checks or claim unverified behavior. Stop after the module; user controls commits, pushes and progression.
