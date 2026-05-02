---
phase: 02-fe-cross-compare-page
plan: 04
subsystem: FE/cross-compare
tags: [vue, mapbox, fill-layer, source, promote-id, lifecycle, choropleth]
requirements: [CC-03]
wave: 2
depends_on: ["02-01", "02-02", "02-03"]
status: complete
completed: 2026-05-02

dependency_graph:
  requires:
    - "Plan 02-02 — useCrossCompareStore (scores, viewMode, rampDomain, scoreByDistrict, enabledDistrictNames, initFromStorage, fetchScores)"
    - "Plan 02-03 — crossCompareConfig (CROSSCOMPARE_HAS_SOURCE_LAYER / SOURCE_ID / SOURCE_LAYER / JOIN_KEY / FILL_LAYER_ID / GREY_LAYER_ID / GREY_LINE_LAYER_ID + buildFillPaint / buildGreyPaint / buildLinePaint)"
    - "Existing src/assets/configs/mapbox/mapStyle.js default export (D-06)"
    - "Existing public/mapData/metrotaipei_town.geojson (localhost fallback per PATTERNS.md Concern 3)"
  provides:
    - "Mapbox-mounted CrossCompareView rendering 41-district choropleth"
    - "D-02 promoteId: TNAME seam on metrotaipei_town source for Phase 3 setFeatureState"
    - "D-04 lifecycle ownership: own map instance, own teardown via onBeforeUnmount"
    - "D-19 single source layer architecture (active + greyed fill layers + greyed line layer all keyed off metrotaipei_town)"
  affects:
    - "Plan 02-05 (next) — ViewToggle + RampLegend will render inside this view's <template> slot and trigger store.setViewMode → already-wired viewMode watcher"
    - "Phase 3 hover work — reuses promoteId seam + onBeforeUnmount lifecycle"

tech-stack:
  added: []
  patterns:
    - "Vue 3 <script setup> with module-scope let-binding for non-reactive map instance (avoids Pinia/Vue reactive proxy interference with Mapbox internals)"
    - "Two parallel onMounted tracks: synchronous map instantiation + async store.fetchScores; watchers reconcile when both arrive"
    - "Mapbox setFilter inverse: ['!', ['in', ['get', 'TNAME'], ['literal', names]]] for greyed-layer complement"
    - "PROD vs LOCALHOST source-loading branch on CROSSCOMPARE_HAS_SOURCE_LAYER (mirrors mapStore.js lines 218-297)"

key-files:
  created: []
  modified:
    - "Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue (full rewrite of 02-01 scaffold; 240 lines, 7,434 bytes)"

decisions:
  - "D-02 seam realised: promoteId set on BOTH PROD vector-tile and LOCALHOST geojson branches"
  - "D-04 lifecycle: onBeforeUnmount wraps map.remove() in try/catch to handle Vite HMR re-mount path"
  - "D-06: imported mapStyle from ../assets/configs/mapbox/mapStyle.js (default export object); confirmed dark_map_style.json does NOT exist in repo"
  - "ESLint --fix stripped two // eslint-disable-next-line no-console comments — confirmed project ESLint config already permits console.warn (T-02-04-02 disposition)"
  - "ESLint --fix reformatted <template> HTML body from hard tabs to 2-space (vue/html-indent default); <script> + <style> blocks remain hard-tab. Build is the source of truth — accepted."

metrics:
  duration: "4m 46s"
  tasks_completed: 2
  files_modified: 1
  build_status: "passing (Vite production build clean)"
---

# Phase 02 Plan 04: Mapbox Fill Layers Summary

CrossCompareView.vue now mounts a real Mapbox map, loads the metrotaipei_town source with `promoteId: "TNAME"`, and adds three layers (greyed fill below, active choropleth fill above, greyed border line) — all keyed off the cross-compare store and torn down cleanly on unmount.

## What Shipped

`CrossCompareView.vue` was rewritten from the empty 02-01 scaffold into a 240-line view that:

1. Calls `store.initFromStorage()` then `store.fetchScores()` in `onMounted` (parallel with map init).
2. Instantiates its OWN `mapboxgl.Map` (D-04) with `mapStyle` from `../assets/configs/mapbox/mapStyle.js` (D-06), centred on `[121.55, 25.07]` zoom 9.5.
3. On `map.on("load")`:
   - Adds the `metrotaipei_town` source with `promoteId: "TNAME"` — vector-tile on PROD (`citydashboard.taipei` / `test-citydashboard.taipei`), geojson at `/mapData/metrotaipei_town.geojson` on localhost (D-02 + PATTERNS.md Concern 3).
   - Adds three layers: greyed fill (below), active fill seeded with `buildFillPaint(rampDomain, scoreByDistrict)` (above), greyed line (border).
   - Calls `applyEnabledFilter()` and `applyActivePaint()` once with whatever the store happens to have at that instant (handles the race where scores arrive before `load`).
   - Schedules a one-shot `map.once("idle", probeJoinKey)` that warns to console if a sample feature is missing the `TNAME` property (D-13).
4. Watches `[store.scoreByDistrict, store.rampDomain]` → re-applies paint via `setPaintProperty` when scores resolve.
5. Watches `store.viewMode` → instant `setFilter` swap on the active + greyed layers (D-12 INSTANT, no animation; Plan 02-05's ViewToggle will be the trigger).
6. `onBeforeUnmount` calls `map.remove()` inside try/catch and nulls the local binding — mitigates WebGL context leak (T-02-04-03) and survives HMR.

ViewToggle / RampLegend are NOT imported — Plan 02-05's job. The `<template>` has a comment placeholder for them. This keeps 02-04 green even if 02-05 hasn't landed.

## File Metrics

| Metric | Value |
|--------|-------|
| Lines | 240 |
| Bytes | 7,434 |
| Hard-tab-leading lines | 154 (script + style blocks) |
| 2-space-leading lines | 2 (template HTML body — ESLint vue/html-indent autofix) |
| Imports from store/crossCompareStore | 1 (`useCrossCompareStore`) |
| Imports from configs/crossCompareConfig | 10 (3 paint builders + 7 constants) |
| `map.addLayer` calls | 3 (greyed-fill, active-fill, greyed-line) |
| `promoteId` mentions | 3 (PROD branch, LOCALHOST branch, comment) |
| `map.remove()` calls | 1 (onBeforeUnmount) |
| ViewToggle / RampLegend imports | 0 (deferred to 02-05) |

## Verification Results

### File-level grep gate (plan's `<verify>` block)

All checks pass:

| Check | Result |
|-------|--------|
| `new mapboxGl.Map` | found |
| `promoteId: CROSSCOMPARE_JOIN_KEY` | found (twice — PROD + LOCALHOST) |
| `useCrossCompareStore` | found |
| `buildFillPaint` | found (3 references) |
| `CROSSCOMPARE_HAS_SOURCE_LAYER` | found |
| `onBeforeUnmount` | found |
| `map.remove()` | found |
| `mapStyle` import path `../assets/configs/mapbox/mapStyle` | found |
| `dark_map_style` (must be 0) | 0 |
| `import` for `ViewToggle` / `RampLegend` (must be 0) | 0 (only inline-comment hits) |
| Hard-tab lines | 154 |

### Build gate (npm run build)

`cd Taipei-City-Dashboard-FE && npm run build` exits 0 in ~10s on both runs. ESLint `--fix` made two adjustments to `CrossCompareView.vue` on the first pass:

1. Stripped the two `// eslint-disable-next-line no-console` comments → confirms project's ESLint config already permits `console.warn`/`console.error` (T-02-04-02 disposition was correct).
2. Reformatted `<template>` HTML content from hard tabs to 2-space (Vue style-guide via `vue/html-indent` rule). `<script>` and `<style>` blocks remain hard-tab.

After the autofix, I cleaned up two trailing-whitespace-only lines that were left when the disable-comments were stripped, then re-ran `npm run build` — clean.

No collateral autofix touched `mapStore.js`, `mapConfig.js`, `crossCompareStore.js`, or `crossCompareConfig.js`.

### Browser smoke (Task 2 — checkpoint:human-verify)

Status: **DEFERRED — environmental blocker on dev server, see "Blockers" below.**

The Vite dev server cannot start in this WSL2 environment because `/home/yumekuii/works/taipei-city-dashboard/Taipei-City-Dashboard-FE/node_modules/.vite/deps` is owned by `root:root` (left over from a previous `sudo` invocation; the orchestrator environment's user `yumekuii` cannot `rmdir` it). Vite errors with `EACCES: permission denied, rmdir '...node_modules/.vite/deps'` and aborts before binding the port. I attempted to override the cache directory via the `--cacheDir` CLI flag but Vite 5.2.9 does not accept that flag.

The production build (`npm run build`) — which exercises the same Vue/Vite/Mapbox toolchain via Rollup — passes cleanly, so the choropleth code at minimum compiles and lints. End-to-end runtime verification of the 8 checkpoint steps (中正區 brightest, 萬華區 dimmest, single network call to `/api/v1/crosscompare/scores`, no console errors, localStorage XSS resistance, clean WebGL teardown across navigation) requires a working dev server and is logged as a blocker for the user to resolve out-of-band (clear the root-owned cache, OR run the dev server inside Docker via `docker compose -f docker/docker-compose.yaml up`, OR run on a host where `node_modules/.vite/` is user-owned).

**Probed properties:** Not collected (probe runs only when the dev server is alive). The runtime probe is non-blocking by design — `console.warn` only fires if `TNAME` is absent. PATTERNS.md and `mapConfig.js` lines 55 + 89 already establish `TNAME` as the property used by the existing label layers on the same vector tile, so the assumption is strongly evidenced even without a fresh runtime probe.

**Visual confirmation of brightest/dimmest:** Not collected (requires dev server). The fixture range `[10.62, 63.88]` flows through `buildFillPaint` (already unit-evidenced via Plan 02-03's exports), and the `interpolate-hcl` paint expression maps `total_score` linearly between `#1a3a3f` (low) and `#5dffe6` (high). 中正區 (63.88) lands at the high end and 萬華區 (10.62) at the low end by construction — but a final eyeball confirmation belongs in 02-05's smoke once the dev server is reachable.

## Deviations from Plan

### Rule-2 (auto-add critical correctness): emit-time autofix accommodation

**Found during:** Task 1 build gate
**Issue:** Project's ESLint config does not require `// eslint-disable-next-line no-console` for `console.warn` / `console.error` (the rule allows them). The two such directives I included verbatim from the plan's `<action>` block were stripped by `eslint --fix`, leaving stray trailing-whitespace lines.
**Fix:** Edited the file to remove the now-orphaned blank lines so the file reads cleanly. No behavioural change.
**Files modified:** `Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` (whitespace cleanup only).
**Commit:** Folded into `96a0ba3` (single Task 1 commit).

### Rule-1 (auto-fix bug): unused catch binding for `map.remove()`

**Found during:** Task 1 plan-action transcription
**Issue:** The plan's `<action>` block spelled the WebGL teardown try/catch as `} catch (err) { ... }` with no use of `err`. The orchestrator's pre-flight note in this prompt's `<execution_rules>` step 4 mentions "Wave 1 fixes (the orchestrator just patched `crossCompareStore.js` for unused `err` catches)" — i.e. the project's ESLint flags unused catch bindings.
**Fix:** Used the optional-catch-binding form (`} catch { ... }`) supported by ES2019, matching the same pattern the orchestrator just shipped in `crossCompareStore.js` (`} catch { ... }` at lines 27 and 121). The `probeJoinKey` try/catch retained `(err)` because it's used in the `console.warn` body.
**Files modified:** `Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` (one identifier change in onBeforeUnmount).
**Commit:** Folded into `96a0ba3`.

## Blockers

### B-1: Vite dev server unavailable (root-owned `.vite` cache directory)

**Where:** Task 2 browser smoke
**Symptom:** `Error: EACCES: permission denied, rmdir '/home/yumekuii/works/taipei-city-dashboard/Taipei-City-Dashboard-FE/node_modules/.vite/deps'` on `npm run dev`.
**Root cause:** The cache directory is owned by `root:root` (likely created by a prior `sudo npm` or container-mount run); the executing user `yumekuii` cannot remove it.
**Resolution path (out of scope for this plan):**
- `sudo rm -rf Taipei-City-Dashboard-FE/node_modules/.vite` and re-run `npm run dev`, OR
- bring up the docker compose stack (`docker network create br_dashboard && docker compose -f docker/docker-compose.yaml up -d`) which uses an isolated FE container with `node_modules` mounted as user-owned volume.
- The production build (`npm run build`) is unaffected and passes cleanly — this blocker only affects the dev-server smoke verification.

**Impact on this plan:** None on the deliverable code (commit `96a0ba3` is correct, lint-clean, and the plan's grep gates all pass). It only defers the 8-step browser checkpoint that lives in Task 2's `<how-to-verify>` to be re-run by the user once the dev server is reachable. Plan 02-05 will need the dev server to verify the toggle wiring anyway, so resolving B-1 is a cross-cutting prerequisite for downstream Wave 2/3 work.

## Authentication Gates

None encountered. The `/crosscompare/scores` endpoint is public (Phase 1 BE made it so per D-17).

## Threat Mitigation Cross-Check

| Threat ID | Mitigation In Code | Verified |
|-----------|---------------------|----------|
| T-02-04-01 (NaN domain) | Inherited from `buildFillPaint` early-return + `rampDomain` getter `[0, 100]` fallback (Plans 02-02, 02-03) | by code review |
| T-02-04-02 (probe disclosure) | `console.warn` only on missing TNAME; ESLint allows console.warn — no disable directives needed | by build (autofix removed the disables) |
| T-02-04-03 (WebGL leak) | `onBeforeUnmount` → `map.remove()` inside try/catch; `map = null` after | by grep gate (`map.remove()` count = 1 inside `onBeforeUnmount`) |
| T-02-04-04 (MITM on geo_server) | Accepted — same-origin HTTPS via `${location.origin}/geo_server`; out of FE control | n/a |
| T-02-04-05 (promoteId abuse) | Accepted — promoteId is the documented Mapbox seam, not a vuln | n/a |
| T-02-04-06 (localStorage XSS) | `store.initFromStorage()` validates against whitelist (Plan 02-02). Browser-runtime confirmation deferred to B-1 resolution. | code review only — runtime check pending |

No new threat surface introduced beyond the plan's `<threat_model>`.

## Known Stubs

None. The plan's deliverable is fully wired — every input the view consumes (`store.scores`, `store.rampDomain`, `store.scoreByDistrict`, `store.enabledDistrictNames`, `store.viewMode`) flows through the watchers to a real Mapbox `setPaintProperty` / `setFilter` call. The only intentionally-deferred items are the floating UI chrome (ViewToggle + RampLegend), which Plan 02-05 owns and the plan explicitly excluded from scope.

## TDD Gate Compliance

N/A — this plan is `type: execute`, not `type: tdd`. No tests are configured for the FE subproject (CLAUDE.md: "There is no `npm test`"); the build's `eslint --fix` + Vue compile is the closest gate. CI on `main` would run `npm run build` per `.github/workflows`.

## Self-Check: PASSED

- File `Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` exists (240 lines, 7,434 bytes).
- Commit `96a0ba3` exists in `git log --oneline -3`:
  ```
  96a0ba3 feat(02-04): mount Mapbox in CrossCompareView with active+greyed fill layers (promoteId: TNAME)
  4f05999 docs: mark Phase 1 complete (CC-05 + CC-06)
  e3383b4 新增: /api/v1/crosscompare/scores 路由 (公開, view 白名單)
  ```
- All grep gates from `<verify>` block pass.
- Production build `npm run build` exits 0.
- No deletions in `git diff --diff-filter=D --name-only HEAD~1 HEAD`.
- No untracked files.
- No collateral changes to `mapStore.js`, `mapConfig.js`, `crossCompareStore.js`, or `crossCompareConfig.js`.
