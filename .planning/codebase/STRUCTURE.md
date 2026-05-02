# Codebase Structure

**Analysis Date:** 2026-05-02

## Top-Level Layout

```text
taipei-city-dashboard/
├── README.md
├── LICENSE
├── Taipei-City-Dashboard-FE/      # Vue 3 SPA (frontend)
│   ├── Dockerfile
│   ├── docker-entrypoint.sh
│   ├── nginx.conf, nginx.conf.template
│   ├── vite.config.js
│   ├── eslint.config.js
│   ├── package.json
│   ├── index.html
│   ├── public/                    # Static assets served as-is
│   └── src/                       # Application source
├── Taipei-City-Dashboard-BE/      # Go + Gin REST API (backend)
│   ├── Dockerfile
│   ├── cloudbuild.yaml
│   ├── go.mod, go.sum
│   ├── main.go                    # Cobra entry → cmd.Execute
│   ├── export_model*.py           # ONNX model export helpers
│   ├── cmd/                       # Cobra subcommands
│   ├── app/                       # All HTTP, DB, cache, services
│   ├── global/                    # Process-wide config + singletons
│   └── logs/                      # Logger
├── Taipei-City-Dashboard-DE/      # Airflow ETL (data engineering)
│   ├── README.md
│   ├── cicd/                      # GCP Cloud Build for Composer deploys
│   ├── config/                    # airflow.cfg
│   ├── docker/
│   └── dags/                      # All DAGs + helpers
├── db-sample-data/                # Seed SQL for first-time setup
│   ├── dashboard-demo.sql
│   └── dashboardmanager-demo.sql
├── docker/                        # Local docker compose stack
│   ├── docker-compose.yaml
│   ├── docker-compose-db.yaml
│   ├── docker-compose-init.yaml
│   ├── nginx/
│   └── qdrant-upgrade/
└── helm-chart/                    # Production Helm chart
    ├── Chart.yaml
    ├── values-prod.yaml
    ├── values-sit.yaml
    ├── values-external-db.yaml
    ├── templates/
    └── charts/
```

## Frontend Layout (`Taipei-City-Dashboard-FE/`)

```text
src/
├── main.js                                # Vue + Pinia + Router bootstrap
├── App.vue                                # Root layout, timers, NavBar/SideBar
├── router/
│   ├── index.js                           # Vue Router + guards (auth/admin/mobile)
│   └── axios.js                           # Shared axios instance + interceptors
├── store/                                 # Pinia stores (one per concern)
│   ├── authStore.js
│   ├── contentStore.js                    # Owns dashboards/components state
│   ├── mapStore.js                        # Owns Mapbox/deck.gl state
│   ├── dialogStore.js
│   ├── adminStore.js
│   └── chatStore.js
├── views/                                 # Route-level pages
│   ├── DashboardView.vue
│   ├── MapView.vue
│   ├── ComponentView.vue
│   ├── ComponentInfoView.vue
│   ├── EmbedView.vue
│   ├── CallBack.vue
│   └── admin/                             # Admin-only pages
│       ├── AdminDashboard.vue
│       ├── AdminEditComponent.vue
│       ├── AdminUser.vue
│       ├── AdminContributor.vue
│       ├── AdminIssue.vue
│       └── AdminDisaster.vue
├── components/                            # Reusable UI (non-route)
│   ├── charts/                            # Page-level chart wrappers
│   │   └── HistoryChart.vue
│   ├── map/
│   │   ├── MapContainer.vue
│   │   └── MapPopup.vue
│   ├── dialogs/                           # Modal dialogs
│   │   ├── DialogContainer.vue
│   │   ├── LogIn.vue, ChatBox.vue
│   │   ├── AddComponent.vue, AddEditDashboards.vue, AddViewPoint.vue
│   │   ├── DownloadData.vue, EmbedComponent.vue, FindClosestPoint.vue
│   │   ├── IncidentReport.vue, ReportIssue.vue, NotificationBar.vue
│   │   ├── MoreInfo.vue, MobileLayers.vue, MobileNavigation.vue
│   │   ├── InitialWarning.vue, UserSettings.vue
│   │   ├── ContributorInfo.vue, ContributorsList.vue
│   │   └── admin/                         # Admin CRUD dialogs
│   ├── icons/                             # Custom SVG icon Vue components
│   └── utilities/
│       ├── bars/                          # NavBar / SideBar / SettingsBar / ComponentSideBar / AdminSideBar
│       ├── forms/                         # Reusable form widgets
│       └── miscellaneous/                 # Tabs, tags, links
├── dashboardComponent/                    # Self-contained chart-widget package
│   ├── DashboardComponent.vue             # Polymorphic chart container
│   ├── components/                        # ~20 *Chart.vue files (BarChart, DonutChart, …)
│   ├── utilities/                         # chartTypes.ts, cityManager.ts, dataTimeframe.ts, …
│   ├── styles/                            # chartStyles.css, toggleswitch.css
│   ├── assets/                            # SVG thumbnails for each chart type
│   └── LICENSE
├── make-new-thing-here/                   # Sandbox panel injected into MapView
│   ├── MakeNewThingHerePanel.vue
│   └── README.md
├── directives/
│   └── horizontalWheel.js                 # Custom v-horizontal-wheel directive
└── assets/
    ├── configs/
    │   ├── AllIcons.js, AllTimes.js
    │   ├── apexcharts/chartTypes.js
    │   └── mapbox/                        # mapConfig.js, mapStyle.{js,json}, arcAnimate.js, savedLocations.js
    ├── images/                            # Logos
    ├── styles/                            # globalStyles.css, chartStyles.css, toggleswitch.css
    └── utilityFunctions/                  # Pure helpers (geometry, color, validate, …)

public/                                    # Vite static directory
├── images/, js/, mapData/                 # Pre-baked GeoJSON / images / JS shims
├── manifest.json, robots.txt
└── logo.{png,svg,ico}, bitmap.png
```

## Backend Layout (`Taipei-City-Dashboard-BE/`)

```text
main.go                                    # `func main` → cmd.Execute
cmd/
└── root.go                                # Cobra: serve (default), migrateDB, initDashboard
app/
├── app.go                                 # StartApplication: connect DBs, build Gin, serve
├── routes/
│   └── router.go                          # All /api/v1 route groups + per-group middleware
├── middleware/
│   ├── auth.go                            # ValidateJWT, IsLoggedIn, IsSysAdm
│   ├── rateLimit.go                       # LimitAPIRequests, LimitTotalRequests (Redis)
│   ├── common.go                          # AddCommonHeaders
│   └── sanitizeXForwardedFor.go
├── controllers/                           # One file per resource
│   ├── auth.go, user.go, isso.go
│   ├── dashboard.go, componentConfig.go, componentData.go
│   ├── viewPoints.go, contributor.go
│   ├── issue.go, incident.go
│   ├── chatlog.go, ai.go, qdrant.go
│   ├── websocket.go, writemap.go          # currently unused (commented in router)
├── models/                                # GORM models + queries
│   ├── database.go                        # DBManager / DBDashboard handles
│   ├── auth.go, user.go
│   ├── dashboard.go, componentConfig.go, componentData.go
│   ├── viewPoints.go, contributor.go
│   ├── issue.go, incident.go
│   ├── chatlog.go, ai.go, qdrant.go
├── services/                              # Cross-controller / external integrations
│   ├── qdrant.go
│   └── ai/
│       ├── ai_service.go
│       ├── providers/twcc/                # Taiwan Computing Cloud LLM
│       └── tools/registry.go              # Tool-calling registry
├── cache/
│   └── redis.go                           # Redis connect/close + helpers
├── initial/
│   ├── initial.go                         # Schema/sample-data init
│   └── cron.go                            # Scheduled jobs at boot
└── util/
    ├── auth.go                            # JWT helpers, GetUserInfoFromContext
    ├── user.go                            # GetPermissionAllGroupIDs
    └── common.go                          # GetTime, etc.
global/
├── global.go                              # Env-driven runtime config + singletons
└── consts.go                              # Rate-limit numbers, durations, version
logs/
└── logs.go                                # Logger (Info, FInfo, FWarn, FError)
```

## Data Engineering Layout (`Taipei-City-Dashboard-DE/`)

```text
dags/
├── operators/
│   └── common_pipeline.py                 # CommonDag factory used by every project DAG
├── proj_city_dashboard/                   # 150+ DAGs, one dir per data source
│   └── D010501/
│       ├── D010501.py                     # _D010501(**kwargs) Extract/Transform/Load
│       ├── __init__.py
│       └── job_config.json                # Schedule, table names, retries
├── proj_new_taipei_city_dashboard/        # Sister project (~19 DAGs)
├── common_dags/
│   ├── clean_log_and_metadata/
│   ├── housekeeping_tables/
│   └── spatial_area_mapping/
├── utils/                                 # Shared ETL helpers
│   ├── extract_stage.py, load_stage.py
│   ├── transform_address.py, transform_geometry.py, transform_mixed_type.py, transform_time.py
│   ├── auth_cht.py, auth_tdx.py
│   ├── housekeeping.py
│   ├── get_time.py
│   ├── generate_sql_to_create_DB_table.py
│   ├── opendata/, preprocess/
├── settings/
│   ├── global_config.py                   # DAG_PATH, DATA_PATH, PROXIES
│   └── __init__.py
├── tutorial/
└── test/
config/
└── airflow.cfg
docker/
cicd/
└── add-dags-to-composer.cloudbuild.yaml
```

## Directory Purposes

**`Taipei-City-Dashboard-FE/src/views/`:**
- Purpose: Route-level pages mounted by `vue-router`
- Naming: PascalCase ending in `View.vue`; admin pages under `admin/` prefixed `Admin`

**`Taipei-City-Dashboard-FE/src/store/`:**
- Purpose: Pinia stores; one file per concern
- Key files: `contentStore.js` (dashboards/components), `mapStore.js` (map), `authStore.js` (JWT/user)

**`Taipei-City-Dashboard-FE/src/components/`:**
- Purpose: Non-route reusable Vue components
- Structure: `charts/`, `map/`, `dialogs/`, `icons/`, `utilities/{bars,forms,miscellaneous}/`

**`Taipei-City-Dashboard-FE/src/dashboardComponent/`:**
- Purpose: Self-contained chart-widget package (own LICENSE, own utilities, own styles, own assets). Treat as an internal library imported by views.

**`Taipei-City-Dashboard-FE/src/assets/`:**
- Purpose: Configs, images, CSS, pure helpers (no Vue components)
- `configs/mapbox/` and `configs/apexcharts/` hold third-party-specific config

**`Taipei-City-Dashboard-FE/public/`:**
- Purpose: Static files copied verbatim by Vite
- Notable: `public/mapData/` ships pre-baked GeoJSON

**`Taipei-City-Dashboard-BE/cmd/`:**
- Purpose: Cobra subcommands. Add new admin/ops commands here.

**`Taipei-City-Dashboard-BE/app/controllers/`:**
- Purpose: HTTP handlers. One file per resource. Functions are exported (PascalCase) and referenced by `routes/router.go`.

**`Taipei-City-Dashboard-BE/app/models/`:**
- Purpose: GORM types + DB queries. Mirrors `controllers/` 1:1 (`controllers/dashboard.go` → `models/dashboard.go`).

**`Taipei-City-Dashboard-BE/app/services/`:**
- Purpose: Logic that doesn't belong to a single controller (currently AI + Qdrant only).

**`Taipei-City-Dashboard-BE/global/`:**
- Purpose: Process-wide constants and runtime singletons (DB configs, JWT secret, Gin address, ONNX session pointers).

**`Taipei-City-Dashboard-DE/dags/proj_city_dashboard/`:**
- Purpose: One subdirectory per data source. Subdirectory name = D-code identifier matching the public dataset.

**`Taipei-City-Dashboard-DE/dags/utils/`:**
- Purpose: Shared ETL helpers. Import these from a DAG via `from utils.<module> import <func>`.

**`db-sample-data/`:**
- Purpose: SQL dumps loaded by `TaipeiCityDashboardBE initDashboard` to seed a fresh DB.
- Generated: No (committed). Regenerate manually when schema or sample data changes.

**`docker/` and `helm-chart/`:**
- Purpose: Local-stack compose files vs production Kubernetes Helm chart. Separate envs are gated by `values-{prod,sit,external-db}.yaml`.

## Naming Conventions

**Frontend:**
- Vue components: `PascalCase.vue` (`MapContainer.vue`, `DashboardComponent.vue`)
- Stores: `camelCaseStore.js` (`contentStore.js`, `mapStore.js`)
- Composables/utility JS: `camelCase.js` (`getThematicColor.js`, `colorConvert.js`)
- TypeScript helpers (only in `dashboardComponent/utilities/`): `camelCase.ts`
- CSS: `camelCase.css` (`globalStyles.css`)
- Route names: kebab-style strings; component-info uses dashed naming

**Backend:**
- Files: `camelCase.go` (`componentData.go`, `viewPoints.go`)
- Exported funcs/types: `PascalCase` (`GetAllDashboards`, `Dashboard`)
- Unexported: `camelCase` (`configureUserRoutes`)
- Packages: lowercase single word (`controllers`, `models`, `middleware`)
- DB column tags: snake_case via `gorm:"column:..."`
- JSON tags: snake_case (`account_id`, `chart_config`)

**Data Engineering:**
- DAG directories and files: `D` + 6-digit code (`D010501/D010501.py`)
- DAG callables: `_D######(**kwargs)` (leading underscore is the project convention)
- Common helpers: `snake_case.py` modules in `utils/`

**General:**
- Env vars consumed by FE: `VITE_*` (e.g., `VITE_API_URL`, `VITE_PERSONAL_BOARD_UPDATE`)
- Env vars consumed by BE: declared in `global/global.go` (no prefix convention)

## Key File Locations

**Entry points:**
- FE: `Taipei-City-Dashboard-FE/src/main.js`
- BE: `Taipei-City-Dashboard-BE/main.go` → `Taipei-City-Dashboard-BE/cmd/root.go` → `Taipei-City-Dashboard-BE/app/app.go`
- DE: `Taipei-City-Dashboard-DE/dags/proj_city_dashboard/<DCODE>/<DCODE>.py`

**Routing:**
- FE: `Taipei-City-Dashboard-FE/src/router/index.js`
- BE: `Taipei-City-Dashboard-BE/app/routes/router.go`

**HTTP client / API contract:**
- `Taipei-City-Dashboard-FE/src/router/axios.js` (interceptors, env baseURL)

**State (FE):**
- `Taipei-City-Dashboard-FE/src/store/contentStore.js` (dashboards + components)
- `Taipei-City-Dashboard-FE/src/store/mapStore.js` (map)
- `Taipei-City-Dashboard-FE/src/store/authStore.js` (token + user)

**Database (BE):**
- Connection bootstrap: `Taipei-City-Dashboard-BE/app/models/database.go`
- Migration / schema init: `Taipei-City-Dashboard-BE/app/initial/initial.go`
- Sample data SQL: `db-sample-data/dashboard-demo.sql`, `db-sample-data/dashboardmanager-demo.sql`

**Build / Deploy:**
- FE: `Taipei-City-Dashboard-FE/vite.config.js`, `Taipei-City-Dashboard-FE/Dockerfile`, `Taipei-City-Dashboard-FE/nginx.conf.template`
- BE: `Taipei-City-Dashboard-BE/Dockerfile`, `Taipei-City-Dashboard-BE/cloudbuild.yaml`
- Local: `docker/docker-compose.yaml` + `docker/docker-compose-db.yaml` + `docker/docker-compose-init.yaml`
- K8s: `helm-chart/Chart.yaml`, `helm-chart/values-prod.yaml`, `helm-chart/templates/`

## Where to Add New Code

**Add a new chart type (FE):**
1. Drop a `<NewType>Chart.vue` in `Taipei-City-Dashboard-FE/src/dashboardComponent/components/`
2. Add a thumbnail SVG in `Taipei-City-Dashboard-FE/src/dashboardComponent/assets/chart/`
3. Register the type in `Taipei-City-Dashboard-FE/src/dashboardComponent/utilities/chartTypes.ts`
4. Import + add a `v-else-if` branch in `Taipei-City-Dashboard-FE/src/dashboardComponent/DashboardComponent.vue`

**Add a new top-level page / route (FE):**
1. Create `Taipei-City-Dashboard-FE/src/views/<Name>View.vue`
2. Register the route in `Taipei-City-Dashboard-FE/src/router/index.js` (use lazy `() => import(...)` for non-default routes)
3. If the page needs auth, add a check in the existing `router.beforeEach` blocks

**Add a new dialog (FE):**
1. Create `Taipei-City-Dashboard-FE/src/components/dialogs/<Name>.vue`
2. Mount inside `App.vue` (or the relevant view) inside `DialogContainer.vue`
3. Add a key to `dialogStore.dialogs` and call `dialogStore.showDialog("<key>")`

**Add a new map layer behaviour (FE):**
1. Extend `Taipei-City-Dashboard-FE/src/store/mapStore.js` with a new action; do not touch Mapbox/deck.gl directly from views
2. Configs go in `Taipei-City-Dashboard-FE/src/assets/configs/mapbox/`

**Add a new pure helper (FE):**
- General: `Taipei-City-Dashboard-FE/src/assets/utilityFunctions/<name>.js`
- Dashboard-widget-specific: `Taipei-City-Dashboard-FE/src/dashboardComponent/utilities/<name>.ts`

**Add a Pinia store (FE):**
1. Create `Taipei-City-Dashboard-FE/src/store/<concern>Store.js`
2. Export `useXStore = defineStore("x", { state, getters, actions })`
3. Import on demand inside actions/components — no global registration needed

**Add a new REST resource (BE):**
1. Model: `Taipei-City-Dashboard-BE/app/models/<resource>.go` — define struct + GORM tags + query helpers
2. Controller: `Taipei-City-Dashboard-BE/app/controllers/<resource>.go` — implement handlers returning `gin.H{"status":..., "data":...}`
3. Routes: add a `configureXRoutes()` function in `Taipei-City-Dashboard-BE/app/routes/router.go` and call it from `ConfigureRoutes()`
4. Apply rate-limit + auth middleware on the route group
5. If the table is new, add it to `Taipei-City-Dashboard-BE/app/models/database.go` migration list

**Add a new Cobra subcommand (BE):**
1. Define the command in `Taipei-City-Dashboard-BE/cmd/root.go` (`var newCmd = &cobra.Command{...}`)
2. Register in `Execute()` with `rootCmd.AddCommand(newCmd)`
3. Implement the actual work as an exported function in `Taipei-City-Dashboard-BE/app/`

**Add a new external service integration (BE):**
1. Create a package under `Taipei-City-Dashboard-BE/app/services/<name>/`
2. Reuse the AI provider pattern in `services/ai/providers/twcc/` (provider interface + concrete impl)
3. Inject env config in `Taipei-City-Dashboard-BE/global/global.go`

**Add middleware (BE):**
1. New file in `Taipei-City-Dashboard-BE/app/middleware/<name>.go`
2. Apply globally in `app.StartApplication` (`app/app.go`) or per-group in `routes/router.go`

**Add a new ETL DAG (DE):**
1. Make a directory `Taipei-City-Dashboard-DE/dags/proj_city_dashboard/<DCODE>/`
2. Add `<DCODE>.py` exposing `_<DCODE>(**kwargs)` and instantiating `CommonDag(...)` (mirror `D010501.py`)
3. Add `__init__.py` (empty) and `job_config.json` with schedule + table names
4. Reuse helpers from `Taipei-City-Dashboard-DE/dags/utils/`; add a new helper there if logic is shared

**Add seed data:**
- Append SQL to `db-sample-data/dashboard-demo.sql` (statistics) or `db-sample-data/dashboardmanager-demo.sql` (configs/auth)

**Add deploy config:**
- Local: edit the relevant compose file in `docker/`
- Cloud Build (BE): `Taipei-City-Dashboard-BE/cloudbuild.yaml`
- K8s: `helm-chart/templates/` + values files

## Special Directories

**`Taipei-City-Dashboard-FE/src/make-new-thing-here/`:**
- Purpose: Sandbox/feature-injection panel for prototyping new MapView features without touching the BE
- Generated: No
- Committed: Yes
- Note: Recently renamed from `datalab` (see commits `8f6082f`, `a880f9c`, `fc9afb1`)

**`Taipei-City-Dashboard-FE/public/mapData/`:**
- Purpose: Pre-baked GeoJSON shipped with the SPA for layers that do not require live data

**`Taipei-City-Dashboard-BE/logs/`:**
- Purpose: Logger package, not log file output. Runtime logs go to stdout.

**`Taipei-City-Dashboard-BE/global/`:**
- Purpose: Holds module-level globals — DB configs, JWT secret, ONNX runtime singleton. Avoid adding business state here.

**`Taipei-City-Dashboard-DE/dags/tutorial/` and `dags/test/`:**
- Purpose: Examples / scratch DAGs. Do not deploy to prod.

---

*Structure analysis: 2026-05-02*
