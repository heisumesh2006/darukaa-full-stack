# Module 06 — Sites and polygon drawing

The existing Site model, geometry constraints, GiST index and generated geodesic area are reused without migrations. Thin nested routes use SiteService → SiteRepository. Every operation first authorizes the project owner, then scopes the site ID to that project. Missing/foreign projects and missing/wrong-parent sites return 404; unauthenticated requests return 401.

Endpoints: GET/POST `/api/projects/{project_id}/sites`; GET/PATCH/DELETE `/api/projects/{project_id}/sites/{site_id}`. Create accepts name, optional description and a GeoJSON Polygon geometry. PATCH accepts only those fields; omitted fields remain unchanged, description may be cleared with null, name/geometry cannot be null, and an empty update is rejected. Names are trimmed to 1–200 characters and descriptions limited to 5,000. IDs, area, timestamps and CRS overrides cannot be submitted.

Geometry is two-dimensional WGS84 longitude/latitude. Rings must close and have at least three distinct vertices; longitude/latitude must be finite numeric values in [-180,180]/[-90,90]. Limits: 20 rings, 2,000 positions per ring, 10,000 total. PostGIS checks topology with ST_IsValid, including self-intersection and holes, before persistence. Area must be large enough to remain positive at the stored six-decimal-hectare precision (at least 0.005 square metres). Database constraints remain the final authority. Invalid input returns safe 422 messages without echoing raw database errors.

The canonical geometry remains `geometry(Polygon,4326)`. ST_GeomFromGeoJSON and ST_SetSRID establish the database boundary; ST_AsGeoJSON converts response geometry. The existing generated `ST_Area(geometry::geography)/10000` column calculates hectares and updates when geometry changes. Client area values are never trusted. Responses expose explicit fields, never raw WKB objects. DELETE permanently cascades to the site's metrics; the UI requires confirmation.

Project detail now lists sites and displays their GeoJSON polygons in the existing MapView. Clicking a polygon selects basic name/area information with a detail link. Creation/edit routes use Mapbox GL Draw with only polygon/trash controls. The editor keeps one typed Polygon, supports vertex/move edits and removal before save, and retains form values after validation/network errors. Existing metadata can be edited without a configured token; new boundaries require Mapbox. The form blocks duplicate submissions. Lists and detail have loading/error/empty states.

SiteMap owns its source, fill/outline layers and click listener. BoundaryEditor owns Draw and create/update/delete listeners; all are removed before map disposal. JWT remains restricted to the existing API client and is not passed to Mapbox. No analytics were introduced by Module 06.

## Verification

Run `backend/.venv/Scripts/python.exe -m pytest -q backend/tests/integration/test_sites.py` from the root, or the standard full backend checks from `backend`. Run `npm run test:sites` with API/Vite/Chrome available; `npm run test:e2e` includes all browser tests. The site browser test uses the real API/PostGIS with explicit test-only Mapbox and Draw adapters. Generated project-smoke users and their owned data are removed through the existing guarded cleanup command.

No live Mapbox token is available locally. Automated drawing-event and map integration checks do not claim successful hosted basemap rendering or real Draw pointer gestures. Configure a public URL-restricted token to review those manually. See [validation](module-06-validation.md).

References: [Mapbox Draw API](https://github.com/mapbox/mapbox-gl-draw/blob/main/docs/API.md), [PostGIS GeoJSON conversion](https://postgis.net/docs/ST_GeomFromGeoJSON.html).
