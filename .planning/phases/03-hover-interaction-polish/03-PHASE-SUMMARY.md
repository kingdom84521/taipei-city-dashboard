---
phase: 03-hover-interaction-polish
plan: 05
subsystem: fe-acceptance
tags: [acceptance, build, lint, audit, phase-summary, crosscompare, hover, levitate, popup, make-new-thing-here]
requirements: [CC-04]
wave: 3
depends_on: ["03-01", "03-02", "03-03", "03-04"]
status: complete
completed: 2026-05-03
completed_plans: 5
total_plans: 5
dependency_graph:
  requires:
    - "All Phase 3 plans 03-01..03-04 committed (verified via git log 5f464d8..HEAD — 12 commits)"
  provides:
    - "Phase 3 acceptance report — all 5 hard gates pass; all 23 D-IDs evidenced; all 4 threats mitigated; 3 ROADMAP success criteria addressed"
    - "23-D-ID decision audit (D-01..D-19, D-17b, D-20..D-23)"
    - "4-threat mitigation cross-check (T-XSS, T-LEAK, T-REENT, T-DEL)"
    - "Phase 3 hand-off note for /gsd-transition: milestone v2.3 at code-evident done, browser smoke deferred"
  affects:
    - "STATE.md / ROADMAP.md / MILESTONES.md transitions (orchestrator-owned writes — this plan does NOT touch them)"
    - "Milestone v2.3 ready to mark 'complete pending user smoke'"
tech-stack:
  added: []
  patterns:
    - "Verification-only plan (no source code changes per <files_modified: []>)"
    - "Gate-first acceptance: build/grep-zero + 23-D-ID grep audit + 4-threat audit + 3 ROADMAP criterion audit"
    - "Deferred browser smoke documented with three concrete remediation paths (carry-over from Phase 2)"
key-files:
  created:
    - ".planning/phases/03-hover-interaction-polish/03-PHASE-SUMMARY.md"
  modified: []
decisions:
  - "All 23 D-IDs (D-01..D-19, D-17b, D-20..D-23) honoured and evidenced in committed source"
  - "All 4 threats (T-XSS, T-LEAK, T-REENT, T-DEL) mitigated with statically-evident code"
  - "Phase 2 boundary commit 5f464d8 chosen as the diff baseline for off-limits-file audit (8 files at 0 diff lines)"
  - "Working-tree dirty mapConfig.js change at line 165 (taipei_building_3d source-layer ID rename) PRE-DATES Phase 2 — `git diff 5f464d8 HEAD -- mapConfig.js` returns 0 lines committed"
  - "Phase 3 lands 8 file changes (1 NEW + 4 EDIT + 2 DELETE in source; +313/-85 LOC) across 8 implementation+refactor commits"
  - "Browser smoke deferred to user — same 3 remediation paths as Phase 2 (chown / wipe / docker)"
metrics:
  duration_seconds: 240
  duration_minutes: 4.0
  tasks_completed: 4
  files_created: 1
  files_modified: 0
  commits: 1
  build_status: "passing (npm run build exit 0)"
  completed_date: 2026-05-03
---

# Phase 03 Phase Summary: Hover Interaction & Polish (CC-04)

**Phase:** 03 — Hover Interaction & Polish
**Date:** 2026-05-03
**Requirements closed:** CC-04 (final requirement of milestone v2.3)
**Phase 2 baseline commit:** `5f464d8` (`docs(state): mark Phase 2 shipped; record browser-smoke handoff`)
**Phase 3 head commit at acceptance:** `cdcd52b` (`feat(03-04): wire CC-04 hover handler in CrossCompareView (setFeatureState + popup)`)
**Plans shipped:** 5 / 5 (03-01 + 03-02 + 03-03 + 03-04 + this 03-05)

**One-liner:** Phase 3 acceptance — `npm run build` exit 0, all 6 `make-new-thing-here` references gone (`grep -r` returns ZERO matches), `DistrictPopup.vue` + `buildExtrusionPaint` config + layer-scoped hover handler with paired `popupApp.unmount()` BEFORE `popup.remove()` all shipped, 8 off-limits Phase 2 files at 0 diff lines, all 23 D-IDs evidenced, all 4 threats mitigated, browser smoke deferred to user with three remediation paths.

---

## 1. Build / Lint Status (Task 1 — 5 hard gates)

| # | Gate | Required | Actual | Status |
|---|------|----------|--------|--------|
| 1 | `cd Taipei-City-Dashboard-FE && npm run build` exit code | 0 | **0** | ✓ |
| 2 | `grep -r "make-new-thing-here" Taipei-City-Dashboard-FE/src/` matches | empty (exit 1) | **empty** (`GREP_EXIT=1`) | ✓ |
| 3 | `test ! -d Taipei-City-Dashboard-FE/src/make-new-thing-here` | true | `DIR_DELETED` | ✓ |
| 4 | DistrictPopup.vue inventory + extrusion config + hover handler symbols | POPUP_OK + ≥6 + ≥6 | `POPUP_OK`; config 9 matches; view 9 matches | ✓ |
| 5 | 8 off-limits Phase 2 files diff vs `5f464d8` | 0 lines each | all 0 lines | ✓ |

Build log: `/tmp/phase03-build.log` — `BUILD_EXIT=0`. Vite production bundle completes; no ESLint errors. The two pre-existing dirty entries (`STATE.md`, `mapConfig.js`) were neither touched nor committed by this plan; their working-tree state is the same as Phase 2 acceptance left it.

---

## 2. Files Shipped This Phase

| File | Status | Lines | Plan |
|------|--------|-------|------|
| `Taipei-City-Dashboard-FE/src/components/crosscompare/DistrictPopup.vue` | NEW | 119 | 03-02 |
| `Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js` | EDIT | +41 (157→198) | 03-01 |
| `Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` | EDIT | +152 (260→412) | 03-01 + 03-04 |
| `Taipei-City-Dashboard-FE/src/views/MapView.vue` | EDIT | -10 net | 03-03 |
| `Taipei-City-Dashboard-FE/src/components/utilities/bars/SideBar.vue` | EDIT | -7 net | 03-03 |
| `Taipei-City-Dashboard-FE/src/store/contentStore.js` | EDIT | -8 net | 03-03 |
| `Taipei-City-Dashboard-FE/src/make-new-thing-here/MakeNewThingHerePanel.vue` | DELETE | -19 | 03-03 |
| `Taipei-City-Dashboard-FE/src/make-new-thing-here/README.md` | DELETE | -39 | 03-03 |

**Net delta vs `5f464d8`:** `8 files changed, 313 insertions(+), 85 deletions(-)` (per `git diff --stat 5f464d8 HEAD -- Taipei-City-Dashboard-FE/src/`). Minimal blast radius. **Zero new npm packages** (PROJECT.md no-new-packages constraint honoured).

---

## 3. Phase 3 Commit Trail (since `5f464d8`)

12 commits between Phase 2 acceptance baseline and Phase 3 acceptance head:

| Commit | Plan | Type | Subject |
|--------|------|------|---------|
| `f18a253` | (planning) | docs | capture phase context |
| `a61cdf2` | (planning) | docs | add PATTERNS.md and patch CONTEXT (6th make-new-thing-here site, v-else-if trap, unused import) |
| `106d905` | (planning) | docs | create Phase 3 plans (5 plans, 3 waves) for Hover Interaction & Polish |
| `91a3086` | (planning) | docs | patch plans per checker feedback (drop unused import; fix line-range; add D-11/D-20 truths; setFeatureState gate) |
| `5986fcd` | 03-01 | feat | add fill-extrusion companion layer + buildExtrusionPaint config helper |
| `934f5bb` | 03-02 | feat | add DistrictPopup.vue (popup body for hover interaction) |
| `0a6fa30` | 03-03 | refactor | remove make-new-thing-here from MapView.vue (v-if branch + orphaned v-else-if rewrite) |
| `d106e54` | 03-03 | refactor | remove make-new-thing-here SideBarLink + unused import from SideBar.vue |
| `669ee50` | 03-03 | refactor | remove make-new-thing-here short-circuit from contentStore.setRouteParams (6th site, PATTERNS Concern 9) |
| `2bb94a1` | 03-03 | refactor | delete Taipei-City-Dashboard-FE/src/make-new-thing-here/ directory |
| `126d1b2` | 03-03 | docs | complete make-new-thing-here removal plan |
| `cdcd52b` | 03-04 | feat | wire CC-04 hover handler in CrossCompareView (setFeatureState + popup) |

All implementation/refactor commits are atomic, scoped to a single plan, and follow the project's mixed-style commit convention (English Conventional Commits with `(03-XX)` scope plus Chinese verb prefixes in body where applicable).

---

## 4. ROADMAP Phase 3 Success Criteria

The 3 success criteria from `ROADMAP.md` § Phase 3:

| # | Criterion | Code Evidence | Browser Smoke | Status |
|---|-----------|---------------|----------------|--------|
| 1 | Hover lifts an enabled district within 200ms; popup at cursor showing district name + total_score + rank + per-component scores (course / inspection) | D-01..D-14 all evidenced (see § 6 D-XX audit). Lift mechanism: `setFeatureState({hover:true})` (3 occurrences in CrossCompareView.vue) drives the `case + feature-state` paint expression in `buildExtrusionPaint()` (config) — Mapbox transitions over **150 ms** (`EXTRUSION_TRANSITION_MS`, **50 ms margin under 200 ms**). Popup mounted via `createApp(DistrictPopup, {districtName, rank, totalScore, courseScore, inspectionScore})` at cursor `e.lngLat`. | DEFER → user hovers 中正區 in 雙北 (expected: `中正區 / #1 / 63.9 / 課程 28.1 / 抽查 35.8`) | EVIDENCED ✓ — runtime hover deferred |
| 2 | Hover on greyed (disabled) district = nothing — no animation, no popup, no cursor change | **D-12 (structural):** all 3 events (`mousemove`/`mouseenter`/`mouseleave`) bound to `CROSSCOMPARE_FILL_LAYER_ID` ONLY; `grep -cE 'map\.on\([^,]+,\s*CROSSCOMPARE_GREY_LAYER_ID'` returns 0. **D-11 (defensive):** `disabledDistricts` belt-and-braces guard inside `onMouseMove` (3 occurrences). | DEFER → user toggles to 台北 view, hovers 烏來區 (expected: NOTHING) | EVIDENCED ✓ — runtime hover deferred |
| 3 | `grep -r "make-new-thing-here" Taipei-City-Dashboard-FE/src/` returns zero matches | **Direct verification:** `GREP_EXIT=1`, output empty. 6 reference sites removed across 4 files + 1 directory: MapView.vue (3 sites + v-else-if rewrite), SideBar.vue (link block + unused import), contentStore.js (setRouteParams short-circuit, the 6th site discovered in PATTERNS Concern 9), and the 2-file directory deletion. | (no browser test needed — grep is the gate) | EVIDENCED ✓ — grep is the gate |

**Verdict:** All 3 ROADMAP success criteria are mechanically evidenced from committed source. The deferred browser smoke (criteria #1 + #2) is a runtime confirmation step, not a code-quality gap — Phase 2 used the same deferral precedent.

---

## 5. Threat-Mitigation Verification (4 phase-level threats)

Threats from `03-CONTEXT.md` § "Threat Model (continuing Phase 2 ASVS L1 baseline)" (D-21, D-22, D-23) and the deletion-gate (D-18 / T-DEL):

| Threat | Severity | Mitigation Code | Evidence | Status |
|--------|----------|-----------------|----------|--------|
| **T-XSS** (Reflected XSS via untrusted district name in popup body) | HIGH | Vue mustache `{{ }}` interpolation in `DistrictPopup.vue` (escapes by default); zero `v-html`/`innerHTML`/`outerHTML` anywhere in CC-04 surface. District name flows through `createApp(DistrictPopup, { districtName, ... })`. (D-21) | `grep -c "v-html" DistrictPopup.vue` = **0**; `grep -c "v-html\|innerHTML\|outerHTML" CrossCompareView.vue` = **0** | mitigated ✓ |
| **T-LEAK** (WebGL/Vue leak across navigation: popup app instance + Mapbox popup container) | HIGH (load-bearing) | `teardownPopup()` calls `popupApp.unmount()` BEFORE `popup.remove()` (Concern 3 ordering); called from BOTH `onMouseLeave` (per-hover) AND `onBeforeUnmount` (view destructor). Crucially: `onBeforeUnmount` runs `teardownPopup()` **on line 217** BEFORE `map.remove()` on line 223 — popup teardown precedes map teardown. (D-14 / D-22) | `grep -c "popupApp.unmount\|popup.remove" CrossCompareView.vue` = **2**; line ordering verified inline (see § 6 D-22 row) | mitigated ✓ |
| **T-REENT** (Re-entrancy from rapid mousemove firing many `setFeatureState` calls or stranding old popup state) | MED | `if (hoveredFeatureId !== districtName)` coalesce gate before `setFeatureState`/popup rebuild — same-district mousemoves only update `popup.setLngLat(e.lngLat)`. `nextTick` callback in `buildPopup` further guards against teardown-during-mount races. (D-23) | `grep -c "hoveredFeatureId !== districtName" CrossCompareView.vue` = **1** | mitigated ✓ |
| **T-DEL** (Stale `make-new-thing-here` references after partial deletion break the grep-zero acceptance gate or leave a dangling import) | HIGH | The 6-site deletion (PATTERNS Concern 9 surfaced the 6th site in `contentStore.js`) closes all references. Verified by the load-bearing grep-zero gate. | `grep -r "make-new-thing-here" Taipei-City-Dashboard-FE/src/` returns **empty** (exit 1); `test ! -d .../make-new-thing-here` = `DIR_DELETED` | mitigated ✓ |

**All 4 phase-level threats mitigated with statically-evident code.** Block-on severity items (T-XSS, T-LEAK, T-DEL — all HIGH) all PASS.

---

## 6. D-XX Decision Audit (D-01..D-19, D-17b, D-20..D-23)

`03-CONTEXT.md` cites **23 decision IDs**. All are evidenced in committed source as of `cdcd52b`:

| ID | Decision (one-line) | Honoured? | Evidence |
|----|---------------------|-----------|----------|
| **D-01** | Mapbox `setFeatureState({source, sourceLayer, id}, {hover})` drives `fill-extrusion-height` paint expression — NOT deck.gl PolygonLayer | ✓ | `grep -c "setFeatureState" CrossCompareView.vue` = **3** (1 actual call inside `setHover()` routing both on/off + 2 comment refs); zero `@deck.gl/layers PolygonLayer` references anywhere in Phase 3 surface |
| **D-02** | NEW `fill-extrusion` companion layer (id `crosscompare_extrusion_active`) above existing flat `crosscompare_fill_active` — flat stays in place | ✓ | `grep -c "CROSSCOMPARE_EXTRUSION_LAYER_ID" crossCompareConfig.js` = **1** (declaration); same in CrossCompareView = **2** (import + use). Flat `crosscompare_fill_active` layer still added in `addCrossCompareLayers()`. |
| **D-03** | Constant 4000 m lift via `case` + `feature-state` (NOT score-scaled) | ✓ | `grep -c "feature-state" crossCompareConfig.js` = **4**; `"case"` = **1**; `"hover"` = **1**; `EXTRUSION_HEIGHT_HOVER` = 4000 declared in same file |
| **D-04** | < 200 ms transition via `fill-extrusion-height-transition` paint property; `EXTRUSION_TRANSITION_MS = 150` | ✓ | `grep -c "fill-extrusion-height-transition"` = **1**; `EXTRUSION_TRANSITION_MS` = **3** references (declaration + builder body + comment) |
| **D-05** | `fill-extrusion-color` reuses same `interpolate-hcl` expression as `buildFillPaint` (lifted top + sides keep score colour) | ✓ | `grep -c "fill-extrusion-color" crossCompareConfig.js` = **1**; `buildExtrusionPaint` body explicitly assigns `fillPaint["fill-color"]` to `"fill-extrusion-color"` |
| **D-06** | Popup body is Vue SFC `DistrictPopup.vue` mounted via `createApp(DistrictPopup, props).mount(div)` | ✓ | `grep -c "createApp(DistrictPopup" CrossCompareView.vue` = **2** (1 actual call + 1 JSDoc-ish comment); `test -f .../DistrictPopup.vue` = exit 0 |
| **D-07** | Popup `anchor: "bottom"`, positioned at cursor `e.lngLat` (NOT centroid) | ✓ | `grep -c 'anchor: "bottom"' CrossCompareView.vue` = **1**; `grep -c "setLngLat(e.lngLat)" CrossCompareView.vue` = **1** |
| **D-08** | 5-prop popup payload: districtName / rank / totalScore / courseScore / inspectionScore | ✓ | `grep -c` for the 5 names in `DistrictPopup.vue` = **13** combined references (each prop appears in `defineProps` + `<template>` interpolation + computed labels) |
| **D-09** | `Number(v).toFixed(1)` for scores; `#N` for rank; `—` for missing/non-finite | ✓ | `grep -c "toFixed" DistrictPopup.vue` = **2**; `grep -c "Number.isFinite" DistrictPopup.vue` = **2** (in `fmt` + `rankLabel` computed) |
| **D-10** | Theme CSS variables: `--color-component-background`, `--color-highlight`, `--color-normal-text` | ✓ | `var(--color-component-background)` = **2**; `var(--color-highlight)` = **1**; `var(--color-normal-text)` = **3** in DistrictPopup.vue |
| **D-11** | `disabledDistricts` belt-and-braces guard inside `onMouseMove` (defensive secondary; primary enforcement is D-12) | ✓ | `grep -c "disabledDistricts" CrossCompareView.vue` = **3** (1 use in `onMouseMove` + 2 comment refs) |
| **D-12** | Events bound ONLY to `CROSSCOMPARE_FILL_LAYER_ID` — greyed layer never fires hover (structural enforcement) | ✓ | `map.on("mousemove", CROSSCOMPARE_FILL_LAYER_ID, ...)` = **1**; `mouseenter` = **1**; `mouseleave` = **1** (total 3); `map.on(..., CROSSCOMPARE_GREY_LAYER_ID, ...)` = **0** (zero events on grey layer) |
| **D-13** | Cursor → `pointer` on mouseenter, restored to `""` on mouseleave | ✓ | `grep -c 'cursor = "pointer"'` = **1**; `grep -c 'cursor = ""'` = **1** |
| **D-14** | `onBeforeUnmount` extended — `teardownPopup()` runs BEFORE `map.remove()` | ✓ | `popupApp.unmount` = **1**; `popup.remove` = **1**; line ordering: `onBeforeUnmount` at line 215 → `teardownPopup()` at line 217 → `map.remove()` at line 223 (visually verified in CrossCompareView.vue) |
| **D-15** | `make-new-thing-here/` directory deleted via `git rm -r`; README quoted in commit body | ✓ | `test ! -d .../make-new-thing-here` = `DIR_DELETED`; commit `2bb94a1` body contains README archaeology |
| **D-16** | `MapView.vue` 3 sites removed + orphaned `v-else-if` → `v-if` rewrite | ✓ | `grep -cE "make-new-thing-here\|MakeNewThingHerePanel\|isMakeNewThingHere" MapView.vue` = **0**; commit `0a6fa30` rewrites the previously-orphaned branch from `v-else-if` to `v-if` |
| **D-17** | `SideBar.vue` SideBarLink block removed + unused `import SideBarLink` removed | ✓ | `grep -c "make-new-thing-here" SideBar.vue` = **0**; commit `d106e54` strips the import per ESLint `no-unused-vars` |
| **D-17b** | 6th site in `contentStore.js setRouteParams` short-circuit removed (PATTERNS Concern 9) | ✓ | `grep -c "make-new-thing-here" contentStore.js` = **0**; commit `669ee50` removes the early-return branch |
| **D-18** | Verification gate: `grep -r "make-new-thing-here" Taipei-City-Dashboard-FE/src/` returns ZERO matches; `npm run build` exits 0 | ✓ (LOAD-BEARING) | grep returns empty (`GREP_EXIT=1`); `npm run build` exit 0 |
| **D-19** | File layout — only the 6 enumerated files in CONTEXT touched (1 NEW + 4 EDIT + 1 DELETE-dir, post-D-17b correction) | ✓ | `git diff --stat 5f464d8 HEAD` shows exactly these 8 paths (DistrictPopup NEW; crossCompareConfig.js, CrossCompareView.vue, MapView.vue, SideBar.vue, contentStore.js EDIT; 2 DELETED files inside make-new-thing-here/) |
| **D-20** | Phase 3 does NOT touch: mapStore.js, mapConfig.js, mapStyle.js, crossCompareStore.js, ViewToggle.vue, RampLegend.vue, router/index.js, NavBar.vue | ✓ | All 8 files: `git diff 5f464d8 HEAD -- <file>` returns 0 lines (see § 7 below) |
| **D-21** | Reflected XSS via district name: Vue `{{ }}` escapes; never `v-html` | ✓ | `grep -c "v-html" DistrictPopup.vue` = **0**; T-XSS row above has full evidence |
| **D-22** | WebGL/Vue leak: paired `popupApp.unmount()` THEN `popup.remove()` in `teardownPopup`; called from BOTH onMouseLeave AND onBeforeUnmount; onBeforeUnmount runs teardownPopup BEFORE map.remove | ✓ | Visually confirmed: `teardownPopup()` body at lines 284-301 — `popupApp.unmount()` at line 287 BEFORE `popup.remove()` at line 295. `onBeforeUnmount` (line 215) calls `teardownPopup()` (line 217) BEFORE `map.remove()` (line 223). T-LEAK row above has same evidence. |
| **D-23** | Re-entrancy coalesce — `setFeatureState` only fires when `hoveredFeatureId !== districtName` | ✓ | `grep -c "hoveredFeatureId !== districtName" CrossCompareView.vue` = **1** |

**23 / 23 D-IDs honoured.** No deferrals to a future phase. The single load-bearing gate (D-18 grep-zero) is the structural test that the synthetic-index hack is fully gone.

---

## 7. Off-Limits-File Audit (D-20)

D-20 boundary: Phase 3 does NOT touch any of these 8 Phase 2 / pre-existing files. Diff baseline = `5f464d8` (Phase 2 acceptance commit).

| File | `git diff 5f464d8 HEAD` lines | Status |
|------|-------------------------------|--------|
| `Taipei-City-Dashboard-FE/src/store/mapStore.js` | 0 | UNTOUCHED ✓ |
| `Taipei-City-Dashboard-FE/src/assets/configs/mapbox/mapConfig.js` | 0 (committed) — working-tree dirty line 165 carry-over from PRE-Phase 2, NOT a Phase 3 change | UNTOUCHED ✓ |
| `Taipei-City-Dashboard-FE/src/assets/configs/mapbox/mapStyle.js` | 0 | UNTOUCHED ✓ |
| `Taipei-City-Dashboard-FE/src/store/crossCompareStore.js` | 0 | UNTOUCHED ✓ |
| `Taipei-City-Dashboard-FE/src/components/crosscompare/ViewToggle.vue` | 0 | UNTOUCHED ✓ |
| `Taipei-City-Dashboard-FE/src/components/crosscompare/RampLegend.vue` | 0 | UNTOUCHED ✓ |
| `Taipei-City-Dashboard-FE/src/router/index.js` | 0 | UNTOUCHED ✓ |
| `Taipei-City-Dashboard-FE/src/components/utilities/bars/NavBar.vue` | 0 | UNTOUCHED ✓ |

**8 / 8 off-limits files at 0 diff lines.** D-20 honoured exactly.

---

## 8. Deferred Verification (Browser Smoke)

The dev-server-driven smoke test cannot run end-to-end in this executor environment due to a **root-owned `node_modules/.vite/deps`** cache (carried over from a prior `sudo`-invoked build, same blocker that deferred Phase 2's smoke). Vite errors with `EACCES: permission denied, rmdir '...node_modules/.vite/deps'` and aborts before binding the port. **The production build (`npm run build`) — which exercises the same Vue/Vite/Mapbox toolchain via Rollup — passes cleanly**, so the choropleth + hover code at minimum compiles and lints.

### Three Remediation Paths (user picks one — same as Phase 2)

**Option A — chown the cache (least destructive):**

```bash
sudo chown -R $USER /home/yumekuii/works/taipei-city-dashboard/Taipei-City-Dashboard-FE/node_modules/.vite
cd /home/yumekuii/works/taipei-city-dashboard/Taipei-City-Dashboard-FE && DOCKER_COMPOSE=false npm run dev
# then visit http://localhost:80/crosscompare
```

**Option B — wipe the cache and let Vite rebuild it:**

```bash
sudo rm -rf /home/yumekuii/works/taipei-city-dashboard/Taipei-City-Dashboard-FE/node_modules/.vite
cd /home/yumekuii/works/taipei-city-dashboard/Taipei-City-Dashboard-FE && npm install   # idempotent if deps unchanged
cd /home/yumekuii/works/taipei-city-dashboard/Taipei-City-Dashboard-FE && DOCKER_COMPOSE=false npm run dev
# then visit http://localhost:80/crosscompare
```

**Option C — full Docker stack (isolated, but slowest first-up):**

```bash
docker network create br_dashboard 2>/dev/null  # idempotent
docker compose -f /home/yumekuii/works/taipei-city-dashboard/docker/docker-compose-db.yaml up -d
docker compose -f /home/yumekuii/works/taipei-city-dashboard/docker/docker-compose.yaml up -d
# then visit http://localhost:8080/crosscompare
```

### CC-04 4-Step Browser Verification

After the dev server is up at `/crosscompare`, run these four steps in order:

```
1. Hover 中正區 in 雙北 view (default)
   Expected: visible 4000 m lift (smooth ~150 ms cubic transition)
   Expected: popup at cursor showing
             - h3:    中正區
             - pill:  #1
             - large: 63.9
             - grid:  課程分數 28.1 | 抽查分數 35.8
   Expected: cursor changes to pointer over the active fill

2. Hover 萬華區 in 雙北 view
   Expected: visible lift
   Expected: popup 萬華區 / #41 / 10.6 / per-component scores
             (萬華區 is the dimmest district / lowest rank in fixture)

3. Switch to 台北 view (top-left ViewToggle), hover 烏來區 (a 新北 district, now greyed)
   Expected: NOTHING — no lift, no popup, no cursor change
   Structural guarantee: D-12 layer-scoped binding + D-11 belt-and-braces

4. Navigate /crosscompare → /dashboard → /crosscompare → /mapview → /crosscompare (×3)
   Expected: no console errors
   Expected: no `WebGL: too many active contexts` warnings (T-LEAK mitigation)
   Open DevTools Memory tab → take heap snapshot before and after navigations.
   Expected: heap doesn't keep growing linearly (some growth is normal; unbounded leak is not)
```

If any step fails, capture the symptom (console error, missing popup, wrong values) and the orchestrator can spawn a continuation executor against the failure details.

---

## 9. Plans Shipped This Phase

| Plan | One-line summary | SUMMARY |
|------|------------------|---------|
| 03-01 | Extrusion config + companion layer: `CROSSCOMPARE_EXTRUSION_LAYER_ID`, `EXTRUSION_HEIGHT_HOVER=4000`, `EXTRUSION_TRANSITION_MS=150`, `buildExtrusionPaint()` helper; new `fill-extrusion` layer registered above flat fill at height 0 (dormant at rest) | `03-01-extrusion-config-SUMMARY.md` (commit `5986fcd`) |
| 03-02 | DistrictPopup.vue popup body SFC: 5 camelCase props, mustache-only (XSS-safe), `Number.isFinite` guards before `.toFixed(1)` (DoS-safe), theme CSS variable styling matching RampLegend.vue | `03-02-district-popup-SUMMARY.md` (commit `934f5bb`) |
| 03-03 | make-new-thing-here removal across 6 sites + directory deletion (4 atomic commits): MapView.vue (v-if + v-else-if rewrite), SideBar.vue (link + unused import), contentStore.js (setRouteParams short-circuit, the 6th site from PATTERNS Concern 9), then `git rm -r` of the 2-file directory | `03-03-mnth-removal-SUMMARY.md` (commits `0a6fa30`, `d106e54`, `669ee50`, `2bb94a1`) |
| 03-04 | Hover handler wiring: 7 helper functions (setHover, findRowForDistrict, teardownPopup, buildPopup, onMouseMove, onMouseEnter, onMouseLeave); 3 layer-scoped event bindings to `CROSSCOMPARE_FILL_LAYER_ID`; `popupApp.unmount()` BEFORE `popup.remove()` ordering; `onBeforeUnmount` extension | `03-04-hover-handler-SUMMARY.md` (commit `cdcd52b`) |
| 03-05 | This acceptance plan — verification only, 0 source code changes | `03-PHASE-SUMMARY.md` (this file) |

---

## 10. Phase 3 Hand-off (for `/gsd-transition`)

```
✓ All 4 implementation plans (03-01..03-04) + this acceptance plan (03-05) complete
✓ All 23 D-IDs evidenced in committed source (D-01..D-19, D-17b, D-20..D-23)
✓ All 4 threats mitigated and statically verified (T-XSS, T-LEAK, T-REENT, T-DEL)
✓ ROADMAP success criteria #1, #2 code-evident; #3 grep-confirmed
✓ npm run build exit 0 (final integrated build)
✓ 8 off-limits Phase 2 files at 0 diff lines vs 5f464d8 — D-20 honoured exactly
✓ Phase 3 net delta: 8 files changed, 313 insertions(+), 85 deletions(-) — minimal blast radius

⚠ Pre-existing dirty mapConfig.js working-tree change at line 165 (taipei_building_3d source-layer rename) STILL UNRESOLVED
  — carried over from Phase 2 STATE.md item 1
  — `git diff 5f464d8 HEAD -- mapConfig.js` returns 0 lines committed
  — user-decision item, NOT a Phase 3 deliverable

Next steps:
- /gsd-transition       — commits state, marks Phase 3 + milestone v2.3 complete pending smoke
- (user)                — resolve Vite cache (Option A/B/C), run browser smoke, observe 4-step list
- /gsd-complete-milestone — once browser smoke confirms; user-driven
```

---

## 11. Open Items / Carry-overs to v2.4 or User-Decision

1. **Pre-existing `mapConfig.js` working-tree change at line 165** (`tp_building_height84-18p8j0` → `tp_building_height-6v9fvv` for `taipei_building_3d`) — user-decision item, NOT a Phase 2 or Phase 3 deliverable. `git diff 5f464d8 HEAD -- mapConfig.js` returns 0 lines (committed history is clean). Resolve before/after milestone close at user's discretion (`git diff` to inspect; `git add` to commit; `git checkout --` to discard).
2. **Browser smoke deferred** — runtime confirmation of CC-04 hover lift + popup + greyed-non-interactive + leak-free navigation pending one of the three Vite cache remediation paths above. Same shape as Phase 2's deferral.
3. **`node_modules/.vite/deps` root ownership** — cross-cutting environmental issue, identical to Phase 2. Permanent fix: ensure no future build is run as root (Docker bind-mounts can drop privileges; CI builds should run as non-root).
4. **Empty `<h1>工具</h1>` placeholder header in `SideBar.vue`** (per Plan 03-03 D-17 Option A) — kept as a slot for future tools. Aggressive removal (Option B) deferred until user testing surfaces visual clutter.
5. **No FE test coverage** — CLAUDE.md notes "no `npm test`". Test infrastructure lands in a future milestone. Likely first targets: `crossCompareConfig.js` (`buildExtrusionPaint`, `normalizeDistrictKey`), `crossCompareStore.js` (whitelist + rampDomain), `DistrictPopup.vue` mount/unmount lifecycle, hover handler coalesce gate.
6. **The latent leak in `mapStore.js` line 2106** (existing precedent — `createApp().mount()` without `app.unmount()` on `removePopup`) — Phase 3's `teardownPopup()` does NOT replicate the bug, but the Phase 1/2 mapStore precedent is still latent. Out of scope for v2.3; future hardening pass could fix it now that the corrected pattern is established in `CrossCompareView.vue`.
7. **Drill-down panel on click** (full BE row: courses, food_businesses, inspected, not_inspected, inspection_rate) — explicitly deferred per CONTEXT § "Deferred Ideas". Future milestone.
8. **Real ETL pipeline for scores** — separate future milestone (Airflow DAG against open-data sources).

---

## 12. Verification (Plan-Level)

| Gate | Required | Actual | Status |
|------|----------|--------|--------|
| `cd Taipei-City-Dashboard-FE && npm run build` exit code | 0 | 0 | ✓ |
| `BUILD_EXIT=0` in `/tmp/phase03-build.log` | present | present | ✓ |
| `grep -r "make-new-thing-here" Taipei-City-Dashboard-FE/src/` matches | empty | empty (`GREP_EXIT=1`) | ✓ |
| `test ! -d Taipei-City-Dashboard-FE/src/make-new-thing-here` | true | DIR_DELETED | ✓ |
| `test -f Taipei-City-Dashboard-FE/src/components/crosscompare/DistrictPopup.vue` | exit 0 | POPUP_OK | ✓ |
| `git diff 5f464d8 HEAD -- mapStore.js` | empty | empty | ✓ |
| `git diff 5f464d8 HEAD -- mapConfig.js` | empty | empty (committed) | ✓ |
| `git diff 5f464d8 HEAD -- mapStyle.js` | empty | empty | ✓ |
| `git diff 5f464d8 HEAD -- crossCompareStore.js` | empty | empty | ✓ |
| `git diff 5f464d8 HEAD -- ViewToggle.vue` | empty | empty | ✓ |
| `git diff 5f464d8 HEAD -- RampLegend.vue` | empty | empty | ✓ |
| `git diff 5f464d8 HEAD -- router/index.js` | empty | empty | ✓ |
| `git diff 5f464d8 HEAD -- NavBar.vue` | empty | empty | ✓ |
| `grep -c "promoteId\|setFeatureState\|fill-extrusion-height" CrossCompareView.vue` | ≥ 3 | 3+3+1 = ~7 | ✓ |
| `grep -c "popupApp.unmount" CrossCompareView.vue` | ≥ 1 | 1 (paired with popup.remove) | ✓ |
| `grep -c "CROSSCOMPARE_EXTRUSION_LAYER_ID\|buildExtrusionPaint\|EXTRUSION_HEIGHT_HOVER\|EXTRUSION_TRANSITION_MS" crossCompareConfig.js` | ≥ 6 | 9 | ✓ |
| `grep -cE 'setFeatureState\|createApp\(DistrictPopup\|popupApp\.unmount\|map\.on\("mouse' CrossCompareView.vue` | ≥ 6 | 9 | ✓ |
| 23 D-IDs audited | all evidenced | 23 / 23 | ✓ |
| 4 threats audited | all mitigated | 4 / 4 | ✓ |
| 3 ROADMAP success criteria | all addressed | 3 / 3 (#3 verified, #1 + #2 code-evident with deferred runtime) | ✓ |
| 03-PHASE-SUMMARY.md exists at canonical path | yes | yes | ✓ |
| File length ≥ 100 lines | yes | (this file) | ✓ |

---

## 13. Self-Check

The following claims in this SUMMARY have been programmatically verified:

- [x] `npm run build` exit 0 — confirmed (`BUILD_EXIT=0`; build log at `/tmp/phase03-build.log`)
- [x] `dist/` directory exists with bundle output (Vite Rollup completed)
- [x] `grep -r "make-new-thing-here" Taipei-City-Dashboard-FE/src/` returns empty (`GREP_EXIT=1`) — load-bearing D-18 gate
- [x] `Taipei-City-Dashboard-FE/src/make-new-thing-here/` directory deleted (`test ! -d` true)
- [x] `Taipei-City-Dashboard-FE/src/components/crosscompare/DistrictPopup.vue` exists at canonical path
- [x] All 8 off-limits files have 0 diff lines vs `5f464d8` (`git diff 5f464d8 HEAD -- <file> | wc -l`)
- [x] All 23 D-XX evidence greps execute with non-zero hits where expected, zero hits where forbidden (`v-html` = 0 in popup body; `map.on(..., GREY_LAYER_ID, ...)` = 0)
- [x] D-22 ordering visually confirmed: in `teardownPopup()` `popupApp.unmount()` precedes `popup.remove()`; in `onBeforeUnmount` `teardownPopup()` precedes `map.remove()`
- [x] `Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` (412 lines), `DistrictPopup.vue` (119 lines), `crossCompareConfig.js` (198 lines), `MapView.vue` (651 lines), `SideBar.vue` (317 lines), `contentStore.js` (1122 lines) — final post-Phase-3 line counts
- [x] Phase 3 commit count since `5f464d8`: 12 commits (4 planning docs + 7 implementation/refactor + 1 docs SUMMARY for Plan 03-03; Plans 03-01/03-02/03-04 SUMMARYs untracked at acceptance time, written by their respective execute runs)
- [x] Phase 3 net delta: `8 files changed, 313 insertions(+), 85 deletions(-)`
- [x] Phase 2 boundary commit verified: `5f464d8 docs(state): mark Phase 2 shipped; record browser-smoke handoff`
- [x] Phase 3 head commit at acceptance: `cdcd52b feat(03-04): wire CC-04 hover handler in CrossCompareView (setFeatureState + popup)`
- [x] Working-tree dirty `mapConfig.js` confirmed PRE-Phase-2 carry-over (line 165 `taipei_building_3d` source-layer rename, NOT a Phase 3 change)

## Self-Check: PASSED
