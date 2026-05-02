---
phase: 03-hover-interaction-polish
plan: 02
subsystem: frontend/crosscompare
tags: [crosscompare, popup, sfc, vue, hover-interaction]
requires:
  - Phase 2 outputs (RampLegend.vue analog, theme CSS variables)
provides:
  - "DistrictPopup.vue popup body SFC consumed by Plan 03-04 via createApp(DistrictPopup, props).mount(div)"
affects:
  - "Plan 03-04 (hover handler + popup mount in CrossCompareView.vue) — depends on this SFC"
tech_stack:
  added: []
  patterns:
    - "Vue 3 <script setup> + scoped SCSS + BEM-ish class naming (matches RampLegend.vue analog)"
    - "Defensive Number.isFinite guards before .toFixed(1) (defends T-03-02-02 DoS)"
    - "Mustache interpolation only — no v-html (defends T-03-02-01 XSS, D-21)"
key_files:
  created:
    - Taipei-City-Dashboard-FE/src/components/crosscompare/DistrictPopup.vue
  modified: []
decisions:
  - D-06 (popup body is a Vue SFC mounted into Mapbox Popup container)
  - D-08 (4-region layout: districtName h3 / rank pill / total big / course+inspection grid)
  - D-09 (toFixed(1) for scores; #N for rank; — for missing/non-finite)
  - D-10 (theme CSS variables: --color-component-background, --color-highlight, --color-normal-text, --color-complement-text, --font-s/ms/m)
  - D-19 (canonical path: Taipei-City-Dashboard-FE/src/components/crosscompare/DistrictPopup.vue)
  - D-21 (XSS mitigation: mustache interpolation only, never v-html)
metrics:
  duration: ~2 minutes
  completed: 2026-05-03
  tasks: 1/1
  files_created: 1
  files_modified: 0
  loc: 119
---

# Phase 03 Plan 02: District Popup Summary

**One-liner:** Created the presentational `DistrictPopup.vue` SFC that Plan 03-04 will mount into a Mapbox `Popup` HTML container via `createApp(DistrictPopup, props).mount(div)`.

## What Was Built

A single new file: `Taipei-City-Dashboard-FE/src/components/crosscompare/DistrictPopup.vue` (119 lines after eslint --fix expanded singleline template elements).

### Component Contract

**5 camelCase props (all flow IN at mount time — no Pinia coupling):**

| Prop              | Type   | Default  | Purpose                                                |
| ----------------- | ------ | -------- | ------------------------------------------------------ |
| `districtName`    | String | required | Hovered district TNAME (e.g. `中正區`)                 |
| `rank`            | Number | `null`   | Rank within current view mode (1..N)                   |
| `totalScore`      | Number | `null`   | `total_score` from BE (mapped snake→camel at callsite) |
| `courseScore`     | Number | `null`   | `course_score` from BE                                 |
| `inspectionScore` | Number | `null`   | `inspection_score` from BE                             |

**Defensive formatter** (`fmt`): `Number.isFinite(Number(v)) ? Number(v).toFixed(1) : "—"` — guards against null/undefined/NaN reaching `.toFixed`, which would crash the entire Vue app on mount (T-03-02-02 DoS).

**Render layout (top→bottom, D-08):**
1. `<h3>` district name
2. `<span>` rank pill (`#N` or `—`)
3. Big total score
4. 2-cell grid: 課程分數 / 抽查分數 (each shows label + value)

### Styling

Matches Phase 2 sibling `RampLegend.vue` conventions:
- Hard tabs in `<script>` and `<style>`
- Vue templates 2-space (eslint --fix applied `vue/singleline-html-element-content-newline`)
- Single-line TUIC banner (matches `RampLegend.vue` line 1)
- Scoped SCSS with `&__` BEM-ish nesting
- Theme tokens only — no hard-coded colours

## Verification Gates (all pass)

| Gate                                          | Threshold | Actual |
| --------------------------------------------- | --------- | ------ |
| `test -f .../DistrictPopup.vue`               | exit 0    | exit 0 |
| `grep -c defineProps`                         | ≥ 1       | 1      |
| `grep -c <camelCase 5 props>`                 | ≥ 4       | 13     |
| `grep -c toFixed`                             | ≥ 1       | 2      |
| `grep -c "課程分數\|抽查分數"`                | ≥ 2       | 2      |
| `grep -c v-html`                              | == 0      | 0      |
| `grep -c Number.isFinite` (T-03-02-02 mit.)   | ≥ 2       | 2      |
| `grep -c <theme CSS vars>`                    | ≥ 3       | 6      |
| `grep -c "for..of\|for..in"` (T-03-02-03)     | == 0      | 0      |
| `wc -l`                                       | ≥ 80      | 119    |
| `npx eslint`                                  | 0 errors  | 0 errors / 0 warnings |
| `npm run build`                               | exit 0    | exit 0 |

## Threat Model Disposition

| Threat                                                                                              | Status     | Evidence                                                                  |
| --------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------- |
| T-03-02-01 (XSS via `districtName` interpolation)                                                   | mitigated  | Mustache `{{ }}` only; `grep -c v-html == 0`                              |
| T-03-02-02 (DoS via non-finite `toFixed` crash)                                                     | mitigated  | `fmt()` + `rankLabel` both guard via `Number.isFinite`; renders `—`       |
| T-03-02-03 (Information disclosure via accidental row dump)                                         | mitigated  | Template hardcodes 5 fields; no `v-for (k,v) of row` patterns             |
| T-03-02-04 / 05                                                                                     | n/a        | No repudiation or privilege surface                                       |

## Deviations from Plan

None — plan executed exactly as written.

The `<action>` block was pasted verbatim. ESLint `--fix` autoformatted the `<template>` block per `vue/singleline-html-element-content-newline` (expected per plan's "Vue auto-format may convert `<template>` to 2-space; that's fine"). Final file is 119 lines vs ~95 estimate — all extra lines are template formatting whitespace, no logic changes.

## Commits

- `934f5bb` `feat(03-02): add DistrictPopup.vue (popup body for hover interaction)` — single file, 119 insertions

## Handoff to Plan 03-04

Plan 03-04 consumes this via:
```js
import DistrictPopup from "../components/crosscompare/DistrictPopup.vue";
createApp(DistrictPopup, {
  districtName,
  rank,
  totalScore,
  courseScore,
  inspectionScore,
}).mount("#crosscompare-popup-mount");
```

The 5 camelCase props exactly match Plan 03-04's expected callsite shape. Snake→camel mapping happens at the callsite (Plan 03-04), NOT in this SFC.

## Self-Check: PASSED

- File `Taipei-City-Dashboard-FE/src/components/crosscompare/DistrictPopup.vue`: FOUND (119 lines)
- Commit `934f5bb`: FOUND (`git log --all` confirmed)
- All gate thresholds met
- `npm run build` exit 0
