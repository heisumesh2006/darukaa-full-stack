# Module 06 validation

Focused PostgreSQL integration tests: 21 passed, covering CRUD, generated area, geometry validation, ownership, parent/site absence, forbidden client fields, and authentication. Full backend suite: 107 passed with two existing upstream deprecation warnings. Ruff and Ruff format passed (50 files); Alembic reported no new upgrade operations. The token-free site browser flow passed against the running API, including invalid save/retry, create/read/edit/delete, polygon selection, boundary removal and area recalculation. The first browser attempt was interrupted while the frontend was settling; an unchanged rerun passed. Formatting and browser execution are kept sequential for the final gate.

No models or migrations were changed. Real browser drawing remains limited by the absence of a public Mapbox token; the token-free browser adapter drives Draw events through the real site API.

Final Module 06 gate: frontend lint/build/format and git diff --check passed; the full Chrome regression suite passed all 14 tests in 1.1 minutes. Security/build audit passed and all temporary test users were removed. Module 07 began only after this gate. The retained Mapbox chunk-size and upstream deprecation/environment warnings do not fail checks.
