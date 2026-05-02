---
project: taipei-city-dashboard
milestone: v2.3
generated: 2026-05-03
last_updated: 2026-05-03
phase_count: 3
---

# Roadmap — Milestone v2.3 (Cross-Compare District Score Heatmap)

> **Scope correction (2026-05-03):** Initial roadmap planned a PostGIS hex grid
> table + GeoJSON endpoint. After real fixture data arrived, the actual
> deliverable is a **district choropleth** keyed by `(city, district)` —
> polygons already exist as Mapbox vector tiles (`tp_district`,
> `metrotaipei_town`). Phase 1 is now a flat scores table + JSON endpoint
> (no PostGIS / no GeoJSON). Phases 2 & 3 are largely unchanged in shape but
> reuse existing vector layers instead of fetching hex polygons.

**3 phases** | **6 requirements mapped** | All v2.3 requirements covered ✓

| # | Phase | Goal | REQ-IDs | Success Criteria |
|---|-------|------|---------|------------------|
| 1 | BE District Score API | Flat scores table + endpoint serving the fixture data per `view=` | CC-05, CC-06 | 4 |
| 2 | FE Cross-Compare Page | New `/crosscompare` route + NavBar entry + district choropleth via existing vector tiles + 台北/雙北 toggle with grey-out | CC-01, CC-02, CC-03 | 4 |
| 3 | Hover Interaction & Polish | Levitate animation + popup; remove `make-new-thing-here` injection slot | CC-04 | 3 |

## Phase Details

### Phase 1: BE District Score API

**Goal:** Stand up a flat scores table and a JSON endpoint that returns the v1 fixture, ready for FE join with existing district vector tiles.

**Requirements:** CC-05, CC-06

**Success criteria:**
1. `curl 'http://localhost:8088/api/v1/crosscompare/scores?view=taipei'` returns HTTP 200 with `{status:"success", data:[12 rows]}` matching `taipei_ranked` in the fixture
2. Same endpoint with `view=metrotaipei` returns 41 rows matching `all_districts_ranked`
3. Each row has all 11 numeric/string fields (city, district, rank, courses, food_businesses, inspected, not_inspected, inspection_rate, course_score, inspection_score, total_score) — schema enforced by GORM struct tags
4. `db-sample-data/crosscompare_district_score.sql` is idempotent — re-runnable without dup rows; loads the 41 fixture rows verbatim

**Touches:**
- New: `Taipei-City-Dashboard-BE/app/models/crosscompareDistrictScore.go` (GORM model — plain table, **no PostGIS**)
- New: `Taipei-City-Dashboard-BE/app/controllers/crosscompare.go` (handler + city whitelist)
- Edit: `Taipei-City-Dashboard-BE/app/routes/router.go` — register `/crosscompare` group with rate-limit middleware (mirror `/dashboard` group)
- Edit: `Taipei-City-Dashboard-BE/app/initial/initial.go` — add table to AutoMigrate list
- New: `db-sample-data/crosscompare_district_score.sql` — fixture loader (generated from `.planning/fixtures/crosscompare_scores_v1.json`)
- Verify: BE serves both `?view=taipei` (12 rows) and `?view=metrotaipei` (41 rows) without auth

---

### Phase 2: FE Cross-Compare Page

**Goal:** Wire a new top-level `/crosscompare` route that renders district polygons coloured by `total_score`, using the existing `tp_district` and `metrotaipei_town` Mapbox source layers — and add a working 台北 / 雙北 toggle with grey-out semantics. Zero new packages.

**Requirements:** CC-01, CC-02, CC-03

**Success criteria:**
1. Visiting `http://localhost:8080/crosscompare` resolves a new view (no 404, no MapView fallback) and shows a Mapbox base map centred on 雙北
2. NavBar shows a new entry that navigates to `/crosscompare`
3. Toggle between "台北" and "雙北" updates the visible/enabled district set within < 200ms; greyed districts use a desaturated colour at reduced opacity and `interactive: false`
4. District fills follow a sequential colour ramp on `total_score`: highest scoring (中正區=63.88) is the brightest band; lowest (萬華區=10.62) the dimmest. Colour ramp readable on the existing dark map theme. Coverage matches the BE feature payload (12 / 41 districts).

**Touches:**
- New: `Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` (top-level view)
- New: `Taipei-City-Dashboard-FE/src/store/crossCompareStore.js` (Pinia store: fetched scores, current view, derived enabled/disabled district name sets)
- New: `Taipei-City-Dashboard-FE/src/components/crosscompare/HexLayerToggle.vue` (toggle UI — name kept generic; can be `ViewToggle.vue`)
- Edit: `Taipei-City-Dashboard-FE/src/router/index.js` — add `/crosscompare` route entry; ensure mobile guard list updated if needed
- Edit: `Taipei-City-Dashboard-FE/src/components/utilities/bars/NavBar.vue` — new `<router-link to="/crosscompare">` entry
- Render approach: reuse `tp_district` + `metrotaipei_town` vector layers via Mapbox `fill` paint expressions (`['match', ['get', 'district_name'], ...colorStops, fallbackColor]`) — exact property name to be confirmed in Phase 2 plan by inspecting source layers
- Use only: `mapbox-gl@3.x`, `@deck.gl/{core,layers,mapbox}@9.x`, `@turf/turf@6.5` (only if needed for centroid lookup of popup positioning)
- Forbidden: `@deck.gl/aggregation-layers`, `d3-hexbin`, `h3-js`, any new npm install

**Plans:** 6 plans
- [ ] 02-01-routing-shell-PLAN.md — Routing + NavBar entry + CrossCompareView scaffold (CC-01)
- [ ] 02-02-store-PLAN.md — Pinia crossCompareStore: fetch + viewMode persistence + whitelist (CC-02)
- [ ] 02-03-config-PLAN.md — crossCompareConfig: ramp/source/join-key constants + paint builders (CC-02, CC-03)
- [ ] 02-04-mapbox-fill-PLAN.md — Mount Mapbox + fill layers + promoteId seam (CC-03)
- [ ] 02-05-toggle-legend-PLAN.md — ViewToggle + RampLegend + wire into view (CC-02)
- [ ] 02-06-acceptance-PLAN.md — Build / lint / smoke / SUMMARY (CC-01, CC-02, CC-03)

---

### Phase 3: Hover Interaction & Polish

**Goal:** Add the levitate hover animation + popup, remove the deprecated `make-new-thing-here` injection slot now that the real route exists.

**Requirements:** CC-04

**Success criteria:**
1. Hovering an enabled district animates a visible elevation lift (transition < 200ms — implementation either via deck.gl `PolygonLayer` `extruded:true` + `getElevation` + `transitions`, OR Mapbox `setFeatureState({hover:true})` driving a `fill-extrusion-height` paint expression) and renders a popup at cursor showing district name + total_score + rank + per-component scores (course_score / inspection_score)
2. Hovering a disabled district (greyed-out side in 台北 view) does nothing — no animation, no popup, no cursor change
3. The `make-new-thing-here` injection slot is removed: short-circuit branch in `MapView.vue` deleted; `Taipei-City-Dashboard-FE/src/make-new-thing-here/` directory deleted; `SideBar.vue` link to `/mapview?index=make-new-thing-here` removed; `grep -r "make-new-thing-here" Taipei-City-Dashboard-FE/src/` returns zero matches

**Touches:**
- Edit: `src/views/CrossCompareView.vue` (or extracted layer module) — hover handler + extrusion update triggers
- New / Edit: `src/components/crosscompare/DistrictPopup.vue` — popup visual (rename of original `HexPopup` plan)
- Edit: `Taipei-City-Dashboard-FE/src/views/MapView.vue` — remove the `index === "make-new-thing-here"` short-circuit branch (lines around the synthetic-index check)
- Delete: `Taipei-City-Dashboard-FE/src/make-new-thing-here/`
- Edit: `Taipei-City-Dashboard-FE/src/components/utilities/bars/SideBar.vue` line 163 — remove the synthetic-index `to="/mapview?index=make-new-thing-here"` link
- Verify: `npm run build` passes; no new ESLint warnings

---

## Coverage Validation

| REQ-ID | Description | Phase |
|--------|-------------|-------|
| CC-01 | Navigate to `/crosscompare` from NavBar | Phase 2 |
| CC-02 | Toggle 台北 ↔ 雙北 with grey-out | Phase 2 |
| CC-03 | District choropleth via existing vector tiles | Phase 2 |
| CC-04 | Hover levitate + popup | Phase 3 |
| CC-05 | BE scores endpoint | Phase 1 |
| CC-06 | BE scores table + fixture | Phase 1 |

✓ 6/6 requirements mapped, 0 unmapped, 0 phases without requirements.

## Dependencies

```
Phase 1 (BE) ──→ Phase 2 (FE) ──→ Phase 3 (Polish)
```

Phase 2 needs the BE endpoint working to fetch scores. Phase 3 polishes Phase 2 output.

## Risks

- **District-name property name in vector tiles** — `tp_district` and `metrotaipei_town` source layers' join key may be `name`, `TOWNNAME`, `district_name`, or similar. Phase 2 plan must inspect the actual property in dev tools / Mapbox Studio before writing the `match` expression.
- **臺 vs 台 character variant** — Fixture uses `臺北市` (full form); some upstream sources may use `台北市` (simplified form). Joins must canonicalise.
- **Hover via Mapbox feature-state vs deck.gl extrusion** — Both viable; Phase 3 plan picks one based on smoothness of the levitate transition. Mapbox-native is lower overhead; deck.gl gives smoother eased transitions.
- **Removal of `make-new-thing-here` in Phase 3** — Confirm with user before delete; the directory has its own README and was scaffolded recently. (Inherited risk from prior roadmap.)
