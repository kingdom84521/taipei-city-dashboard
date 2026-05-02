# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Shape

Monorepo with three independently deployable subprojects sharing one git tree. They communicate only via PostgreSQL tables (DE → BE) and HTTP JSON (FE → BE) — no shared code.

- `Taipei-City-Dashboard-FE/` — Vue 3 SPA (Vite + Pinia + Mapbox GL + deck.gl + ApexCharts)
- `Taipei-City-Dashboard-BE/` — Go 1.24 / Gin REST API (GORM, two PostgreSQL DBs, Redis, ONNX, Qdrant)
- `Taipei-City-Dashboard-DE/` — Apache Airflow 2.10 ETL (Python + GeoPandas)

Shared infra: `docker/` compose files, `helm-chart/` for K8s, `db-sample-data/` SQL seeds, deeper analysis in `.planning/codebase/`.

## Common Commands

### Frontend (`Taipei-City-Dashboard-FE/`)
```bash
npm ci                    # install
npm run dev               # vite dev server on :80, proxies /api → live citydashboard.taipei
DOCKER_COMPOSE=true npm run dev   # proxy /api/dev → http://dashboard-be:8080/v1 (local BE)
npm run build             # eslint --fix + vite build (lint runs ON build, not as separate gate)
npm run lint              # eslint . --fix only
npm run preview           # serve dist/
```
There is **no `npm test`** — no test framework is configured.

### Backend (`Taipei-City-Dashboard-BE/`)
```bash
go build -v ./...                              # what CI runs
./TaipeiCityDashboardBE                        # default = serve on :8080 (cobra root cmd)
./TaipeiCityDashboardBE migrateDB              # GORM AutoMigrate + sample data
./TaipeiCityDashboardBE initDashboard          # load db-sample-data/dashboard-demo.sql via psql
```
There are **no `*_test.go` files**; `go test ./...` reports no tests for every package.
Note CI pins Go 1.21.x but `go.mod` declares 1.24.4 — local builds need ≥1.24.

### Data Engineering (`Taipei-City-Dashboard-DE/`)
```bash
cd Taipei-City-Dashboard-DE
pytest dags/test/test_housekeeping.py -v       # the only real unit test
```
DAGs are scheduled by Airflow; locally use `docker/docker-compose.yaml`. `dags/test/` and `dags/tutorial/` are excluded from DAG scan via `.airflowignore` — never put test files inside `dags/proj_*/` or the scheduler will load them as DAGs.

### Local stack
```bash
docker network create br_dashboard             # required external network
docker compose -f docker/docker-compose-db.yaml up -d   # postgres x2, redis, qdrant, pgadmin
docker compose -f docker/docker-compose.yaml up -d      # FE + BE
```

## Architecture Big Picture

**Three services, decoupled by data contracts:** FE talks to BE over HTTP; DE writes to the same PostgreSQL that BE reads — there is no DE→BE API call. Renaming a DAG output table without updating BE's `components.query_chart` SQL fragment silently breaks charts.

**Backend (Gin + GORM, layered MVC):**
- Entry chain: `main.go` → `cmd/root.go` (Cobra) → `app/app.go:StartApplication` → `routes/router.go` → controllers → models.
- **Two GORM handles** declared as package-level globals in `app/models/database.go`: `DBManager` (auth, dashboards, components configs, contributors) and `DBDashboard` (statistical fact tables). Cross-DB joins are impossible — controllers fan out two queries when needed.
- `routes.Router` and `routes.RouterGroup` are also package-level globals mutated at boot.
- `services/` only exists for cross-controller / external concerns (AI providers, Qdrant). Most controllers go straight to models.
- `middleware.ValidateJWT` (`app/middleware/auth.go`) is **intentionally permissive**: missing/invalid Authorization header downgrades to a "guest viewer" permission set rather than 401. New endpoints relying on auth must explicitly chain `IsLoggedIn` / `IsSysAdm`.
- Process-wide singletons in `global/global.go`: DB configs, JWT secret, ONNX runtime session (`LMSession` + `LMTokenizer`), Gin engine. Treat as shared mutable state from any handler goroutine.

**Frontend (Vue 3 + Pinia, store-driven):**
- `contentStore.js` is the single owner of dashboards/components and orchestrates the API call sequence (dashboards → components → per-component chart data → optional history). Views are thin.
- `mapStore.js` fully encapsulates Mapbox GL + deck.gl + Three.js. Never touch Mapbox/deck.gl from a view — extend `mapStore` actions instead.
- All HTTP goes through the singleton in `src/router/axios.js`. Response interceptor maps statuses to **Traditional Chinese** toast messages via `dialogStore.showNotification` (401 → forced logout).
- Pinia stores cross-call each other via `useXStore()` **inside actions** (lazy) to avoid module-init cycles.
- `DashboardComponent.vue` is a polymorphic mega-widget: it `v-if`s over ~20 chart types from `src/dashboardComponent/components/`. Adding a chart type means dropping a `*Chart.vue`, registering in `utilities/chartTypes.ts`, and adding the `v-else-if` branch.
- `src/make-new-thing-here/` is a sandbox feature-injection panel: `MapView` short-circuits the BE round-trip when `route.query.index === "make-new-thing-here"` and renders the panel directly. (Recently renamed from `datalab` — see commits `8f6082f`, `a880f9c`.)
- No path aliases — relative imports throughout (`../store/authStore`).

**Data Engineering (Airflow factory pattern):**
- One DAG per data source under `dags/proj_city_dashboard/<DCODE>/<DCODE>.py` plus sibling `job_config.json`. The `_D######(**kwargs)` callable is project convention (leading underscore intentional).
- All DAGs are built by `dags/operators/common_pipeline.py:CommonDag` parameterised by `job_config.json`.
- Reusable ETL helpers in `dags/utils/`: `extract_stage.py`, `load_stage.py`, `transform_*.py`, `auth_tdx.py`, `auth_cht.py`. Imports inside task callables are deliberately function-local to keep DAG parse time low.

## Conventions That Bite

- **Indentation: hard tabs** in JS/Vue/Go (eslint enforces `indent: ["error", "tab"]`; Prettier `useTabs: true, tabWidth: 4`). Mixing in spaces will fail `npm run build`.
- **TUIC file header banner**: long-lived `main.js`, `main.go`, `app/app.go`, `views/*.vue` start with `/* Developed By Taipei Urban Intelligence Center 2023-2024 */` plus a developer/data/UX/testing block. Preserve when editing legacy files. New scaffolded files (e.g. anything under `make-new-thing-here/`) skip it — that's accepted.
- **Inline comments**: newer code uses Traditional Chinese (`vite.config.js`, `mapStore.js`). Match the surrounding file's language.
- **Commit messages**: mixed Chinese verb prefix (`新增` / `修改` / `修正` / `修復` / `重新命名`) for direct commits, English Conventional Commits (`feat:` / `fix:` / `feature:`) for squash-merge PR titles. Subject in imperative present tense; subsystem name explicit (`DAG`, `ETL`, `MapView`).
- **API field names**: snake_case end-to-end (Go `json:"snake_case"` tags ↔ JS consumers). Don't camelCase JSON.
- **No bundler aliases on FE**: relative imports only.
- **`*_test.go`, `*.spec.js`, `*.test.js` are not in CI.** GH Actions only triggers on `main` and only runs `go build` / `npm run build --if-present`. Anything landing on `develop` is gated only by local `npm run build` lint.

## Source-of-Truth Documents

Detailed maps live in `.planning/codebase/` — read these before non-trivial work:
- `STACK.md` — exact dependency versions per subproject
- `ARCHITECTURE.md` — request lifecycles, layer responsibilities, anti-patterns
- `STRUCTURE.md` — directory tree + "where to add X" recipes for new chart / route / dialog / REST resource / DAG
- `CONVENTIONS.md` — full lint/format/naming/import rules
- `TESTING.md` — current (lack of) test coverage and recommended test layout if adding any
- `INTEGRATIONS.md` — TaipeiPass ISSO, TWCC AI, Qdrant, TDX, CHT auth flows
- `CONCERNS.md` — known tech debt, fragile areas, security smells

When CLAUDE.md and `.planning/codebase/` disagree, trust `.planning/codebase/` (regenerated more often) and update CLAUDE.md.
