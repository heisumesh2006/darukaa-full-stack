# Module 05 — Mapbox infrastructure

## Scope and structure

The protected `/map` route now renders a spatial workspace with a reusable Mapbox GL JS component. It contains no project-site data, synthetic polygons, markers, selection, drawing controls, site APIs or analytics. Those features belong to Module 06 and later.

| File in `frontend/src/features/map/` | Responsibility                                          |
| ------------------------------------ | ------------------------------------------------------- |
| `MapPage.tsx`                        | Protected workspace presentation                        |
| `MapView.tsx`                        | Reusable container, token guard, loading/error/retry UI |
| `useMapbox.ts`                       | Map creation, events, controls, resize and cleanup      |
| `defaults.ts`                        | India initial view and standard style                   |
| `types.ts`                           | View options and feature lifecycle callback             |
| `map.css`                            | Responsive map container and feedback                   |

The router lazily loads the map page. The hook dynamically imports Mapbox only when a public token is configured, keeping its large renderer bundle off authentication/project page startup. The existing Mapbox dependency is reused; no new packages or Axios instances were added. Mapbox requests its own basemap resources directly and never receives the application's JWT authorization header.

## Environment and token security

Set the root, Git-ignored `.env`:

```dotenv
VITE_MAPBOX_ACCESS_TOKEN=
```

Supply your own public browser token locally, then restart Vite (and rebuild deployed assets when configuration changes). `frontend/src/app/config.ts` reads this variable; the old `VITE_MAPBOX_TOKEN` is retained as a fallback for existing Module 01 environments. The new name takes precedence. `.env.example` uses only the new name with an empty value.

Vite-prefixed values are public browser configuration. Never put a secret server token, JWT signing secret, database password or other private credential in a VITE variable. The component rejects non-public-token prefixes before initializing Mapbox; this is a usability guard, not a way to hide an already-exposed secret. Missing/invalid values show an explanation without crashing React. No token is printed in application logs or error messages.

Use a dedicated public token with only the required scopes. Configure URL restrictions for production and allow the intended local development URLs when testing locally. See [Mapbox access-token guidance](https://docs.mapbox.com/help/dive-deeper/access-tokens/). A real browser token is intentionally not required by automated tests and is not provided in this repository.

## Defaults and lifecycle

Defaults are center `[78.96, 22.59]` (longitude, latitude), zoom `4`, and `mapbox://styles/mapbox/light-v11`. `MapView` accepts `initialCenter`, `initialZoom`, and `styleUrl` overrides, so the same component can later be embedded in a project detail page. No project-specific coordinates are hard-coded. It retains Mapbox attribution and adds NavigationControl at the top right.

The hook owns one live instance per mounted component. It uses primitive configuration dependencies; ordinary rerenders and new coordinate-array identities do not recreate it. Changing view/style/token configuration deliberately recreates the instance. An asynchronous disposed guard prevents a late dynamic import from creating an instance after unmount, including React Strict Mode's effect replay. The cleanup removes load/error listeners, disconnects ResizeObserver, clears the load timeout, calls feature cleanup, then calls `map.remove()` to release the renderer and its resources. ResizeObserver covers container changes beyond window resizing.

Loading, unsupported WebGL, initialization failures, access denial (401/403), other map-resource errors and a 25-second load timeout have safe UI states. Retry disposes the old instance before creating a new one. Raw provider errors are not logged because they can contain URLs with token parameters. See the [Mapbox Map API](https://docs.mapbox.com/mapbox-gl-js/api/map/) for the underlying lifecycle and configuration methods.

## Future GeoJSON integration boundary

`onReady(map)` runs once after the initial style loads and may return a cleanup callback. Module 06 can use the typed Mapbox instance's native `addSource`, `addLayer` and event methods for GeoJSON and return listener/layer cleanup before map disposal. Keep callback ownership stable; changing the callback alone does not rerun initialization. Configuration-driven style replacement recreates the map and invokes the current callback on the new instance. A separate source/layer framework is unnecessary at this stage.

The future data boundary remains PostGIS geometry → backend GeoJSON conversion → typed frontend API data → Mapbox GeoJSON source. This module neither retrieves site data nor exposes database geometry objects. Polygon drawing is intentionally deferred until site management can validate and persist boundaries in Module 06.

## Verification

With the API on port 8000, Vite on 5173, PostgreSQL running, and Google Chrome installed:

```powershell
npm run test:map
npm run test:e2e
npm run lint
npm run build
npm run format:check
```

Tests use real registration/login and protected routing against the local API. Mapbox is replaced with an explicitly test-only module for lifecycle/error tests; browser configuration is overridden with an invalid, noncredential public-token placeholder. This verifies our integration code, not Mapbox's renderer or hosted tiles. Missing-token and actual Vite configuration checks need no external Mapbox access. Temporary users are removed. The mobile missing-token screenshot is an ignored local verification artifact.

See [Module 05 validation](module-05-validation.md) for actual results and limits. Live hosted basemap rendering must be checked after a valid local token is configured. The Mapbox renderer currently produces Vite's large-chunk warning despite being lazily loaded; the warning is retained, not suppressed.
