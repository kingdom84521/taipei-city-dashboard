---
phase: 02-fe-cross-compare-page
plan: 03
subsystem: fe-config
tags: [config, mapbox, paint-expression, normalize, hcl-interpolate]
requires: []
provides:
  - "named module: crossCompareConfig (12 named exports — 8 consts + 4 functions)"
  - "normalizeDistrictKey(city, name) — 臺/台 + whitespace canonicalisation"
  - "buildFillPaint(domain, scoreByDistrict) — interpolate-hcl paint expression keyed on TNAME"
  - "buildGreyPaint() / buildLinePaint() — D-11 greyed-out fill + line"
  - "CROSSCOMPARE_HAS_SOURCE_LAYER runtime flag — vector-tile vs geojson env branch"
affects:
  - "Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js (new)"
tech-stack:
  added: []
  patterns:
    - "named-export-only module (mirrors mapConfig.js)"
    - "Mapbox interpolate-hcl + match expressions composed in pure JS"
    - "runtime hostname branch for vector-tile vs geojson source loading"
key-files:
  created:
    - "Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js"
  modified: []
decisions:
  - "Use interpolate-hcl on ['get', 'TNAME'] match (D-10, D-13)"
  - "Single source layer metrotaipei_town for both modes (D-19) — no tp_district fallback"
  - "Both 臺 and 台 variants emitted into match arms so vector tile in either form joins (D-14 defence in depth)"
  - "CROSSCOMPARE_SOURCE_LAYER conditional on hostname (vector-tile mode only — geojson rejects source-layer)"
  - "Defensive fallback for degenerate domain / empty match arms returns flat-colour paint (mitigates T-02-03-04)"
metrics:
  duration: "~12 min"
  completed: 2026-05-03
  tasks: 1/1
  files: 1
---

# Phase 02 Plan 03: crossCompareConfig.js Summary

**One-liner:** Centralised Phase 2 config + Mapbox paint-expression builders module — 12 named exports including ramp constants, source/layer ids, TNAME join key, 臺↔台 normalizer, and `interpolate-hcl` paint builders consumed by Plan 02-02 (store) and Plan 02-04 (view).

## Outcome

The file `Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js` was created at `cd0011b` with 157 lines, hard-tab indentation, and no external imports (pure module). All 12 expected exports are present and the eslint config recognises the file as clean (`npx eslint src/assets/configs/crossCompareConfig.js` exits 0).

## Final Named Exports

### Constants (8)

| Export | Purpose |
|---|---|
| `CROSSCOMPARE_HAS_SOURCE_LAYER` | Runtime boolean — `true` when hostname ∈ `{citydashboard.taipei, test-citydashboard.taipei}`. Mirrors `mapConfig.js:4`. |
| `CROSSCOMPARE_SOURCE_ID` | `"metrotaipei_town"` — single source for both 台北/雙北 modes (D-19). |
| `CROSSCOMPARE_SOURCE_LAYER` | `"metrotaipei_town"` in vector-tile mode, `undefined` in geojson mode (Mapbox geojson sources reject `source-layer`). |
| `CROSSCOMPARE_FILL_LAYER_ID` | `"crosscompare_fill_active"` — fill layer id for active districts. |
| `CROSSCOMPARE_GREY_LAYER_ID` | `"crosscompare_fill_greyed"` — fill layer id for greyed districts. |
| `CROSSCOMPARE_GREY_LINE_LAYER_ID` | `"crosscompare_line_greyed"` — line layer id for greyed-district outlines. |
| `CROSSCOMPARE_JOIN_KEY` | `"TNAME"` (D-13) — vector tile feature property for district name. |
| `CROSSCOMPARE_RAMP` | `{ low: "#1a3a3f", high: "#5dffe6", greyFill: "#3a3a3a", greyOpacity: 0.35, greyLine: "#555555", activeFillOpacity: 0.75 }` (D-10, D-11). |

### Functions (4)

| Export | Signature | Purpose |
|---|---|---|
| `normalizeDistrictKey` | `(city, name) => "city|district"` | 臺/台 + whitespace canonicalisation; returns `""` for missing args (D-14). |
| `buildFillPaint` | `(domain, scoreByDistrict) => Mapbox paint object` | `interpolate-hcl` on `match(['get', 'TNAME'], ...)` — keys per-district `total_score` into the dual-stop ramp. Defensive fallback when domain is degenerate or arms array is empty. |
| `buildGreyPaint` | `() => { fill-color, fill-opacity }` | Flat `#3a3a3a` @ 0.35 opacity for greyed districts (D-11). |
| `buildLinePaint` | `() => { line-color, line-width, line-opacity }` | `#555555` 0.6-width 0.6-opacity outline for greyed districts (D-11). |

## 臺/台 Normalization on Both Sides

`normalizeDistrictKey` canonicalises BE-side strings (fixture uses `臺北市`/`新北市`). Inside `buildFillPaint` the same normalization runs on each `row.district`, AND a `traditional` variant is added back (`/台/g → 臺`) so that whichever character variant the vector tile actually uses, the Mapbox `match` arm will hit. This is **defence-in-depth** — covers both possible vector-tile encodings without requiring a runtime probe to decide.

## Hardcoded JOIN_KEY Hypothesis

`CROSSCOMPARE_JOIN_KEY = "TNAME"` is set hardcoded based on `mapConfig.js:55` (`TaipeiTown` label uses `["get", "TNAME"]`) and `mapConfig.js:89` (`metroTaipeiTown` label uses the same). Plan 02-04 (CrossCompareView) is responsible for adding a runtime probe that calls `map.querySourceFeatures(...)` after `style.load` and warns if `TNAME` is missing — this plan does not block on probe results since the hypothesis is corroborated by two existing label-layer call sites.

## Verification

| Check | Result |
|---|---|
| `test -f crossCompareConfig.js` | ✓ file exists |
| `grep -q 'export const CROSSCOMPARE_SOURCE_ID = "metrotaipei_town"'` | ✓ |
| `grep -q 'export const CROSSCOMPARE_JOIN_KEY = "TNAME"'` | ✓ |
| `grep -q 'export function normalizeDistrictKey'` | ✓ |
| `grep -q 'export function buildFillPaint'` | ✓ |
| `grep -q 'export function buildGreyPaint'` | ✓ |
| `grep -q 'export function buildLinePaint'` | ✓ |
| `grep -q 'interpolate-hcl'` | ✓ |
| `grep -q 'CROSSCOMPARE_HAS_SOURCE_LAYER'` | ✓ |
| `grep -P '^\t'` (hard-tab check) | ✓ first match: `\ttypeof window !== "undefined" &&` |
| `grep -c '1a3a3f\|5dffe6'` | 2 (≥ 2 — both ramp endpoints present) |
| `grep -c '3a3a3a'` | 1 (greyFill present) |
| `npx eslint src/assets/configs/crossCompareConfig.js` | exit 0 (zero errors / warnings on this file) |

## Build Status

Ran `npm run build` after commit. The eslint stage failed with **3 errors** — all of them in `Taipei-City-Dashboard-FE/src/store/crossCompareStore.js` (Plan 02-02's deliverable), NOT in this plan's file:

```
src/store/crossCompareStore.js
   27:11  error  'err' is defined but never used  no-unused-vars
  121:13  error  'err' is defined but never used  no-unused-vars
  140:13  error  'err' is defined but never used  no-unused-vars
```

Per execution rule 4, this is acceptable: the failure is **not** in `crossCompareConfig.js`, and it originates from the Plan 02-02 scaffold. The orchestrator notes Plan 02-04 will rebuild `CrossCompareView.vue` and Plan 02-06 is the formal build gate — these `err`-shadowing eslint errors are a Plan 02-02 hygiene issue (likely a follow-up `try/catch` cleanup), not a 02-03 blocker. **Plan 02-03's deliverable is independently lint-clean** (`npx eslint src/assets/configs/crossCompareConfig.js` exits 0).

## Threat Surface Scan

No new security-relevant surface was introduced beyond what the threat model already covers:
- `T-02-03-01` (Tampering — district names in Mapbox match expression): mitigated. `Number(row.total_score)` + `Number.isFinite` guard the score values; district strings are passed as opaque match keys (Mapbox runtime never `eval`s them).
- `T-02-03-04` (DoS — degenerate domain or empty match arms): mitigated. `buildFillPaint` early-returns a flat-colour paint object when `!Number.isFinite(min/max)`, `min === max`, or `matchArms.length === 0`.
- `typeof window !== "undefined"` guard on `CROSSCOMPARE_HAS_SOURCE_LAYER` prevents crashes during SSR / unit-test imports (defence-in-depth — no SSR is configured today, but the guard costs nothing).

No threat flags.

## Deviations from Plan

None — plan executed exactly as written. The verbatim `<action>` block was pasted with hard tabs, all 12 named exports landed, all checks passed.

## Commit

| Task | Hash | Files |
|---|---|---|
| Task 1: Create crossCompareConfig.js | `cd0011b` | `Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js` (+157 lines) |

## Self-Check: PASSED

- File exists: `/home/yumekuii/works/taipei-city-dashboard/Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js` ✓
- Commit `cd0011b` exists in `git log --oneline --all` ✓
- All plan-mandated exports present (verified via `grep -E "^export "`) ✓
- File independently lint-clean (eslint exit 0) ✓
- Build failures are scoped to Plan 02-02's file, NOT this plan's deliverable ✓
