# Phase 3: Hover Interaction & Polish - Context

**Gathered:** 2026-05-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Add the levitate hover animation + popup on top of Phase 2's choropleth, and remove the deprecated `make-new-thing-here` injection slot now that the real `/crosscompare` route exists. Last phase of milestone v2.3.

**In scope (REQ-IDs):** CC-04 only.
**Implicit secondary scope:** delete `make-new-thing-here/` and its 5 in-tree references (per ROADMAP success criterion #3).
**Not in scope:** Adding any new chart/sidebar/drill-down panel; refactoring Phase 2 store/config; touching Phase 1 BE.

</domain>

<decisions>
## Implementation Decisions

### Levitate Animation (Mapbox feature-state path — locked from Phase 2 D-02)
- **D-01:** Use Mapbox `setFeatureState({source, sourceLayer, id}, {hover: true|false})` driving a `fill-extrusion-height` paint expression. The seam is already shipped: `promoteId: "TNAME"` on the `metrotaipei_town` source descriptor in `CrossCompareView.vue`. **Forbidden:** deck.gl `PolygonLayer` extrusion (would require `@deck.gl/geo-layers` MVTLayer, which is not installed and can't be added).
- **D-02:** Add a NEW `fill-extrusion` layer (companion to the existing `crosscompare_fill_active` fill layer). Layer id: `crosscompare_extrusion_active`. The existing flat `crosscompare_fill_active` STAYS in place (provides the colour); the new extrusion layer is invisible at rest (`fill-extrusion-height: 0`) and lifts to 4000m when `feature-state.hover === true`. This keeps Phase 2's flat-fill rendering visually identical when nothing is hovered.
- **D-03:** Constant lift height (NOT score-scaled). Resting elevation = 0; hovered elevation = 4000m. Reason: score-scaling would compete with the colour ramp's encoding of the same dimension; constant lift keeps "this district is being inspected" semantically distinct from "this district has a high score". Paint expression:
  ```js
  "fill-extrusion-height": [
    "case",
    ["boolean", ["feature-state", "hover"], false],
    4000,
    0
  ]
  ```
- **D-04:** Transition timing under 200ms — use Mapbox's built-in transition on the paint property: `"fill-extrusion-height-transition": { duration: 150, delay: 0 }`. This satisfies CC-04 acceptance #1 ("transition < 200ms") with margin. Use the default cubic easing (Mapbox doesn't expose easing override per-property).
- **D-05:** Extrusion fill colour during hover = same paint expression as the flat layer (so the lifted district keeps its score-coloured top + sides). Use `fill-extrusion-color` driven by the SAME `interpolate-hcl` expression `crossCompareConfig.buildFillPaint(...)` already exports. Add a `buildExtrusionPaint()` companion in `crossCompareConfig.js` if helpful — or inline the expression in CrossCompareView.

### Popup Design & Positioning (CC-04 spec)
- **D-06:** Popup is a Mapbox `Popup` instance (positioning + close-on-blur for free) whose body is rendered by a NEW Vue SFC `Taipei-City-Dashboard-FE/src/components/crosscompare/DistrictPopup.vue` mounted via `createApp(DistrictPopup, props).mount(div)` into the popup's HTML container. The Vue component gives XSS-safe text interpolation by default (Vue escapes `{{ }}` automatically) and styling control. ROADMAP "Touches" list explicitly names this filename — staying consistent.
- **D-07:** Popup anchor: `anchor: 'bottom'`, positioned at the cursor's `mousemove` lng/lat (NOT at the polygon centroid — irregular district shapes give jittery centroids; cursor-anchor is what users intuitively expect from a hover popup).
- **D-08:** Popup content layout (top-down):
  1. District name (`區名`) — `<h3>` size, e.g. `中正區`
  2. Rank badge (`#N` of 12 or 41 depending on viewMode) — small pill
  3. `total_score` — large numeric, 1-decimal precision (e.g. `63.9`)
  4. Two-row grid: `課程分數 course_score | 抽查分數 inspection_score` — small label + value (1 decimal each)
- **D-09:** Score formatting: `value.toFixed(1)` for all three score fields (total_score, course_score, inspection_score). Rank is integer with `#` prefix. Do NOT show `courses / food_businesses / inspected / not_inspected / inspection_rate` — info overload risks. Future drill-down panel could surface them; defer.
- **D-10:** Popup styling: dark glass panel matching app theme. Use existing CSS variables: `var(--color-component-background)` for background, `var(--color-normal-text)` for body text, `var(--color-highlight)` for the rank badge accent. Reuse the same font-size variables as `RampLegend.vue`.

### Hover Handler Architecture
- **D-11:** Hover handler inlined in `CrossCompareView.vue`'s `<script setup>` (small enough — ~30-50 LOC). Do NOT extract a `useCrossCompareHover.js` composable (premature abstraction; only one consumer). The handler:
  ```js
  let hoveredFeatureId = null;
  let popup = null;
  let popupVm = null;
  function onMouseMove(e) {
    if (!e.features?.length) return;
    const feature = e.features[0];
    const districtName = feature.id;  // promoteId surfaces TNAME as feature.id
    if (store.disabledDistricts.has(districtName)) return;  // D-11 Phase 2 — non-interactive guard
    if (hoveredFeatureId !== districtName) {
      // clear previous, set new
      if (hoveredFeatureId) map.setFeatureState({source, sourceLayer, id: hoveredFeatureId}, {hover: false});
      map.setFeatureState({source, sourceLayer, id: districtName}, {hover: true});
      hoveredFeatureId = districtName;
      // build / move popup
    }
    popup.setLngLat(e.lngLat);  // cursor-anchored
  }
  function onMouseLeave() {
    if (hoveredFeatureId) map.setFeatureState({source, sourceLayer, id: hoveredFeatureId}, {hover: false});
    hoveredFeatureId = null;
    popup?.remove();
    popupVm?.unmount();
  }
  ```
- **D-12:** Bind `mousemove` and `mouseleave` events to the **active fill layer ONLY** — `map.on('mousemove', 'crosscompare_fill_active', handler)`. The greyed fill layer (`crosscompare_fill_greyed`) does NOT get hover handlers — this is the structural enforcement of Phase 2 D-11's "non-interactive when greyed" requirement (no Vue-level guard needed because the events never fire on the greyed layer).
- **D-13:** Cursor: on `mouseenter` of `crosscompare_fill_active`, `map.getCanvas().style.cursor = 'pointer'`. On `mouseleave`, restore to `''`. No additional outline halo — extrusion lift is sufficient visual feedback (avoids over-designing a polish phase).
- **D-14:** Cleanup: `onBeforeUnmount` (already present from Phase 2) MUST also call `popup?.remove()` and `popupVm?.unmount()` to avoid Vue/WebGL leaks. Add to the existing teardown block.

### make-new-thing-here Removal (CC-04 acceptance #3)
- **D-15:** Delete the entire `Taipei-City-Dashboard-FE/src/make-new-thing-here/` directory (2 files: `MakeNewThingHerePanel.vue`, `README.md`). The README's historical context (the synthetic-index hack rationale) is preserved in the deletion commit message body so `git log --follow` retains archaeology.
- **D-16:** Edit `Taipei-City-Dashboard-FE/src/views/MapView.vue` — remove three lines: line 24 import, line 26 `isMakeNewThingHere` computed, lines around 147-153 the `<template>` `v-if="isMakeNewThingHere"` branch + `<MakeNewThingHerePanel />` slot. Remove the surrounding HTML comment too.
- **D-17:** Edit `Taipei-City-Dashboard-FE/src/components/utilities/bars/SideBar.vue` line 163 — remove the `<router-link>` (or whatever wrapper) that targets `to="/mapview?index=make-new-thing-here"`. If the link is wrapped in a containing `<li>` or `<div>` with no other content, remove the wrapper too.
- **D-18:** Verification gate: `grep -r "make-new-thing-here" Taipei-City-Dashboard-FE/src/` returns ZERO matches. Final `npm run build` exits 0. Plan's last task asserts both.

### File Layout
- **D-19:** Files Phase 3 creates / edits / deletes:
  - NEW: `Taipei-City-Dashboard-FE/src/components/crosscompare/DistrictPopup.vue`
  - EDIT: `Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` (add extrusion layer, hover handler, popup mount, teardown extension)
  - EDIT: `Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js` (add `EXTRUSION_LAYER_ID`, `buildExtrusionPaint()` if extracted, `EXTRUSION_HEIGHT_HOVER = 4000`, `EXTRUSION_TRANSITION_MS = 150`)
  - EDIT: `Taipei-City-Dashboard-FE/src/views/MapView.vue` (remove 3 lines + comment)
  - EDIT: `Taipei-City-Dashboard-FE/src/components/utilities/bars/SideBar.vue` (remove the synthetic-index link, line 163)
  - DELETE: `Taipei-City-Dashboard-FE/src/make-new-thing-here/` (entire directory, 2 files)
- **D-20:** Phase 3 does NOT touch: `mapStore.js`, `mapConfig.js`, `mapStyle.js`, `crossCompareStore.js`, `ViewToggle.vue`, `RampLegend.vue`, `router/index.js`, `NavBar.vue` (all Phase 2 surface stays intact).

### Threat Model (continuing Phase 2 ASVS L1 baseline)
- **D-21:** Reflected XSS via district name: Vue's `{{ }}` interpolation in `DistrictPopup.vue` escapes by default. Do NOT use `v-html` for any popup content. The `feature.id` value comes from the trusted `metrotaipei_town` vector tile source, but defensive escaping is free here.
- **D-22:** WebGL leak on view unmount: `map.remove()` already in place from Phase 2. Phase 3 adds `popup?.remove()` and `popupVm?.unmount()` to the same teardown block.
- **D-23:** Re-entrancy: rapid mousemove can fire many `setFeatureState` calls — coalesce by checking `hoveredFeatureId !== districtName` BEFORE calling `setFeatureState` (handler shows this).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/PROJECT.md` — project framing, no-new-packages constraint, out-of-scope list (no 3D extrusion at rest!)
- `.planning/REQUIREMENTS.md` — CC-04 text, traceability
- `.planning/ROADMAP.md` §"Phase 3" — Touches list, success criteria #1-#3, Risks section
- `.planning/STATE.md` — Phase 2 shipped state, browser-smoke deferred note

### Phase 2 (FE) — must read in full; this phase extends Phase 2 in-place
- `.planning/phases/02-fe-cross-compare-page/02-CONTEXT.md` (D-02 hover seam, D-11 non-interactive grey-out, D-19 single source layer)
- `.planning/phases/02-fe-cross-compare-page/02-PATTERNS.md` (Concern 7: `promoteId` is a NEW pattern; mapStore.js analog excerpts)
- `.planning/phases/02-fe-cross-compare-page/02-06-SUMMARY.md` (Phase 2 acceptance audit; lists what shipped)
- `Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` (Phase 2 output — has `promoteId: "TNAME"`, the active fill layer, the greyed fill layer, the existing `onBeforeUnmount` teardown)
- `Taipei-City-Dashboard-FE/src/store/crossCompareStore.js` (Phase 2 — `disabledDistricts` Set getter is the seam; popup needs `scoreByDistrict.get(name)` to access rank/scores)
- `Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js` (Phase 2 — `CROSSCOMPARE_SOURCE_ID`, `_SOURCE_LAYER`, `_FILL_LAYER_ID`, `buildFillPaint`)

### make-new-thing-here removal (CC-04 acceptance #3)
- `Taipei-City-Dashboard-FE/src/views/MapView.vue` lines 24, 26, 147-153 — exact removal targets
- `Taipei-City-Dashboard-FE/src/components/utilities/bars/SideBar.vue` line 163 — exact removal target
- `Taipei-City-Dashboard-FE/src/make-new-thing-here/README.md` — historical context to quote in deletion commit message body

### Codebase patterns to follow
- `.planning/codebase/CONVENTIONS.md` — hard tabs, snake_case JSON (popup field names), TUIC banner
- `.planning/codebase/ARCHITECTURE.md` §FE — Pinia store boundaries, Mapbox patterns
- Mapbox GL JS docs (already implicitly known): `setFeatureState`, `getFeatureState`, `fill-extrusion-height`, paint property transitions, Popup class

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (Phase 2 outputs)
- **`store.disabledDistricts`** (Set<string>) — Phase 2 D-11 mandated this getter as the Phase 3 hover-guard contract. Hover handler MUST consult before applying setFeatureState.
- **`store.scoreByDistrict`** (Map<string, Row>) — popup body needs `rank`, `total_score`, `course_score`, `inspection_score` for the hovered district name.
- **`promoteId: "TNAME"`** on the `metrotaipei_town` source — Phase 2 D-02 already shipped. `feature.id` will be the district's TNAME string at hover time.
- **Mapbox Popup class** — built into `mapbox-gl@3.x`, no additional package needed.
- **`onBeforeUnmount` teardown block** — already in CrossCompareView.vue from Phase 2; just append popup cleanup.

### Established Patterns
- **Mapbox event binding** — `map.on(event, layerId, handler)` for layer-scoped events (only fires when feature is on that layer). Use this to enforce "non-interactive on greyed" structurally (D-12).
- **Hard tabs** in `<script>` and `<style>` blocks of new SFCs. Vue templates may be auto-formatted by `eslint --fix` to 2-space — accept that.
- **Relative imports** only.
- **Traditional Chinese inline comments** in newer code (CrossCompareView.vue, crossCompareStore.js) — match.

### Integration Points
- **Hover layer attaches to `crosscompare_fill_active`** — same layer Phase 2 already styles. Phase 3 adds a SECOND extrusion layer (id `crosscompare_extrusion_active`) above it.
- **Popup mounts into a Mapbox Popup container** — created on-demand at hover time, removed on `mouseleave` and `onBeforeUnmount`.

</code_context>

<specifics>
## Specific Ideas

- **Vite cache permission issue is environmental** (Phase 2 STATE.md notes it). Phase 3 build verification still uses `npm run build` (production build doesn't hit `.vite/deps`). Browser smoke for CC-04 is the same deferred handoff: user resolves cache, runs dev server, hovers a district, observes the lift + popup.
- **Acceptance check sample**: hovering 中正區 in 雙北 view should produce popup `中正區 / #1 / 63.9 / 課程分數 28.1 / 抽查分數 35.8` (exact numbers from fixture row 0). Hovering 萬華區 should produce `萬華區 / #41 / 10.6 / ...`.
- **Acceptance check #2**: in 台北 view, hovering a 新北 district (e.g. 烏來區) must do nothing — no extrusion lift, no popup, no cursor change. This is structurally guaranteed by D-12 (events bound only to the active layer).

</specifics>

<deferred>
## Deferred Ideas

- **Drill-down panel** with full BE row (courses, food_businesses, inspected, not_inspected, inspection_rate) on click — out of scope for v2.3 polish; future milestone.
- **Outline halo on hover** — rejected as over-design; extrusion lift is sufficient visual feedback. Could be added later if user testing shows confusion.
- **Click-to-pin popup** (instead of hover-only) — out of scope; v2.3 spec says hover only.
- **Score-scaled extrusion at rest** — explicitly rejected by PROJECT.md out-of-scope list; resting state is FLAT.
- **Mobile-narrow responsive layout for popup** — out of scope per PROJECT.md.
- **Cross-fade between view modes** — Phase 2 deferred; could revisit if user testing surfaces jank.
- **Real ETL pipeline for scores** — separate future milestone.

</deferred>

---

*Phase: 3-Hover Interaction & Polish*
*Context gathered: 2026-05-03 via --auto*
