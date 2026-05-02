<!-- refreshed: 2026-05-02 -->
# Architecture

**Analysis Date:** 2026-05-02

## System Overview

The Taipei City Dashboard is a three-service polyrepo composed under a single
working tree. A Vue 3 SPA (`Taipei-City-Dashboard-FE`) is the user-facing app.
A Go/Gin REST API (`Taipei-City-Dashboard-BE`) is the system-of-record service
backed by two PostgreSQL databases plus Redis. An Airflow project
(`Taipei-City-Dashboard-DE`) ETLs open-data sources into the dashboard
PostgreSQL on a schedule. They communicate through HTTP (FE → BE) and shared
PostgreSQL (DE → BE), not directly with each other.

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                          Browser (Vue 3 SPA)                             │
│                                                                          │
│   Views                Pinia Stores              Components              │
│   `src/views/*.vue`    `src/store/*.js`          `src/components/**`     │
│   `src/App.vue`        contentStore / mapStore   `src/dashboardComponent`│
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │ axios (Bearer JWT)
                                   │ `src/router/axios.js`
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  Backend API (Go 1.x + Gin)                              │
│                                                                          │
│   routes/router.go  →  middleware/*  →  controllers/*  →  models/*       │
│                                                            services/*    │
│   `app/routes/router.go`                                                 │
└────────┬───────────────────────────┬───────────────────────────┬────────┘
         │ GORM                      │ go-redis                  │ HTTP
         ▼                           ▼                           ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│ PostgreSQL       │       │ Redis            │       │ External APIs    │
│ DBManager        │       │ rate limit /     │       │ TaipeiPass ISSO  │
│ DBDashboard      │       │ session cache    │       │ TWCC AI / Qdrant │
└─────────▲────────┘       └──────────────────┘       └──────────────────┘
          │
          │ writes statistical / open-data tables
          │
┌──────────────────────────────────────────────────────────────┐
│         Data Engineering (Airflow DAGs, Python)              │
│   `Taipei-City-Dashboard-DE/dags/proj_city_dashboard/**`     │
│   common operator: `dags/operators/common_pipeline.py`       │
└──────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Vue SPA entry | Bootstraps app, registers Pinia + Vue Router + ApexCharts | `Taipei-City-Dashboard-FE/src/main.js` |
| Root layout | Mounts NavBar / SideBar / dialogs, drives auto-refresh timers | `Taipei-City-Dashboard-FE/src/App.vue` |
| Router | URL → view, route guards for auth/admin/mobile | `Taipei-City-Dashboard-FE/src/router/index.js` |
| HTTP client | Shared axios instance + interceptors (JWT, error toasts) | `Taipei-City-Dashboard-FE/src/router/axios.js` |
| Content store | Loads dashboards/components, owns `currentDashboard` + chart fetch loop | `Taipei-City-Dashboard-FE/src/store/contentStore.js` |
| Map store | Mapbox GL + deck.gl lifecycle, layers, popups, animations | `Taipei-City-Dashboard-FE/src/store/mapStore.js` |
| Dashboard widget | Polymorphic chart container that renders any of ~20 chart types | `Taipei-City-Dashboard-FE/src/dashboardComponent/DashboardComponent.vue` |
| Go entry | CLI shell calling `cmd.Execute` | `Taipei-City-Dashboard-BE/main.go` |
| Cobra commands | Subcommands: serve (default), `migrateDB`, `initDashboard` | `Taipei-City-Dashboard-BE/cmd/root.go` |
| App bootstrap | Connects DBs + Redis, wires Gin, starts ONNX runtime | `Taipei-City-Dashboard-BE/app/app.go` |
| Routes | Builds `/api/v1/*` route groups + per-group middleware | `Taipei-City-Dashboard-BE/app/routes/router.go` |
| Controllers | HTTP handlers (one file per resource) | `Taipei-City-Dashboard-BE/app/controllers/*.go` |
| Models | GORM models + query helpers across two DBs | `Taipei-City-Dashboard-BE/app/models/*.go` |
| Services | Cross-controller logic (AI providers, Qdrant vector search) | `Taipei-City-Dashboard-BE/app/services/` |
| Middleware | JWT, rate limits, common headers, X-Forwarded-For sanitize | `Taipei-City-Dashboard-BE/app/middleware/*.go` |
| Cron jobs | Scheduled BE jobs at boot | `Taipei-City-Dashboard-BE/app/initial/cron.go` |
| ETL DAGs | One DAG per data source (D-codes), shared common pipeline | `Taipei-City-Dashboard-DE/dags/proj_city_dashboard/` |

## Pattern Overview

**Overall:** Layered MVC on the backend, MVVM/store-centric SPA on the frontend,
batch ETL pipeline on the data side. The three services are **decoupled by data
contracts** (PostgreSQL tables + REST JSON), not by code sharing.

**Key Characteristics:**
- Backend follows classic Gin layout: `routes → middleware → controllers → models`. Services exist only for cross-cutting/AI concerns.
- Frontend is **store-driven**: `contentStore` is the single owner of dashboard/component state and orchestrates the API call sequence; views are mostly thin.
- Map rendering is fully encapsulated in `mapStore` (Mapbox GL + deck.gl + Three.js are all hidden behind store actions).
- The "dashboard widget" is a single mega-component (`DashboardComponent.vue`) that internally `v-if`s over a chart-type registry, so adding a chart type means dropping a Vue file in `src/dashboardComponent/components/` and registering it in the parent.
- The DE side uses one `CommonDag` factory (`dags/operators/common_pipeline.py`) parameterised by a per-DAG `job_config.json`, with each DAG implementing `_DXXXXXX(**kwargs)` for Extract/Transform/Load.

## Layers

**Frontend - View layer:**
- Purpose: Page-level Vue components mapped 1:1 to routes
- Location: `Taipei-City-Dashboard-FE/src/views/`
- Contains: `DashboardView.vue`, `MapView.vue`, `ComponentView.vue`, `ComponentInfoView.vue`, `EmbedView.vue`, `CallBack.vue`, `admin/Admin*.vue`
- Depends on: stores, dashboardComponent, dialogs
- Used by: router

**Frontend - Store layer (Pinia):**
- Purpose: Application state + API orchestration
- Location: `Taipei-City-Dashboard-FE/src/store/`
- Contains: `authStore.js`, `contentStore.js`, `mapStore.js`, `dialogStore.js`, `adminStore.js`, `chatStore.js`
- Depends on: `router/axios.js`, utility functions, mapbox/deck.gl
- Used by: views, components, dialogs

**Frontend - Reusable widgets:**
- Purpose: Chart/map/UI primitives; the polymorphic dashboard widget
- Location: `Taipei-City-Dashboard-FE/src/dashboardComponent/`, `Taipei-City-Dashboard-FE/src/components/`
- Contains: chart Vue files, `MapContainer.vue`, dialog Vue files, sidebar/nav bars
- Depends on: ApexCharts, Mapbox GL, stores
- Used by: views

**Backend - Routing layer:**
- Purpose: URL → handler binding, attaches per-group middleware
- Location: `Taipei-City-Dashboard-BE/app/routes/router.go`
- Depends on: controllers, middleware, global config
- Used by: `app.StartApplication`

**Backend - Middleware:**
- Purpose: JWT validation, rate limiting (per IP / per user), header normalisation
- Location: `Taipei-City-Dashboard-BE/app/middleware/`
- Files: `auth.go`, `common.go`, `rateLimit.go`, `sanitizeXForwardedFor.go`
- Used by: every route group

**Backend - Controllers:**
- Purpose: HTTP request parsing, response shaping. Thin wrappers over models.
- Location: `Taipei-City-Dashboard-BE/app/controllers/`
- Convention: One file per resource (`dashboard.go`, `componentData.go`, `auth.go`, …)

**Backend - Models:**
- Purpose: GORM struct definitions + query helpers. Owns DB access.
- Location: `Taipei-City-Dashboard-BE/app/models/`
- Two DB handles: `DBManager` (auth, configs) and `DBDashboard` (statistics) declared in `models/database.go`

**Backend - Services:**
- Purpose: Cross-controller / external integrations
- Location: `Taipei-City-Dashboard-BE/app/services/`
- Notable: `services/ai/ai_service.go`, `services/ai/providers/twcc/`, `services/ai/tools/registry.go`, `services/qdrant.go`

**Backend - Cache / Init / Util / Global:**
- Cache: `Taipei-City-Dashboard-BE/app/cache/redis.go`
- Cron jobs at boot: `Taipei-City-Dashboard-BE/app/initial/cron.go`
- Schema/sample-data init: `Taipei-City-Dashboard-BE/app/initial/initial.go`
- Helpers (JWT decode, time parsing, IP, etc.): `Taipei-City-Dashboard-BE/app/util/`
- Constants and runtime singletons (DB configs, JWT secret, ONNX session): `Taipei-City-Dashboard-BE/global/`
- Logger: `Taipei-City-Dashboard-BE/logs/logs.go`

**Data Engineering layers:**
- DAG definitions: `Taipei-City-Dashboard-DE/dags/proj_city_dashboard/<DCODE>/<DCODE>.py` + sibling `job_config.json`
- Shared DAG factory: `Taipei-City-Dashboard-DE/dags/operators/common_pipeline.py` (`CommonDag`)
- Reusable ETL helpers: `Taipei-City-Dashboard-DE/dags/utils/extract_stage.py`, `load_stage.py`, `transform_*.py`
- Common housekeeping DAGs: `Taipei-City-Dashboard-DE/dags/common_dags/`
- Settings/config: `Taipei-City-Dashboard-DE/dags/settings/global_config.py`

## Data Flow

### Primary Request Path: "User opens /dashboard?index=health&city=taipei"

1. Browser hits the SPA. `Taipei-City-Dashboard-FE/src/main.js` boots Vue, installs Pinia + Router.
2. `Taipei-City-Dashboard-FE/src/router/index.js` matches `/dashboard` → `DashboardView.vue`. Route guards run in order:
   - sets `authStore.currentPath`
   - mobile / admin redirect checks
   - `contentStore.setRouteParams("/dashboard", "health", "taipei")` (`Taipei-City-Dashboard-FE/src/store/contentStore.js:89`)
   - clears or resets the map via `mapStore.clearEntireMap()`
3. `contentStore.setRouteParams` triggers `setDashboards()` (line 134) which axios-GETs `/api/v1/dashboard/`.
4. axios attaches `Authorization: Bearer <token>` from `authStore` (`Taipei-City-Dashboard-FE/src/router/axios.js:19`) and prefixes `VITE_API_URL`.
5. Gin routes the request. The global `middleware.ValidateJWT` (`Taipei-City-Dashboard-BE/app/middleware/auth.go:16`) parses the JWT (or assigns guest/public viewer permissions) and stuffs `accountID`, `permissions`, `isAdmin` into the Gin context.
6. The `/dashboard` group adds rate-limit middleware (`Taipei-City-Dashboard-BE/app/routes/router.go:130`) then dispatches to `controllers.GetAllDashboards` (`Taipei-City-Dashboard-BE/app/controllers/dashboard.go:24`).
7. The controller calls `models.GetAllDashboards(accountID)` (`Taipei-City-Dashboard-BE/app/models/dashboard.go:47`) which fans out four GORM queries against `DBManager` (public, taipei, metrotaipei, personal-by-account-id) and returns a tagged JSON envelope `{status, data}`.
8. Back in the SPA, `contentStore.setDashboards` partitions the response into `dashboards` (Map<city, Dashboard[]>), `personalDashboards`, and `favorites`, then calls `setCurrentDashboardAllContent()` (line 226).
9. `setCurrentDashboardAllContent` GETs `/api/v1/dashboard/:index` → `controllers.GetDashboardByIndex` → `models.GetDashboardByIndex(index, groups, city)` to load the component configs for the active dashboard.
10. `setCurrentDashboardAllChartData()` (line 280) loops over the components and, **per component**, GETs `/api/v1/component/:id/chart?city=taipei&...` → `controllers.GetComponentChartData` (`Taipei-City-Dashboard-BE/app/controllers/componentData.go:20`) which reads a SQL fragment + `query_type` from `DBManager`, then runs it against `DBDashboard` via helpers like `models.GetTwoDimensionalData` / `GetTimeSeriesData` / `GetMapLegendData`.
11. For components with `history_config`, an additional `/component/:id/history` round-trip is made.
12. Each chart payload lands on `cityDashboard.components[i].chart_data`. `filterCurrentDashboardContent()` materialises `currentDashboard.components`.
13. `DashboardView.vue` reactively renders one `DashboardComponent.vue` per entry; the widget switches on `chart_config.types` and mounts the matching chart from `src/dashboardComponent/components/*Chart.vue`.

### Map Layer Toggle Flow

1. User toggles a layer in `MapView.vue` / `MapContainer.vue` (`Taipei-City-Dashboard-FE/src/components/map/MapContainer.vue`).
2. `mapStore.addToMapLayerList` / `mapStore.addMapLayer` resolves the layer's `map_config`, fetches GeoJSON (cached or via `http`/`axios`), then registers a Mapbox source + layer (or a deck.gl `MapboxOverlay` for animated layers).
3. Popup wiring uses `MapPopup.vue` which is mounted dynamically with `createApp` from inside `mapStore`.

### Auth / TaipeiPass ISSO Flow

1. User clicks login → `authStore` redirects to TaipeiPass.
2. Provider redirects to `/callback` → `views/CallBack.vue`.
3. SPA POSTs to `/api/v1/auth/callback` (`controllers.ExecIssoAuth`).
4. BE exchanges code, mints JWT, returns it; axios response interceptor stores it in `localStorage` and `authStore.token` (`Taipei-City-Dashboard-FE/src/router/axios.js:39`).
5. Subsequent requests attach the bearer token; `middleware.ValidateJWT` resolves `permissions` from the `auth_user_group_roles` table.

### ETL Refresh Flow (DE)

1. Airflow scheduler triggers a DAG, e.g. `proj_city_dashboard/D010501/D010501.py` (built by `CommonDag` from `operators/common_pipeline.py`).
2. The DAG's `_DXXXXXX(**kwargs)` calls helpers in `dags/utils/`: `extract_stage.get_data_taipei_api(...)` for ingest, `transform_*` for normalisation, `load_stage.save_dataframe_to_postgresql(...)` for write-back.
3. Data lands in the same PostgreSQL that BE reads (`DBDashboard`), so the next FE chart request returns fresh data with no BE redeploy.

**State Management:**
- Frontend: Pinia stores are global singletons. `contentStore` owns dashboards/components, `mapStore` owns map state, `authStore` owns user + token (mirrored to `localStorage`), `dialogStore` controls modal visibility, `chatStore` owns chatbot conversation, `adminStore` owns admin-screen filters.
- Backend: Stateless per-request; persistent state lives in PostgreSQL/Redis. Process-wide singletons are limited to DB handles, ONNX session, and the Gin engine in `global/global.go` and `models/database.go`.

## Key Abstractions

**Dashboard / Component / ChartConfig (BE):**
- Purpose: A "dashboard" is an ordered list of "component" IDs; each component has a SQL `query_chart` + `query_type` plus a `chart_config` and optional `map_config`/`history_config`.
- Examples: `Taipei-City-Dashboard-BE/app/models/dashboard.go`, `Taipei-City-Dashboard-BE/app/models/componentConfig.go`, `Taipei-City-Dashboard-BE/app/models/componentData.go`
- Pattern: Config-driven rendering — the SQL and chart type live in the DB, not in code.

**`DashboardComponent` widget (FE):**
- Purpose: One Vue component renders ~20 chart variants by switching on `config.chart_config.types[0]`
- Location: `Taipei-City-Dashboard-FE/src/dashboardComponent/DashboardComponent.vue`
- Pattern: Sub-components in `src/dashboardComponent/components/` are imported eagerly and gated by `v-if`; svg thumbnails live next to them in `assets/chart/`.

**`CommonDag` factory (DE):**
- Purpose: Single class that builds an Airflow `DAG` object from `job_config.json` + a Python callable
- Location: `Taipei-City-Dashboard-DE/dags/operators/common_pipeline.py`
- Pattern: Each new data source = directory under `proj_city_dashboard/<CODE>/` with `<CODE>.py`, `__init__.py`, `job_config.json`.

**Two-database split (BE):**
- `DBManager` — auth users, groups, roles, dashboards, components configs, contributors, issues
- `DBDashboard` — statistical fact tables loaded by DE
- Declared in `Taipei-City-Dashboard-BE/app/models/database.go` and connected in `app.StartApplication`

**City-aware data layer:**
- The same dashboards/components can be filtered by `city` (`taipei`, `metrotaipei`). The frontend's `CityManager` (`Taipei-City-Dashboard-FE/src/dashboardComponent/utilities/cityManager.ts`) governs which cities are visible; backend queries accept a `?city=` param and split to per-city tables.

## Entry Points

**Frontend dev server:**
- Location: `Taipei-City-Dashboard-FE/src/main.js`
- Triggers: `npm run dev` (Vite, see `vite.config.js`)
- Responsibilities: Vue app creation, Pinia + Router + ApexCharts plugin install, mount on `#app`
- Vite proxies: `/api` → `https://citydashboard.taipei/api/v1` (or `dashboard-be:8080` under docker compose), `/geo_server` → upstream WMS

**Backend HTTP server:**
- Location: `Taipei-City-Dashboard-BE/main.go` → `cmd.Execute` → `app.StartApplication`
- Triggers: `./TaipeiCityDashboardBE` with no args (Cobra root command)
- Listens via `endless.ListenAndServe(global.GinAddr, routes.Router)`

**Backend ops commands:**
- `migrateDB` → `app.MigrateManagerSchema()` (GORM AutoMigrate + sample data)
- `initDashboard` → `app.InsertDashbaordSampleData()` (loads `db-sample-data/dashboard-demo.sql` via `psql`)
- Defined in `Taipei-City-Dashboard-BE/cmd/root.go`

**Airflow DAGs:**
- Location: `Taipei-City-Dashboard-DE/dags/`
- Triggered by: Airflow scheduler (cron-like schedules from per-DAG `job_config.json`)
- Manual ops: see `Taipei-City-Dashboard-DE/cicd/add-dags-to-composer.cloudbuild.yaml` for GCP Composer deploy

**Container/orchestration entry points:**
- Local stack: `docker/docker-compose.yaml`, `docker/docker-compose-db.yaml`, `docker/docker-compose-init.yaml`
- Helm: `helm-chart/Chart.yaml` + `helm-chart/values-prod.yaml` / `values-sit.yaml`
- FE container start: `Taipei-City-Dashboard-FE/docker-entrypoint.sh` + `nginx.conf.template`

## Architectural Constraints

- **Threading (BE):** Gin handlers run on goroutines per request. The ONNX runtime session (`global.LMSession`, `global.LMTokenizer`) is a process-wide singleton initialised in `app.StartApplication`; consumers must treat it as shared mutable state.
- **Two GORM handles (BE):** `models.DBManager` and `models.DBDashboard` are **package-level globals**. Cross-DB joins are not possible; controllers fan out two queries when they need data from both.
- **Global Gin engine + RouterGroup (BE):** `routes.Router` and `routes.RouterGroup` are package-level vars (`Taipei-City-Dashboard-BE/app/routes/router.go:23`). `ConfigureRoutes` mutates them at boot.
- **Single-page app, full client-side routing (FE):** All non-`/api` paths must be rewritten to `/index.html` by Nginx (`Taipei-City-Dashboard-FE/nginx.conf*`).
- **Pinia store coupling (FE):** `mapStore`, `contentStore`, `dialogStore`, `authStore` reference each other directly via `useXStore()`. There is no DI; circular usage is avoided by lazy `useXStore()` calls inside actions, not at module top level.
- **Synthetic `make-new-thing-here` index (FE):** `MapView` short-circuits when `route.query.index === "make-new-thing-here"` so there is no BE round-trip — the panel under `src/make-new-thing-here/` owns its own data path.
- **DAG/SQL coupling (DE→BE):** DAG output table names must match the SQL fragments stored in BE's `components.query_chart`. Renaming a DAG output table without updating the BE config table breaks the chart silently.
- **Vite proxy in dev only:** Production builds rely on the Nginx config to terminate `/api` and `/geo_server` paths.

## Anti-Patterns

### Fat polymorphic widget

**What happens:** `Taipei-City-Dashboard-FE/src/dashboardComponent/DashboardComponent.vue` imports every chart type and selects via `v-if`/`v-else-if`.
**Why it's wrong:** Adding a chart type forces edits to a single hot file; tree-shaking can't drop unused chart types per page.
**Do this instead:** Continue using the existing pattern (it is the project convention) but register new charts via the existing `chartTypes.ts` map in `src/dashboardComponent/utilities/chartTypes.ts` rather than inventing a new switch.

### Sequential per-component chart fetches

**What happens:** `contentStore.setCurrentDashboardAllChartData` (`Taipei-City-Dashboard-FE/src/store/contentStore.js:280`) loops with `await` per component, then again per history range.
**Why it's wrong:** Latency is O(N components × M history ranges) instead of O(1).
**Do this instead:** Batch with `Promise.all` over the component list (each loop iteration is independent), or add a BE endpoint that takes a dashboard id and returns all chart payloads.

### Commented-out routes / dead WS handlers

**What happens:** `configureWsRoutes` and several controller branches are commented out in `Taipei-City-Dashboard-BE/app/routes/router.go` and `controllers/websocket.go` / `writemap.go`.
**Why it's wrong:** Dead code in routing files makes the surface area ambiguous and obscures the auth posture.
**Do this instead:** Delete and recover from git history if needed; if features are pending, gate behind a build tag instead of comments.

### Implicit `gorm` debug call in production code

**What happens:** `models.GetAllDashboards` calls `DBManager.Debug().Joins(...)` (`Taipei-City-Dashboard-BE/app/models/dashboard.go:98`).
**Why it's wrong:** `.Debug()` logs every SQL statement at INFO; under load this floods logs and leaks query shapes.
**Do this instead:** Drop `.Debug()`, gate with a build flag, or use the standard logger interface.

## Error Handling

**Strategy:** Backend returns `{status: "error"|"success", message?: string, data?: any}` JSON envelopes with a matching HTTP status code. Frontend axios response interceptor in `src/router/axios.js` maps statuses to localised toast notifications via `dialogStore.showNotification` (401 → forced logout, 403/429/500 → toast, others → server message).

**Patterns:**
- Controllers use `errors.Is(err, gorm.ErrRecordNotFound)` for 404 vs 500 split (`controllers/dashboard.go:62`).
- The chart-data fetch loop in `contentStore` swallows per-component errors and stores `[]` so a single failing chart doesn't break the dashboard (`store/contentStore.js:318`).
- DE DAGs propagate errors to Airflow's task-instance failure handling; per-task retry policy is configured in each `job_config.json`.

## Cross-Cutting Concerns

**Logging:**
- BE: Custom logger in `Taipei-City-Dashboard-BE/logs/logs.go` (`logs.Info`, `logs.FInfo`, `logs.FWarn`, …) writes to stdout via Gin's logger middleware plus app-level calls.
- FE: `console.error` only; no structured client-side logging.
- DE: Standard Airflow task logs.

**Validation:**
- BE: Gin's `ShouldBindQuery` / `ShouldBindJSON`. City whitelist is hand-coded in controllers (e.g., `componentData.go:31`).
- FE: Inline form checks in dialog components plus shared helpers in `src/assets/utilityFunctions/validate.js`.

**Authentication:**
- TaipeiPass ISSO (OAuth-style) is the user identity provider.
- BE issues a JWT (`global.JwtSecret`); FE stores it in `localStorage` and `authStore.token`.
- Authorisation is permission-based: `(group_id, role_id)` claims attached to context by `middleware.ValidateJWT`; `IsLoggedIn` and `IsSysAdm` middlewares gate route groups.

**Rate limiting:**
- Per-route group via `middleware.LimitAPIRequests` and `middleware.LimitTotalRequests` (Redis-backed counters).
- Limits per resource live in `Taipei-City-Dashboard-BE/global/consts.go`.

**Caching:**
- Redis through `app/cache/redis.go`; primarily used by rate-limit counters and chat sessions.
- FE has no service-worker cache; map tiles cache via Mapbox defaults.

---

*Architecture analysis: 2026-05-02*
