# Darukaa.Earth requirements

The user specification is authoritative. This document distinguishes required product behavior from Module 01's implemented foundation.

## Purpose and user stories

A hiring-evaluation hackathon environmental project management and geospatial analytics platform for carbon and biodiversity projects. Administrators create projects containing multiple geographic sites; view all projects/sites on an interactive map; click sites to inspect details and performance over time.

## Authentication (planned)

Registration, login, securely hashed passwords, JWT authentication, protected REST endpoints and frontend routes, current authenticated user and logout. An administrator/user model is sufficient; explicit authorization behavior is designed in Module 03. JWT secrets come from environment configuration. No plaintext passwords or committed secrets.

## Projects (planned)

Administrators create, list, inspect, update and delete projects where appropriate and view their sites. Fields include name, description, type, status, start/end dates, creator and timestamps. Validate dates and relationships and define safe deletion behavior.

## Geographic sites (planned)

Create multiple sites per project with metadata. Draw a polygon on an interactive map, edit/remove it before saving, persist it, display saved boundaries, edit site information, inspect details and delete where appropriate. Store real PostGIS polygon geometry with appropriate SRID (planned Polygon/4326), never latitude/longitude strings. Use GeoJSON across the frontend/backend boundary. PostGIS must meaningfully support storage, geometry validation, area calculation and spatial queries.

## Map (planned)

Required Mapbox GL JS with Mapbox GL Draw or compatible drawing library. Support panning, zooming, navigation, site polygons, project/site interaction, polygon selection and popups/information panels. Read `VITE_MAPBOX_TOKEN`; never hard-code tokens.

## Analytics and dashboard (planned)

Prefer Highcharts (selected), with meaningful site time series such as carbon sequestered, biodiversity index, vegetation index and tree cover percentage. Synthetic data is allowed and must be clearly labeled/documented as hackathon data, never attributed to satellites or scientific providers. Define units and aggregation semantics before implementation.

The professional dashboard combines total projects/sites/area, carbon and biodiversity KPIs, a map, project/site information and analytics. Use actual persisted data when implemented. Aim for an environmental intelligence SaaS experience with accessible, responsive UI and complete state handling.

## Technology and code quality

Required React, Mapbox GL JS, Highcharts or Chart.js, Python/FastAPI REST APIs and PostgreSQL/PostGIS. Selected supporting stack: Vite, TypeScript, React Router, Axios, SQLAlchemy 2, Pydantic, Alembic, GeoAlchemy2, Pytest and Ruff. Feature-oriented frontend and modular-monolith backend. Separate presentation, API communication, routes, schemas, services, repositories and database. No SQL in route handlers, business rules in components/models, duplicated clients, huge files, microservices or hard-coded configuration.

Husky, lint-staged, Prettier and ESLint must execute real checks. Backend uses Ruff and Pytest. Test each module before moving on; expand cross-feature coverage in Module 10.

## Delivery and CI/CD (planned)

Use Git, a private GitHub repository and GitHub Actions. Workflows eventually run frontend lint/build, backend lint/tests, other appropriate checks and deployment. Deliver a publicly accessible application URL. Select hosting later based on PostGIS compatibility and cost; Vercel/Render/Heroku or equivalents are options, not commitments.

## Final submission (Module 12)

- Private repository link and public live demo URL.
- Comprehensive README, architecture/schema explanations and local setup instructions.
- CI/CD and GitHub Actions documentation.
- Necessary demo credentials or reviewer notes shared appropriately.
- Word (.docx) submission document containing actual links and reviewer information.

The user will manually arrange private repository access for ankita.dasgupta@darukaa.com, harsh.kumar@darukaa.com, utkarsh.gauniyal@darukaa.com and guneet.mutreja@darukaa.com. Do not invite anyone now. Do not create remotes, commit, push or publish during Module 01.

## Current scope

Only Module 01: repository, frontend shell/placeholders and reusable states, API client, health API, CORS/settings, database connection/PostGIS container, SQLAlchemy/GeoAlchemy2/Alembic foundation, quality tooling, tests and documentation. Later-module behaviors above are not implemented. See the numbered [roadmap](module-plan.md).
