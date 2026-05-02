---
phase: 03-hover-interaction-polish
plan: 04
subsystem: frontend
tags: [crosscompare, hover, popup, mapbox, feature-state, fill-extrusion, vue, lifecycle]
requires:
  - 03-01-extrusion-config-PLAN.md  # CROSSCOMPARE_EXTRUSION_LAYER_ID + buildExtrusionPaint() + dormant extrusion layer
  - 03-02-district-popup-PLAN.md    # DistrictPopup.vue (5 camelCase props)
  - 03-03-make-new-thing-here-removal-PLAN.md  # the deletion gate; durable (still 0 refs after this plan)
provides:
  - hover-handler                   # mousemove/enter/leave bindings on crosscompare_fill_active
  - feature-state-hover-toggle      # setFeatureState({...}, {hover: bool}) — drives extrusion paint expression
  - district-popup-mount-lifecycle  # createApp(DistrictPopup, props).mount() / popupApp.unmount() pairing
  - paired-popup-teardown           # popupApp.unmount() BEFORE popup.remove(); fixes mapStore.js latent leak (Concern 3)
affects:
  - CrossCompareView.vue            # Phase 3 Wave 2 — hover surface fully wired
tech-stack:
  added: []                          # no new packages (PROJECT.md constraint honoured)
  patterns:
    - mapbox-feature-state-hover-toggle           # NEW pattern in this codebase (Concern 1)
    - layer-scoped-event-binding-as-D-12-enforcement  # map.on(event, layerId, handler) overload
    - createApp-mount-with-paired-unmount-on-teardown # fixes Concern 3 vs mapStore.js precedent
    - rapid-mousemove-coalesce-via-id-equality        # D-23 — only fire setFeatureState on district change
    - cursor-anchored-popup-via-mousemove-lngLat      # D-07 — not centroid
    - inline-normalisation-臺-台                      # findRowForDistrict workaround for city-less promoteId
key-files:
  created: []
  modified:
    - Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue
decisions:
  - D-01: setFeatureState({source, sourceLayer?, id: districtName}, {hover}) drives fill-extrusion-height paint expression — consumed by setHover()
  - D-04: < 200ms transition lives entirely in paint property (Plan 03-01); JS only flips feature-state — no setPaintProperty(height) imperative mutation
  - D-06: createApp(DistrictPopup, props).mount('#crosscompare-popup-mount') inside Mapbox Popup HTML container
  - D-07: popup positioned at cursor lngLat (mousemove e.lngLat) — NOT centroid; same-district mousemoves only update setLngLat
  - D-08: 5-prop popup payload {districtName, rank, totalScore, courseScore, inspectionScore}; snake_case row → camelCase mapping at call site
  - D-09: only 5 fields passed to popup; courses / food_businesses / inspected / not_inspected / inspection_rate / city explicitly NOT passed (info-disclosure mitigation T-03-04-05)
  - D-11: store.disabledDistricts?.has?.(districtName) belt-and-braces guard inside onMouseMove (defensive secondary; primary enforcement is D-12)
  - D-12: events bound ONLY to CROSSCOMPARE_FILL_LAYER_ID — greyed layer never fires hover (structural enforcement — no Vue-level guard required for correctness)
  - D-13: cursor → 'pointer' on mouseenter, restored to '' on mouseleave
  - D-14: onBeforeUnmount extended — teardownPopup() runs BEFORE map.remove()
  - D-21: zero v-html / innerHTML / outerHTML — Vue mustache escapes by default (popup body in Plan 03-02)
  - D-22: paired popupApp.unmount() THEN popup.remove() in teardownPopup; called from BOTH onMouseLeave and onBeforeUnmount
  - D-23: re-entrancy coalesce — setFeatureState only fires when hoveredFeatureId !== districtName
metrics:
  duration_minutes: 4
  completed_date: 2026-05-03
  task_count: 3
  file_count: 1
  lines_added: 140
  lines_removed: 1
---

# Phase 03 Plan 04: Hover Handler Wiring Summary

**One-liner:** Mapbox layer-scoped hover handler that flips feature-state.hover on crosscompare_fill_active, mounts DistrictPopup via createApp, and pairs unmount with remove on teardown.

## Scope Delivered

Wave 2 wiring layer for CC-04. Wave 1 shipped the contracts (Plan 03-01 dormant extrusion layer + paint expression keyed on `feature-state.hover`; Plan 03-02 DistrictPopup SFC accepting 5 camelCase props; Plan 03-03 removed the `make-new-thing-here` slot). Plan 03-04 is the only file touch needed to make hover actually do something.

After this plan, `npm run build` exits 0 and CC-04 acceptance criteria #1 (hover lift + popup) and #2 (hover-on-greyed = nothing) are CODE-EVIDENT. Browser smoke is the only remaining gate, deferred to Plan 03-05 per Phase 2 STATE.md Vite cache blocker.

## Tasks Executed

| # | Name | Commit |
|---|------|--------|
| 1 | Extend imports (vue → +createApp +nextTick; +DistrictPopup) | cdcd52b |
| 2 | Module-scope `let` bindings + 7 helper functions (setHover, findRowForDistrict, teardownPopup, buildPopup, onMouseMove, onMouseEnter, onMouseLeave) | cdcd52b |
| 3 | Bind 3 events to CROSSCOMPARE_FILL_LAYER_ID inside `map.on("load", ...)`; extend `onBeforeUnmount` with `teardownPopup()` before `map.remove()` | cdcd52b |

Tasks 1+2 wrote to the same file in a single edit pass to avoid a transient `no-unused-vars` ESLint failure if committed independently (createApp/nextTick imports are unreferenced until Task 2 lands the helper functions). The plan flagged this explicitly. All three tasks were ultimately committed as one atomic feat() commit since they collaborate on a single file and a single behaviour delivery.

## Decisions Honoured

D-01, D-04, D-06, D-07, D-08, D-09, D-11, D-12, D-13, D-14, D-21, D-22, D-23 — all verbatim per CONTEXT.md and PATTERNS.md. The plan's `<must_haves><truths>` block is fully satisfied (every truth is grep-evident).

## Threat Mitigations

| Threat ID | Status | Evidence |
|-----------|--------|----------|
| T-03-04-01 (T-XSS) | mitigated | `grep -c "v-html\|innerHTML\|outerHTML" CrossCompareView.vue` == 0; district name flows through `createApp(DistrictPopup, { districtName, ... })` only — DistrictPopup uses `{{ }}` (Plan 03-02 / D-21) which Vue escapes |
| T-03-04-02 (T-LEAK) | **mitigated — load-bearing** | `popupApp.unmount()` (line 287) runs BEFORE `popup.remove()` (line 295) inside `teardownPopup()`; called from BOTH `onMouseLeave` (per-hover) AND `onBeforeUnmount` (view-level, runs BEFORE `map.remove()`). This explicitly does NOT replicate the latent leak in `mapStore.js` line 2106 precedent (Concern 3). |
| T-03-04-03 (T-REENT) | mitigated | `if (hoveredFeatureId !== districtName)` coalesce gate — same-district mousemoves only touch `popup.setLngLat`. `nextTick` callback guards with `if (!popup) return;` against teardown-during-mount race. |
| T-03-04-04 (D-12 bypass) | mitigated | Events bound ONLY to `CROSSCOMPARE_FILL_LAYER_ID`; `grep -c "map.on(\"mouse" .*CROSSCOMPARE_GREY` == 0. Belt-and-braces `disabledDistricts?.has?.()` guard inside `onMouseMove` covers any future drift. |
| T-03-04-05 (Info Disclosure) | mitigated | Only 5 fields passed to DistrictPopup props (districtName, rank, totalScore, courseScore, inspectionScore). The other row fields (courses, food_businesses, inspected, not_inspected, inspection_rate, city) are NOT passed. |

## Verification Evidence

| Gate | Result |
|------|--------|
| `npm run build` exit code | 0 |
| `grep -c "createApp\|nextTick" CrossCompareView.vue` | 5 (1 import + 4 references) |
| `grep -c "DistrictPopup" CrossCompareView.vue` | 4 (1 import + 3 references) |
| `grep -c "normalizeDistrictKey" CrossCompareView.vue` | 0 (NOT imported — inline `.replace(/臺/g, "台")` covers it) |
| Module-scope `let` bindings | 3 (hoveredFeatureId, popup, popupApp at lines 45-47) |
| `grep -c "setFeatureState" CrossCompareView.vue` | 3 (1 call inside setHover routes both hover-on and hover-off; 2 comment refs) |
| `grep -c "createApp(DistrictPopup"` | 1 actual call inside `buildPopup` (grep counted 2 with the JSDoc-ish comment) |
| `popupApp.unmount` line | 287 |
| `popup.remove` line | 295 (after unmount — paired correctly) |
| 7 helper functions | setHover, findRowForDistrict, teardownPopup, buildPopup, onMouseMove, onMouseEnter, onMouseLeave |
| `grep -c 'map.on("mousemove"\|map.on("mouseenter"\|map.on("mouseleave"'` | 3 (all bound to CROSSCOMPARE_FILL_LAYER_ID at lines 205-207) |
| `grep -c "CROSSCOMPARE_GREY_LAYER_ID"` | 4 (Phase 2 baseline; no new event bindings) |
| `grep -c "teardownPopup()"` | 4 callsites (declaration + buildPopup + onMouseLeave + onBeforeUnmount) |
| `grep -c "hoveredFeatureId !== districtName"` (D-23) | 1 |
| `grep -c "v-html\|innerHTML\|outerHTML"` | 0 |
| `grep -c "disabledDistricts"` | 3 (1 use + 2 comment refs) |
| `grep -r "make-new-thing-here" Taipei-City-Dashboard-FE/src/` | 0 (Plan 03-03 gate still durable) |
| Phase 2 boundary (D-20) — `git diff cdcd52b~1..cdcd52b` | only `Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` changed — mapStore.js / mapConfig.js / mapStyle.js / crossCompareStore.js / crossCompareConfig.js / ViewToggle.vue / RampLegend.vue / router/index.js / NavBar.vue all untouched |

## Deviations from Plan

None — plan executed exactly as written. Tasks 1+2 were intentionally written in a single edit pass to avoid the documented transient `no-unused-vars` failure window (the plan itself recommended this approach in Task 1's `<action>` constraints). All three tasks were committed atomically as a single `feat(03-04): ...` commit since they all collaborate on one file and one behaviour delivery — a permitted variant per the plan's commit guidance.

## Known Stubs

None. Every prop the popup receives is wired to a real source: `districtName` from `feature.id` (vector tile via `promoteId: "TNAME"`); `rank`, `totalScore`, `courseScore`, `inspectionScore` from `store.scoreByDistrict` row lookup. When the row lookup fails (e.g. transient state during `fetchScores`), the props default to `null` and `DistrictPopup`'s `fmt()` helper renders `"—"` per Plan 03-02.

## Handoff to Plan 03-05

Browser smoke is the only thing left for CC-04 acceptance #1 and #2 — deferred per Phase 2 STATE.md Vite cache blocker.

Manual smoke checklist (for Plan 03-05):
1. `npm run dev` (after Vite cache permission resolved).
2. Navigate to `/crosscompare`.
3. Verify 雙北 view: hovering 中正區 lifts the polygon ~4000m (cubic, < 200ms) and shows popup `中正區 / #1 / 63.9 / 課程 28.1 / 抽查 35.8`. Cursor becomes pointer.
4. Verify 雙北 view: hovering 萬華區 shows `#41 / 10.6 / ...`.
5. Switch to 台北 view (北市 only). Hover 烏來區 (a 新北 district) — MUST do nothing: no lift, no popup, no cursor change. (Structurally guaranteed by D-12 — events bound to active layer only.)
6. Visit `/crosscompare → /dashboard → /crosscompare → /mapview` ×5 cycle and verify no `WebGL: too many active contexts` console warnings (T-03-04-02 mitigation under load).

## Self-Check: PASSED

- File modified exists: `Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` — FOUND
- Commit exists: `cdcd52b feat(03-04): wire CC-04 hover handler in CrossCompareView (setFeatureState + popup)` — FOUND in `git log --oneline`
- `npm run build` exit 0 — confirmed
- Plan 03-03 deletion gate still durable: `grep -r "make-new-thing-here" Taipei-City-Dashboard-FE/src/` returns 0 — confirmed
- D-20 Phase 2 boundary intact: only `CrossCompareView.vue` modified by this plan — confirmed (`git status --short` shows STATE.md + mapConfig.js as PRE-EXISTING dirty unstaged from before Plan 03-04 ran; not part of this plan's diff)
