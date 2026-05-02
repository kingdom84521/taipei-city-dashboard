---
phase: 02-fe-cross-compare-page
plan: 02
subsystem: frontend
tags: [pinia, store, axios, localStorage, security, crosscompare]
dependency_graph:
  requires:
    - "Taipei-City-Dashboard-FE/src/router/axios.js (singleton + interceptor)"
    - "Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js (Plan 02-03 — provides normalizeDistrictKey; not yet importable)"
    - "BE /api/v1/crosscompare/scores endpoint (Phase 1 — locked contract)"
  provides:
    - "useCrossCompareStore() — Pinia hook"
    - "store.scores: Row[] (snake_case)"
    - "store.viewMode: 'taipei' | 'metrotaipei'"
    - "store.loading / store.error"
    - "getter rampDomain: [min, max]"
    - "getter scoreByDistrict: Map<key, row>"
    - "getter enabledDistricts: Set<string>"
    - "getter disabledDistricts: Set<string>"
    - "getter enabledDistrictNames: string[] (TNAME values for setFilter, D-19)"
    - "action fetchScores() — single GET (D-18)"
    - "action setViewMode(mode) — whitelist-validated, persists to localStorage (D-09 / T-02-02-01)"
    - "action initFromStorage() — read + validate localStorage on mount"
  affects:
    - "Plan 02-04 (CrossCompareView.vue) — consumes store on onMounted"
    - "Plan 02-05 (ViewToggle.vue + RampLegend.vue) — consume store.viewMode + store.rampDomain"
    - "Plan 02-06 (integrated build gate) — runs npm run build once 02-03 ships normalizeDistrictKey"
tech-stack:
  added: []
  patterns:
    - "Pinia options-API store (matches authStore.js precedent)"
    - "Axios singleton + interceptor handles toasts (no manual try/catch in action)"
    - "localStorage whitelist validation on read AND write (defends against tampering)"
key-files:
  created:
    - "Taipei-City-Dashboard-FE/src/store/crossCompareStore.js (145 lines)"
  modified: []
decisions:
  - "D-05: store has zero Mapbox / DOM coupling — view holds map instance, store holds data"
  - "D-09: localStorage key 'crossCompare.viewMode'; default 'metrotaipei'"
  - "D-18: single fetch on mount (view=metrotaipei always); toggle is client-side filter on city === '臺北市'"
  - "T-02-02-01 / T-02-02-02 mitigated: VALID_VIEW_MODES = ['taipei', 'metrotaipei'] enforced on both initFromStorage and setViewMode; non-whitelist values warn + no-op"
  - "T-02-02-04 mitigated: response.data?.data ?? [] guards against malformed BE response; rampDomain returns [0, 100] when scores empty"
metrics:
  duration: "~2 min"
  completed: "2026-05-03"
  tasks_completed: 1
  files_changed: 1
  commits: 1
---

# Phase 02 Plan 02: crossCompareStore Summary

Pinia store providing fetched district scores, persisted view mode, and derived enabled/disabled district sets for the Cross-Compare page; zero Mapbox coupling (view holds the map instance per D-04 / D-05).

## What Shipped

A single new file — `Taipei-City-Dashboard-FE/src/store/crossCompareStore.js` (145 lines, hard-tab indented, Traditional Chinese inline comments matching `mapStore.js` / `contentStore.js` precedent). Implements the data half of requirement CC-02; the UI half (toggle + legend wiring) lands in Plan 02-05.

## Store API Surface (for downstream consumers)

### State

| Field | Type | Initial | Notes |
|---|---|---|---|
| `scores` | `Row[]` | `[]` | Raw rows from BE; snake_case fields preserved (`total_score`, `course_score`, `inspection_score`, `inspection_rate`, `food_businesses`, `not_inspected`, `inspected`, `courses`, `rank`, `city`, `district`) |
| `viewMode` | `'taipei' \| 'metrotaipei'` | `'metrotaipei'` | Default per D-09; restored from localStorage by `initFromStorage()` |
| `loading` | `boolean` | `false` | Set true during `fetchScores()` |
| `error` | `boolean` | `false` | Set true on fetch failure (axios interceptor still shows toast) |

### Getters

| Getter | Returns | Notes |
|---|---|---|
| `rampDomain` | `[number, number]` | `[min, max]` of `total_score`; falls back to `[0, 100]` when scores is empty or all values non-finite |
| `scoreByDistrict` | `Map<string, Row>` | Key is `normalizeDistrictKey(city, district)` — quick lookup for paint expressions |
| `enabledDistricts` | `Set<string>` | Normalized "city\|district" keys of currently active districts. In `'taipei'` mode, only city === `'臺北市'` (after 臺/台 normalization). In `'metrotaipei'`, all 41 |
| `disabledDistricts` | `Set<string>` | Complement of `enabledDistricts`. Empty Set in `'metrotaipei'` mode. Phase 3 hover handler MUST guard with this (D-11) |
| `enabledDistrictNames` | `string[]` | Array of district `TNAME` strings — feed directly to Mapbox `setFilter(['in', ['get', 'TNAME'], ['literal', names]])` per D-19 |

### Actions

| Action | Behavior |
|---|---|
| `initFromStorage()` | Read `localStorage['crossCompare.viewMode']`, validate against whitelist, fall back to `'metrotaipei'` if invalid/missing/throwing. Call FIRST in view `onMounted`. |
| `fetchScores()` | Single GET to `/crosscompare/scores?view=metrotaipei`. Always requests metrotaipei view (D-18). Populates `scores` on success; sets `error = true` on failure (toast handled by axios interceptor). |
| `setViewMode(mode)` | Validates `mode` against `VALID_VIEW_MODES` whitelist BEFORE mutating state or writing localStorage. Non-whitelist input: `console.warn` + no-op. localStorage write wrapped in try/catch (private mode tolerance). |

## Threat Model Mitigations Confirmed

| Threat ID | Mitigation in code | Verification |
|---|---|---|
| **T-02-02-01** (localStorage tampering) | `readStoredViewMode()` runs raw value through `VALID_VIEW_MODES.includes(raw)`; non-whitelist → fall back to `DEFAULT_VIEW_MODE` | `grep -c 'VALID_VIEW_MODES' = 3` (constant + setViewMode + readStoredViewMode) |
| **T-02-02-02** (caller passes arbitrary string) | `setViewMode` runs same `VALID_VIEW_MODES.includes(mode)` check at entry; warn + early return on miss | `console.warn` line directly precedes `return` in setViewMode |
| **T-02-02-04** (malformed BE response) | `response.data?.data ?? []` plus rampDomain `[0, 100]` fallback when scores empty / all values non-finite | Optional chaining + nullish coalescing at fetchScores; `Number.isFinite` guard in rampDomain |
| **T-02-02-06** (localStorage write failure) | try/catch around `localStorage.setItem` in setViewMode and around `getItem` in readStoredViewMode | Both wrappers present |

T-02-02-03 (info disclosure) and T-02-02-05 (XSS via popup) were `accept` dispositions in the threat model — Phase 2 does not render district names in HTML, so no escaping work is needed; Phase 3 popup must re-evaluate.

## Wave-1 Dependency Note

The store imports `normalizeDistrictKey` from `../assets/configs/crossCompareConfig`. That module ships in **Plan 02-03** (independent Wave 1 plan, no shared file edit). Until 02-03 is committed:

- This file is syntactically valid (the import statement parses fine).
- `npm run build` will fail at module resolution time for the missing config file. **This is expected.** Plan 02-06 owns the integrated build gate after 02-03 + 02-04 land.
- Per the executor's plan-context rules, no `npm run build` was attempted mid-plan — verification was static (grep + tab check) only.

## Verification Outcomes

All 6 grep checks specified in the plan's `<execution_rules>` passed:

| Check | Required | Actual |
|---|---|---|
| `defineStore` count | ≥ 1 | 2 |
| `viewMode` count | ≥ 3 | 10 |
| `crossCompare\.viewMode` count | ≥ 1 | 1 |
| `VALID_VIEW_MODES` count | ≥ 2 | 3 |
| `normalizeDistrictKey` count | ≥ 1 | 4 |
| Hard-tab indented | ≥ 1 line | confirmed |

Additional plan automated-verify (`<verify><automated>` in PLAN.md) also passes:
- File exists at exact path
- Contains `defineStore("crossCompare"`
- Contains `http.get("/crosscompare/scores"`
- Contains `crossCompare.viewMode`
- Contains `VALID_VIEW_MODES`
- Contains `enabledDistricts` / `enabledDistrictNames`
- Does NOT contain `mapboxgl` (the word "Mapbox" appears once in a Chinese comment about Mapbox `setFilter` semantics — the import-name check `grep -q 'mapboxgl'` returns false; PASS)

## Deviations from Plan

None — plan executed exactly as written. The action block was pasted verbatim with hard-tab indentation. No bugs encountered, no missing critical functionality discovered, no architectural decisions needed.

## Self-Check: PASSED

- File `Taipei-City-Dashboard-FE/src/store/crossCompareStore.js` exists (verified via Bash `ls`)
- Commit `00ad9af` exists in `git log --oneline` on branch `develop`
- Pre-existing dirty files (`.planning/STATE.md`, `Taipei-City-Dashboard-FE/src/assets/configs/mapbox/mapConfig.js`) untouched — still showing as ` M` in `git status`, confirming the targeted-stage rule held.

## Commits

| Hash | Message |
|---|---|
| `00ad9af` | `feat(02-02): add crossCompareStore.js (scores + viewMode + derived sets)` |
