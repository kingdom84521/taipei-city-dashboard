# Phase 2: FE Cross-Compare Page - Context

**Gathered:** 2026-05-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a new top-level Vue route `/crosscompare` that fetches the BE district scores endpoint and renders a district choropleth on a map, with a 台北 / 雙北 view toggle and grey-out semantics for non-active districts. Phase 2 lays the rendering substrate (fill layer, view-mode toggle, store, route, NavBar entry). Hover/levitate animation and popups are explicitly Phase 3 — Phase 2 leaves clean seams for that work.

**In scope (REQ-IDs):** CC-01, CC-02, CC-03
**Not in scope:** Hover animation, popup, removal of `make-new-thing-here` (all Phase 3)

</domain>

<decisions>
## Implementation Decisions

### Render & Hover Substrate
- **D-01:** Mapbox-native rendering. Add new `type: "fill"` layers (one per source: `tp_district`, `metrotaipei_town`) keyed off the existing vector tile sources. Colour comes from a `match` / `interpolate-hcl` paint expression on `total_score`. **Forbidden:** new deck.gl layers for the choropleth body — `@deck.gl/geo-layers` is not installed and we do not add packages.
- **D-02:** Phase 3 hover will reuse THIS layer by adding `type: "fill-extrusion"` companion layers driven by Mapbox `feature-state` (`fill-extrusion-height` interpolated from `feature-state.hover`). Phase 2 must therefore expose features to the JS side via stable feature ids — set `promoteId` on the source descriptor (or fall back to `feature-state` keyed on `[get, <district-prop>]`) so Phase 3 can call `setFeatureState` without re-architecting.
- **D-03:** Greyed districts get a SECOND fill layer (or a paint-expression branch) that wins via Mapbox `filter` on the disabled district set, so toggling 台北 ↔ 雙北 is a one-shot `setFilter` call — not a teardown / rebuild.

### Map Instance & Store Architecture
- **D-04:** `CrossCompareView.vue` instantiates its OWN `mapboxgl.Map` instance (no reuse of the singleton in `mapStore.js`). The existing `mapStore` is dashboard-coupled (manages chart-component layers, popup state, the deck.gl overlay) and pulling cross-compare into it would pollute a critical store.
- **D-05:** New Pinia store `crossCompareStore.js` owns: fetched scores, current `viewMode` (`'taipei' | 'metrotaipei'`), derived `enabledDistricts` Set, derived `disabledDistricts` Set, ramp domain `[min, max]` derived from scores. View consumes the store; the store does NOT touch Mapbox — the view holds the map instance.
- **D-06:** Map style: reuse the existing `Taipei-City-Dashboard-FE/src/assets/configs/mapbox/mapStyle.js` (default-export object — same module `mapStore.js` line 44 already consumes). There is **no** `dark_map_style.json` file in the repo; an earlier draft of this CONTEXT named one — it does not exist. Use `import mapStyle from "../assets/configs/mapbox/mapStyle"`. Initial center/zoom: roughly 雙北 bbox (center ≈ `[121.55, 25.07]`, zoom ≈ `9.5`).

### Page Chrome
- **D-07:** Map fills the viewport (full-bleed under NavBar). No sidebar, no top header bar. Matches existing `MapView` aesthetic and PROJECT.md "map-first" core value.
- **D-08:** Floating UI elements only:
  - **Top-left:** view toggle (`台北 / 雙北`) — pill-style switcher
  - **Bottom-right:** colour-ramp legend — gradient strip with min/max numeric labels (e.g. `10.6 — 63.9`) and an axis label `total_score`
- **D-09:** Persist last-selected `viewMode` in `localStorage` under key `crossCompare.viewMode`. Default on first load (no saved value) = `metrotaipei` (richer 41-district view).

### Colour Ramp & Greyed-out
- **D-10:** Sequential single-hue ramp interpolated via `interpolate-hcl` (Mapbox expression) on `total_score`. Stops anchored at the actual fixture range:
  - Low end: `#1a3a3f` (deep desaturated teal — readable but muted on the dark base)
  - High end: `#5dffe6` (bright cyan — pops on dark theme)
  - Domain: `[10.62, 63.88]` from fixture; treat as runtime-computed from `Math.min/Math.max` over fetched scores so future data shifts don't break the legend
- **D-11:** Greyed districts: flat fill `#3a3a3a` at `0.35` opacity. Border line: muted `#555555`. Layer-level `interactive: false` (or — since Mapbox vector layers don't expose that flag the same way as deck.gl, use a Vue-level guard in the hover handler that no-ops when the feature's district name is in `disabledDistricts`). Phase 3 hover MUST honour this.
- **D-12:** Toggle transition between modes is INSTANT in Phase 2 (`setFilter` swap, paint-expression refresh). No fade/animation choreography. If smoothness becomes a problem in user testing, Phase 3 may add a CSS-driven cross-fade — not committed here.

### District Join Key & 臺/台 Normalization
- **D-13:** **Property name on `tp_district` and `metrotaipei_town` source layers is `TNAME`** — confirmed by reading `mapConfig.js` lines 55 and 89 where the existing label layers already render district names via `["get", "TNAME"]` against both source layers. PATTERNS.md elevates this from "must discover" to "strongly confirmed". Plan still includes a runtime assertion task that calls `map.querySourceFeatures(sourceId, { sourceLayer })` after `style.load` and logs a warning if `TNAME` is missing, but treat `TNAME` as the join key for paint expressions on first write — do NOT block on discovery.
- **D-14:** Implement a `normalizeDistrictKey(city, name)` helper that canonicalises 臺 ↔ 台 (and any whitespace variants) before joining BE rows to vector tile features. Apply on BOTH sides at lookup time. Live in `Taipei-City-Dashboard-FE/src/utilities/crossCompare.js` (or `crossCompareConfig.js`). The fixture uses 臺北市/新北市; vector tiles may use either — normalize defensively.

### File Layout
- **D-15:** Files Phase 2 creates (matches ROADMAP touches with one rename):
  - `src/views/CrossCompareView.vue` (new view, holds map instance)
  - `src/store/crossCompareStore.js` (new Pinia store)
  - `src/components/crosscompare/ViewToggle.vue` (renamed from `HexLayerToggle.vue` — no longer hex)
  - `src/components/crosscompare/RampLegend.vue` (new, floating colour-ramp legend)
  - `src/assets/configs/crossCompareConfig.js` (new — colour stops, source ids, join-key constant once discovered, normalizer)
  - Edit: `src/router/index.js` — add `/crosscompare` route entry
  - Edit: `src/components/utilities/bars/NavBar.vue` — new `<router-link to="/crosscompare">` entry between `/dashboard` and `/mapview`
- **D-16:** **Do NOT touch** `mapStore.js`, `mapConfig.js` (the existing line layers stay untouched — fill layers are added at runtime by CrossCompareView, not registered globally). This preserves dashboard / mapview behaviour exactly.

### Network & Data Flow
- **D-17:** Use the existing axios singleton (`src/router/axios.js`) — the response interceptor already maps statuses to Traditional Chinese toasts. New endpoint path: `/crosscompare/scores?view=...`. Auth: none required (BE Phase 1 made it public-readable; mirror that — do NOT add `IsLoggedIn` guard on the FE side either).
- **D-18:** On view-mode toggle, do NOT refetch from BE. Phase 1 already returns 41 rows for `view=metrotaipei`; the 12-row Taipei view is a CLIENT-SIDE filter on `city === '臺北市'`. Single fetch on mount; toggle is purely an `enabledDistricts` Set swap and a Mapbox `setFilter` call.

- **D-19 (added 2026-05-03 from PATTERNS.md):** **Single source layer for both modes** — PATTERNS.md found that `tp_district` has no localhost geojson fallback in `mapStore.js` (only `metrotaipei_town` does, plus a TMS-vector-tile branch for prod). Implication: do NOT add two separate fill layers (one per source). Instead, render ALL 41 districts via the SINGLE `metrotaipei_town` source layer on both modes, and use `setFilter(['in', ['get', 'TNAME'], ['literal', enabledDistrictNames]])` to swap which districts are coloured vs greyed. This collapses Phase 2 from "two fill layers + two grey layers" to "one fill layer for active + one fill layer for greyed", both keyed off `metrotaipei_town`. The fixture's 12 臺北市 districts ARE present in `metrotaipei_town` (it covers 雙北 = 41 districts).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/PROJECT.md` — overall project + v2.3 milestone framing, Out-of-Scope list, Key Decisions table
- `.planning/REQUIREMENTS.md` — CC-01..CC-06 requirement text, traceability, acceptance
- `.planning/ROADMAP.md` §"Phase 2" — Touches list, Forbidden packages, success criteria
- `.planning/STATE.md` — Phase 1 status, pending-todos list (vector tile property name + 臺/台)
- `.planning/fixtures/crosscompare_scores_v1.json` — score range, district names exactly as BE will return them

### Phase 1 (BE) — locked contract this phase consumes
- `Taipei-City-Dashboard-BE/app/controllers/crosscompare.go` — endpoint behavior, view whitelist
- `Taipei-City-Dashboard-BE/app/models/crosscompareDistrictScore.go` — row shape
- `db-sample-data/crosscompare_district_score.sql` — seeded data

### Codebase patterns to follow
- `.planning/codebase/STRUCTURE.md` — "where to add a new view / route / store" recipes
- `.planning/codebase/CONVENTIONS.md` — hard-tab indent, snake_case JSON, relative imports, TUIC banner rules
- `.planning/codebase/ARCHITECTURE.md` §FE — Pinia store boundaries, mapStore singleton role
- `.planning/codebase/CONCERNS.md` — known FE fragilities to avoid replicating

### Existing FE files Phase 2 reads / extends
- `Taipei-City-Dashboard-FE/src/router/index.js` — route registration pattern (DashboardView, MapView are siblings)
- `Taipei-City-Dashboard-FE/src/components/utilities/bars/NavBar.vue` lines 59–82 — `<router-link>` group where new entry goes
- `Taipei-City-Dashboard-FE/src/router/axios.js` — singleton + Traditional Chinese toast interceptor
- `Taipei-City-Dashboard-FE/src/views/MapView.vue` — reference pattern for mounting a Mapbox map inside a view
- `Taipei-City-Dashboard-FE/src/store/mapStore.js` — DO-NOT-TOUCH; read only to understand patterns
- `Taipei-City-Dashboard-FE/src/assets/configs/mapbox/mapConfig.js` lines 191–251 — existing `tp_district` (line layer) + `metrotaipei_town` (line layer) + `hasSourceLayer` conditional pattern; the new fill layers must coexist with these
- `Taipei-City-Dashboard-FE/src/assets/configs/mapbox/dark_map_style.json` — base style to load

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`Taipei-City-Dashboard-FE/src/router/axios.js`** — singleton with response interceptor. Use as-is, no new HTTP wrapper.
- **`dark_map_style.json`** — already configured Mapbox dark style; CrossCompareView passes this directly to `mapboxgl.Map({ style: ... })`.
- **`tp_district` / `metrotaipei_town` vector tile sources** — already declared (line layers exist; sources are loaded). New fill layers reuse the same `source` + `source-layer` ids.
- **Pinia store-action pattern** (cross-store calls via `useXStore()` inside actions, lazy) — `crossCompareStore` follows this if it needs auth/dialog stores later.

### Established Patterns
- **Hard tabs in JS/Vue/Go.** ESLint enforces `indent: ["error", "tab"]`. New files MUST use tabs.
- **Relative imports only.** No path aliases. `import { useCrossCompareStore } from "../store/crossCompareStore"`.
- **snake_case JSON end-to-end.** BE returns `total_score`, `course_score`, `inspection_score`, etc. — keep snake_case in store and templates.
- **Traditional Chinese for inline comments in newer code.** `mapStore.js`, `vite.config.js` are TC. Match in new files.
- **TUIC banner header** is for long-lived `views/*.vue` — DO add the banner block to `CrossCompareView.vue` to match `MapView.vue` / `DashboardView.vue`.
- **No path aliases. No `@/...`.** All imports are `../...`.

### Integration Points
- **NavBar** — `<router-link to="/crosscompare">` slots between `/dashboard` and `/mapview` entries (lines 69–82). Label suggestion: `跨區比較` (or whatever matches existing 儀表板總覽 / 地圖交叉比對 wording — final label is a 1-line decision in plan-phase).
- **Router** — `src/router/index.js` line ~38 next to `mapview` entry. No auth guard; mirrors `/dashboard` (public).
- **`make-new-thing-here` short-circuit** — DO NOT TOUCH IT in Phase 2. Phase 3 deletes it. Phase 2 just adds the real route alongside.

</code_context>

<specifics>
## Specific Ideas

- **User direction quoted in PROJECT.md:** "都塞假資料 會亮就好" — visual polish > data fidelity for v1. Phase 2 should optimise for "the choropleth pops on the dark map" feel, not for sub-percent colour-ramp accuracy.
- **Highest-scoring district in fixture:** 中正區 (63.88). Lowest: 萬華區 (10.62). These two MUST land at the visual extremes of the ramp on first render — sanity-check during Phase 2 verification.
- **Top-3 scoring districts** (中正區, 烏來區, 五股區) should be the brightest band per acceptance criterion.

</specifics>

<deferred>
## Deferred Ideas

- **Hover levitate animation + popup** — Phase 3 (CC-04). Phase 2 must leave the seam: stable feature ids via `promoteId` (or equivalent), and the disabled-district guard pattern that Phase 3 hover handler will reuse.
- **Removal of `make-new-thing-here` injection slot** — Phase 3 deletes the directory and removes the SideBar link + MapView short-circuit. Phase 2 leaves it alone.
- **Cross-fade animation between view modes** — defer until user testing reveals the instant `setFilter` swap is jarring. Not committed.
- **Sidebar with ranked-district list** — explicitly rejected as page chrome for Phase 2 (clutter, popup will carry per-district detail). Could surface as a future "compare panel" if the product team wants it.
- **3D extrusion based on score at rest** — out of scope per REQUIREMENTS.md; only hover-triggered lift.
- **Real ETL pipeline for scores** — separate future milestone.
- **Mobile-narrow responsive layout** — out of scope for v2.3.

</deferred>

---

*Phase: 2-FE Cross-Compare Page*
*Context gathered: 2026-05-03*
