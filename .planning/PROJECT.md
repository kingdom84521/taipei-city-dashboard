---
project: taipei-city-dashboard
current_milestone: v2.3
status: planning
created: 2026-05-03
last_updated: 2026-05-03
---

# Taipei City Dashboard

## What This Is

Open-source data visualization platform developed by the Taipei Urban Intelligence Center (TUIC) under the Department of Information Technology, Taipei City Government. Combines statistical and geographical data on a single map-driven dashboard so policymakers and citizens can read the state of the city at a glance.

Codebase is a monorepo of three independently deployable services under one git tree:

- `Taipei-City-Dashboard-FE/` — Vue 3 SPA (Vite + Pinia + Mapbox GL + deck.gl 9 + ApexCharts)
- `Taipei-City-Dashboard-BE/` — Go 1.24 / Gin REST API (GORM, two PostgreSQL DBs, Redis, ONNX, Qdrant)
- `Taipei-City-Dashboard-DE/` — Apache Airflow 2.10 ETL (Python + GeoPandas)

Currently shipping at app version `2.2.0` (Helm chart). Local dev stack is `docker/docker-compose*.yaml`; deeper architecture lives in `.planning/codebase/`.

## Core Value

Make Taipei's open data legible to the people who shape policy — and to the citizens those policies affect — through a single, interactive, map-first dashboard. New visualizations earn their place only if they reveal something a chart alone cannot.

## Current Milestone: v2.3 Cross-Compare Hexbin Heatmap

**Goal:** Add a new top-level page (sibling to `/dashboard` and `/mapview`) that renders a hexbin heatmap of pre-scored regions, supporting two view modes — Taipei-only and dual-Taipei (台北 + 新北) — with hover interactions.

**Target features:**
- New `/crosscompare` route with its own view component, NavBar entry, and route guards (replacing the `make-new-thing-here` synthetic-index hack inside MapView)
- Hexbin heatmap rendered from BE-supplied region polygons + score values (no client-side aggregation)
- Two view modes — when "台北" is active, 新北 hexes render greyed-out and become non-interactive; when "雙北" is active, both render fully
- Hover interaction on enabled hexes: a "levitate" animation (deck.gl extrusion lift / scale) plus a popup showing the region's score
- Stack constraint: **must use only existing FE packages** — `deck.gl/{core,layers,mapbox}` 9.x, `mapbox-gl` 3.x, `@turf/turf` 6.5. Adding `@deck.gl/aggregation-layers`, `d3-hexbin`, or `h3-js` is not allowed.

**Key context:**
- Scoring data is supplied by us (TUIC team) — pre-computed regions + scores, no aggregation logic in this milestone.
- v1 may use fake/seeded scores. Real data feed comes later.
- `make-new-thing-here` (mounted inside MapView via query-string sniffing) was deliberately the wrong design — it bypassed router for prototype convenience. New page must use the real routing pattern (see `Taipei-City-Dashboard-FE/src/router/index.js`).

## Requirements

### Validated (existing capability — confirmed by codebase audit 2026-05-02)

- ✓ **Map-driven dashboard** — Vue 3 SPA renders dashboards composed of ~20 chart types over a Mapbox + deck.gl base map (`Taipei-City-Dashboard-FE/src/views/DashboardView.vue`, `MapView.vue`)
- ✓ **Config-driven components** — Each chart's SQL fragment + `chart_config` lives in the manager DB; renaming an output table without updating config breaks charts silently (`Taipei-City-Dashboard-BE/app/models/componentConfig.go`)
- ✓ **City-scoped data layer** — Same components can be filtered by `city` (`taipei`, `metrotaipei`); see `Taipei-City-Dashboard-FE/src/dashboardComponent/utilities/cityManager.ts`
- ✓ **TaipeiPass ISSO auth** — JWT-based, with permissive guest fallback in `app/middleware/auth.go`
- ✓ **Two-DB split** — `DBManager` (auth, configs) and `DBDashboard` (statistics) declared in `app/models/database.go`; cross-DB joins not possible
- ✓ **Airflow ETL pipelines** — One DAG per data source under `Taipei-City-Dashboard-DE/dags/proj_city_dashboard/<DCODE>/`, all built from `dags/operators/common_pipeline.py:CommonDag`
- ✓ **Local dev stack** — `docker/docker-compose-db.yaml` + `docker-compose-init.yaml` + `docker-compose.yaml` brings up the full system (FE :8080, BE :8088, pgAdmin :8889, postgres ×2, redis, qdrant)
- ✓ **food_inspection / food_hygiene / haccp_course datasets** — recently imported (2026-05-03); rendered through existing chart components

### Active (this milestone — v2.3 hypotheses, validate by shipping)

- [ ] **CC-01**: User can navigate to `/crosscompare` from NavBar and land on a new view
- [ ] **CC-02**: User can switch between "台北" and "雙北" view modes; non-active region greys out and is not hoverable
- [ ] **CC-03**: User sees hexbin polygons coloured by score (sequential color ramp), rendered with deck.gl PolygonLayer/GeoJsonLayer over Mapbox base
- [ ] **CC-04**: User hovers an enabled hex → hex visually "levitates" (extrusion lift / scale) and a popup shows the region name + score
- [ ] **CC-05**: BE serves `GET /api/v1/crosscompare/hex?view=taipei|metrotaipei` returning GeoJSON features (`{ properties: { region_id, region_name, city, score }, geometry: Polygon }`)
- [ ] **CC-06**: BE schema has a hex/region table (PostGIS GEOMETRY column) seeded with at least one valid set of fake regions + scores covering 台北市 and 新北市

### Out of Scope (explicit exclusions for v2.3)

- **Client-side aggregation** — User confirmed BE supplies pre-scored regions; no `@turf/hexGrid` runtime aggregation
- **New npm packages** — `@deck.gl/aggregation-layers`, `d3-hexbin`, `h3-js` are explicitly disallowed
- **3D extrusion based on score value** — Only hover-triggered "levitate" animation is in scope; resting state stays flat (or a tiny constant elevation)
- **Cross-comparison between non-spatial dimensions** — This milestone is one map view per mode, not a multi-chart compare
- **Real scoring algorithm / ETL pipeline** — Scores arrive pre-computed; how they're computed is a separate milestone
- **Mobile-narrow optimisation** — Inherits whatever NavBar already provides; no responsive redesign
- **TaipeiPass-only access** — `/crosscompare` is public-readable like `/dashboard` is

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| New top-level route `/crosscompare` (not synthetic-index hack) | `make-new-thing-here` bypasses router — explicitly called out as wrong design by user. Standard pattern: register in `src/router/index.js`, add `<router-link>` in `src/components/utilities/bars/NavBar.vue` | Pending — implement in Phase 2 |
| BE-side region storage + endpoint, no client aggregation | User will supply scores per region; FE just renders. PostGIS GEOMETRY for hex polygons. Avoids the `@turf/hexGrid` performance concern raised earlier | Pending — implement in Phase 1 |
| Stay on installed deck.gl/turf/mapbox-gl; no new packages | User constraint. Means no `HexagonLayer` / `H3HexagonLayer` — render hexes as plain `PolygonLayer` / `GeoJsonLayer` features and color-map by score property | Pending — verify in Phase 2 |
| Two view modes with grey-out, not side-by-side | User chose "台北 / 雙北" toggle with disabled hex greying instead of dual canvas — cleaner UX, fewer Mapbox instances | Pending — implement in Phase 2 |
| Hover "levitate" animation via deck.gl extrusion transition | Stays within installed deck.gl 9 capabilities (`updateTriggers` + `getElevation` accessor); no extra animation library | Pending — implement in Phase 3 |
| Fake/seeded scores acceptable for v1 | User: "都塞假資料 會亮就好". Scoring algorithm is out of scope this milestone | Accepted |

## Constraints

- **No new FE packages.** Anything not in `Taipei-City-Dashboard-FE/package.json@2.2.0` is off-limits.
- **Hard tabs** in JS/Vue/Go (eslint enforced). `npm run build` runs `eslint . --fix` first.
- **TUIC file-header banner** must be preserved on any edited long-lived file (`main.js`, `views/*.vue` etc.). New scaffolded files may skip it.
- **API field names are snake_case** end-to-end (Go `json:"snake_case"` ↔ JS consumers).
- **Backend has no test framework wired up** — `*_test.go` not in CI. New BE code goes in untested unless we add tests as part of the phase.
- **CI on `main` only** — feature branches landing on `develop` are gated only by local `npm run build` lint.

## Context

- **Repo state (2026-05-03):** branch `develop` clean and in sync with `origin/develop`. Local dev stack running via docker compose (FE :8080, BE :8088, pgAdmin :8889).
- **Recent activity:** food_inspection / food_hygiene / haccp_course datasets imported; CLAUDE.md authored; `.planning/codebase/` mapped via parallel mapper agents.
- **TUIC team:** scores will be supplied by domain experts at TUIC; FE/BE engineering owned by this workstream.

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

*Last updated: 2026-05-03 after initialization*
