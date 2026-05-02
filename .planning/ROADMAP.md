---
project: taipei-city-dashboard
milestone: v2.3
generated: 2026-05-03
phase_count: 3
---

# Roadmap — Milestone v2.3 (Cross-Compare Hexbin Heatmap)

**3 phases** | **6 requirements mapped** | All v2.3 requirements covered ✓

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | BE Hex Region API | PostGIS-backed table + endpoint serving GeoJSON hex regions with scores | CC-05, CC-06 | 4 |
| 2 | FE Cross-Compare Page | New `/crosscompare` route, NavBar entry, hexbin render with view toggle and grey-out | CC-01, CC-02, CC-03 | 4 |
| 3 | Hover Interaction & Polish | Levitate animation + popup; remove `make-new-thing-here` injection slot | CC-04 | 3 |

## Phase Details

### Phase 1: BE Hex Region API

**Goal:** Stand up a PostGIS-backed table for hex regions and a JSON endpoint that returns GeoJSON ready for FE rendering.

**Requirements:** CC-05, CC-06

**Success criteria:**
1. `curl http://localhost:8088/api/v1/crosscompare/hex?view=taipei` returns HTTP 200 with valid GeoJSON `FeatureCollection` (verifiable via `jq`)
2. Same endpoint with `view=metrotaipei` returns features covering both 台北市 and 新北市
3. Each feature has properties `region_id`, `region_name`, `city`, `score` (number) — schema enforced
4. `db-sample-data/crosscompare_hex.sql` is idempotent — can be re-run without duplicating rows; loads ≥10 hex regions per city as fake fixture data

**Touches:**
- New: `Taipei-City-Dashboard-BE/app/models/crosscompareHex.go` (GORM model with `geom` PostGIS column)
- New: `Taipei-City-Dashboard-BE/app/controllers/crosscompare.go` (handler + city whitelist)
- Edit: `Taipei-City-Dashboard-BE/app/routes/router.go` — register `/crosscompare` group with rate-limit middleware
- Edit: `Taipei-City-Dashboard-BE/app/initial/initial.go` — add table to AutoMigrate list
- New: `db-sample-data/crosscompare_hex.sql` — fake fixture
- Verify: `postgres-data` already has PostGIS extension (yes — uses `postgis/postgis:16-3.4-alpine` image)

---

### Phase 2: FE Cross-Compare Page

**Goal:** Wire a new top-level `/crosscompare` route, render hexbin polygons coloured by score, and add a working 台北 / 雙北 toggle with grey-out semantics — using only installed packages.

**Requirements:** CC-01, CC-02, CC-03

**Success criteria:**
1. Visiting `http://localhost:8080/crosscompare` resolves a new view (no 404, no MapView fallback) and shows a Mapbox base map centred on 雙北
2. NavBar shows a new entry that navigates to `/crosscompare`
3. Toggle between "台北" and "雙北" updates the visible/enabled hex set within < 200ms; greyed hexes use a desaturated colour at reduced opacity
4. Hex fill colours map monotonically from low → high score using a sequential colour ramp readable on the dark map theme; coverage matches the BE feature payload

**Touches:**
- New: `Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` (top-level view)
- New: `Taipei-City-Dashboard-FE/src/store/crossCompareStore.js` (Pinia store: fetched features, current view, derived enabled set)
- New: `Taipei-City-Dashboard-FE/src/components/crosscompare/HexLayerToggle.vue` (toggle UI)
- Edit: `Taipei-City-Dashboard-FE/src/router/index.js` — add route entry; ensure mobile guard list updated if needed
- Edit: `Taipei-City-Dashboard-FE/src/components/utilities/bars/NavBar.vue` — new `<router-link to="/crosscompare">` entry
- Use only: `mapbox-gl@3.x`, `@deck.gl/{core,layers,mapbox}@9.x`, `@turf/turf@6.5` (for centroid / bbox helpers if needed)
- Forbidden: `@deck.gl/aggregation-layers`, `d3-hexbin`, `h3-js`, any new npm install

---

### Phase 3: Hover Interaction & Polish

**Goal:** Add the levitate hover animation + popup, remove the deprecated `make-new-thing-here` injection slot now that the real route exists.

**Requirements:** CC-04

**Success criteria:**
1. Hovering an enabled hex animates a visible elevation lift (deck.gl `getElevation` + `transitions: { getElevation: 200 }`) and renders a popup at cursor position showing region name + score
2. Hovering a disabled hex (the greyed-out side in 台北 view) does nothing — no animation, no popup
3. The `make-new-thing-here` injection slot in `MapView.vue` is removed; the `Taipei-City-Dashboard-FE/src/make-new-thing-here/` directory is deleted; the SideBar link to `/mapview?index=make-new-thing-here` is removed; running `grep -r "make-new-thing-here" src/` returns zero matches

**Touches:**
- Edit: `src/views/CrossCompareView.vue` (or extracted layer module) — hover handler + extrusion update triggers
- New / Edit: `src/components/crosscompare/HexPopup.vue` — popup visual
- Edit: `Taipei-City-Dashboard-FE/src/views/MapView.vue` — remove the `index === "make-new-thing-here"` short-circuit branch
- Delete: `Taipei-City-Dashboard-FE/src/make-new-thing-here/`
- Edit: `Taipei-City-Dashboard-FE/src/components/utilities/bars/SideBar.vue` line 163 — remove the synthetic-index link
- Verify: `npm run build` passes; no new ESLint warnings

---

## Coverage Validation

| REQ-ID | Description | Phase |
|--------|-------------|-------|
| CC-01 | Navigate to `/crosscompare` from NavBar | Phase 2 |
| CC-02 | Toggle 台北 ↔ 雙北 with grey-out | Phase 2 |
| CC-03 | Hexbin render with score-colored fill | Phase 2 |
| CC-04 | Hover levitate + popup | Phase 3 |
| CC-05 | BE GeoJSON endpoint | Phase 1 |
| CC-06 | PostGIS table + fixture | Phase 1 |

✓ 6/6 requirements mapped, 0 unmapped, 0 phases without requirements.

## Dependencies

```
Phase 1 (BE) ──→ Phase 2 (FE) ──→ Phase 3 (Polish)
```

Phase 2 needs the BE endpoint working to fetch features. Phase 3 polishes Phase 2 output, so it must run after.

## Risks

- **PostGIS extension assumed enabled** — `postgres-data` uses the `postgis/postgis:16-3.4-alpine` image, but new schemas may need `CREATE EXTENSION postgis;` if the public schema doesn't already have it. Phase 1 should verify and `CREATE EXTENSION IF NOT EXISTS postgis;` in the fixture.
- **deck.gl extrusion without aggregation-layers** — `PolygonLayer` supports `extruded: true` + `getElevation`; verified in deck.gl 9 docs. Confirm during Phase 2.
- **Colour ramp on dark theme** — existing `chartTypes.ts` has palette helpers; reuse rather than invent.
- **Removal of `make-new-thing-here` in Phase 3** — confirm with user before delete; the directory has its own README and was scaffolded recently.
