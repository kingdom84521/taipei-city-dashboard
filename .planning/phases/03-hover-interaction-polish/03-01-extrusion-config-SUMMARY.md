---
phase: 03-hover-interaction-polish
plan: 01
subsystem: frontend / mapbox-rendering
tags: [crosscompare, mapbox, fill-extrusion, config, hover-prep]
requirements: [CC-04]
wave: 1
type: execute
status: complete

dependency_graph:
  requires:
    - "Phase 2 — `metrotaipei_town` source w/ `promoteId: 'TNAME'`, `crosscompare_fill_active` layer, `buildFillPaint()` helper, `useCrossCompareStore` exposing `rampDomain` + `scoreByDistrict` (all already shipped)"
  provides:
    - "Config-side primitives for CC-04 levitate animation: `CROSSCOMPARE_EXTRUSION_LAYER_ID`, `EXTRUSION_HEIGHT_HOVER` (4000 m), `EXTRUSION_TRANSITION_MS` (150 ms), `buildExtrusionPaint(domain, scoreByDistrict)`"
    - "Layer-side: a `type: 'fill-extrusion'` companion layer registered in `addCrossCompareLayers()` above the existing flat active fill, invisible at rest (`fill-extrusion-height: 0`)"
  affects:
    - "Plan 03-04 (Wave 2) will consume the contract by calling `map.setFeatureState({source, sourceLayer, id: districtName}, {hover: true|false})`; Mapbox's built-in `fill-extrusion-height-transition` does the 150 ms cubic ease without further JS"

tech-stack:
  added: []  # no new packages
  patterns:
    - "Mapbox paint expression `case + feature-state` + companion `*-transition` paint property (NEW pattern for this codebase — Concern 2 in 03-PATTERNS.md)"

key-files:
  created: []
  modified:
    - "Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js (157 → 198 lines, +41)"
    - "Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue (220 → 273 lines, +12 / wc -l shows 273 incl. template+style)"

decisions:
  - "D-02 honoured: companion `fill-extrusion` layer ABOVE the existing flat `crosscompare_fill_active` (NOT replacement). Flat layer continues to drive colour at rest."
  - "D-03 honoured: constant 4000 m lift, encoded as `case` on `feature-state.hover` (NOT score-scaled, NOT `setPaintProperty`-mutated)."
  - "D-04 honoured: 150 ms transition via the `fill-extrusion-height-transition` paint property (50 ms margin under the CC-04 < 200 ms acceptance)."
  - "D-05 honoured: `fill-extrusion-color` reuses the same `interpolate-hcl` expression as `buildFillPaint` (lifted top + sides keep score colour)."
  - "Encapsulation choice: `EXTRUSION_HEIGHT_HOVER` and `EXTRUSION_TRANSITION_MS` are NOT imported into `CrossCompareView.vue` — they are consumed only inside `buildExtrusionPaint()`'s body (which lives in the config module). Importing them into the view would have triggered ESLint `no-unused-vars` (error level per `eslint.config.js`) since Plan 03-04's hover handler also does not need them (it sets `feature-state.hover`; the paint expression handles the height swap)."

metrics:
  duration_minutes: 4
  tasks_completed: 2
  files_modified: 2
  loc_added: 53
  completed_at: "2026-05-03"
---

# Phase 3 Plan 01: Extrusion Config & Companion Layer — Summary

Lift-on-hover plumbing for CC-04 — config exports a Mapbox `fill-extrusion` paint builder driven by `feature-state.hover`, and the Cross-Compare view registers the companion layer at height 0 above the existing flat fill. No event wiring, no `setFeatureState` — that lands in Plan 03-04.

## What Shipped

### `Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js` (+41 LOC)

Inserted after the layer-id block (Phase 2 line 32):

```js
export const CROSSCOMPARE_EXTRUSION_LAYER_ID = "crosscompare_extrusion_active";
export const EXTRUSION_HEIGHT_HOVER = 4000;     // 公尺（hover 時的 levitate 高度）
export const EXTRUSION_TRANSITION_MS = 150;     // < 200ms（D-04 + 預留餘裕）
```

Appended at end of file:

```js
export function buildExtrusionPaint(domain, scoreByDistrict) {
    const fillPaint = buildFillPaint(domain, scoreByDistrict);
    return {
        "fill-extrusion-color": fillPaint["fill-color"],
        "fill-extrusion-opacity": 0.85,
        "fill-extrusion-height": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            EXTRUSION_HEIGHT_HOVER,
            0,
        ],
        "fill-extrusion-height-transition": {
            duration: EXTRUSION_TRANSITION_MS,
            delay: 0,
        },
    };
}
```

The JSDoc on `buildExtrusionPaint` flags PATTERNS Concern 2 explicitly — height MUST animate via `case + feature-state`, never via imperative `setPaintProperty`. Future maintainers see the rationale inline.

### `Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` (+12 LOC)

- Import block extended with exactly two new symbols: `CROSSCOMPARE_EXTRUSION_LAYER_ID`, `buildExtrusionPaint`.
- `addCrossCompareLayers()` gains a 4th `addLayer` call as the highest-z layer.

```js
// 4. extrusion layer (上層) — D-02：與 active fill 共生，由 feature-state.hover 驅動
//    paint 表達式 + transition 一併設定；JS 端只透過 setFeatureState 改 hover 狀態（Plan 03-04）
//    rest 時 fill-extrusion-height = 0 → 視覺上與 Phase 2 平面 fill 完全一致
map.addLayer({
    ...baseLayer,
    id: CROSSCOMPARE_EXTRUSION_LAYER_ID,
    type: "fill-extrusion",
    paint: buildExtrusionPaint(store.rampDomain, store.scoreByDistrict),
});
```

Layer order in `addCrossCompareLayers()` is now: greyed fill → active flat fill → greyed line → extrusion. The extrusion's `fill-extrusion-height` is 0 at rest, so visually the page is identical to Phase 2's output.

## Encapsulation Note (audit-relevant)

`EXTRUSION_HEIGHT_HOVER` and `EXTRUSION_TRANSITION_MS` stay encapsulated inside `crossCompareConfig.js`. They are referenced exclusively inside `buildExtrusionPaint()`'s body. The view does NOT import them — only `CROSSCOMPARE_EXTRUSION_LAYER_ID` and `buildExtrusionPaint` are pulled in. This is deliberate:

- Plan 03-04's hover handler will not need the raw numerics either; it calls `setFeatureState({...}, { hover: true|false })` and lets the paint expression resolve to 4000 or 0 internally.
- ESLint `no-unused-vars` is at error level (`eslint.config.js`) — pulling in unused constants would have failed `npm run build`.

If Plan 03-04 (or any future plan) ever needs the raw 4000 / 150 numbers, they're still public exports from the config module.

## Verification (gate evidence)

All gates from the plan executed against the post-commit tree:

| Gate | File | Expected | Got |
| --- | --- | --- | --- |
| `grep -c "CROSSCOMPARE_EXTRUSION_LAYER_ID"` | `crossCompareConfig.js` | ≥ 1 | **1** |
| `grep -c "EXTRUSION_HEIGHT_HOVER"` | `crossCompareConfig.js` | ≥ 2 | **4** (declaration + JSDoc + builder body + comment) |
| `grep -c "EXTRUSION_TRANSITION_MS"` | `crossCompareConfig.js` | ≥ 2 | **3** |
| `grep -c "buildExtrusionPaint"` | `crossCompareConfig.js` | ≥ 1 | **1** |
| `grep -c "fill-extrusion-height-transition"` | `crossCompareConfig.js` | ≥ 1 | **1** |
| `grep -c "feature-state"` | `crossCompareConfig.js` | ≥ 1 | **4** |
| `grep -c "buildFillPaint"` (Phase 2 still present) | `crossCompareConfig.js` | ≥ 2 | **3** |
| `grep -c "CROSSCOMPARE_EXTRUSION_LAYER_ID"` | `CrossCompareView.vue` | ≥ 2 | **2** (import + use) |
| `grep -c "buildExtrusionPaint"` | `CrossCompareView.vue` | ≥ 2 | **2** (import + call) |
| `grep -c "fill-extrusion"` | `CrossCompareView.vue` | ≥ 1 | **2** |
| `grep -c 'type: "fill-extrusion"'` | `CrossCompareView.vue` | ≥ 1 | **1** |
| `grep -E "^\s*EXTRUSION_HEIGHT_HOVER,"` (NEG) | `CrossCompareView.vue` | empty | **empty** ✓ |
| `grep -E "^\s*EXTRUSION_TRANSITION_MS,"` (NEG) | `CrossCompareView.vue` | empty | **empty** ✓ |
| `grep -cE "applyEnabledFilter|applyActivePaint|probeJoinKey"` (Phase 2 surface) | `CrossCompareView.vue` | ≥ 3 | **10** |
| `npm run build` exit code | — | 0 | **0** (`✓ built in 7.61s`, eslint --fix clean) |

Phase 2 boundary (D-20) preserved — the commit touches only the two intended files; staged diff:

```
.../src/assets/configs/crossCompareConfig.js       | 41 ++++++++++++++++++++++
.../src/views/CrossCompareView.vue                 | 12 +++++++
2 files changed, 53 insertions(+)
```

Pre-existing dirt in `mapConfig.js` (line 165) and the orchestrator's STATE.md edits remained unstaged and untouched per execution rules.

## Plan 03-04 Hand-off

Plan 03-04 (Wave 2) consumes the contract this plan ships by:

1. Importing `CROSSCOMPARE_SOURCE_ID`, `CROSSCOMPARE_SOURCE_LAYER`, `CROSSCOMPARE_FILL_LAYER_ID` (already there from Phase 2).
2. Binding `mousemove` / `mouseenter` / `mouseleave` handlers to `CROSSCOMPARE_FILL_LAYER_ID` (D-12 — events bind to the active fill, NOT the extrusion).
3. Calling `map.setFeatureState({source, sourceLayer, id: districtName}, {hover: true|false})`.

Mapbox then resolves the paint expression baked here to 4000 (hover) or 0 (rest) and animates it over 150 ms. Plan 03-04 needs zero knowledge of the raw `EXTRUSION_HEIGHT_HOVER` / `EXTRUSION_TRANSITION_MS` numbers.

## Deviations from Plan

None — plan executed exactly as written. Patched plan (with the Task 2 import-list correction) was followed verbatim.

## Threat Flags

None — no new trust boundaries crossed; constants are static numeric literals; no user input flows into paint expressions.

## Commits

- `5986fcd` — `feat(03-01): add fill-extrusion companion layer + buildExtrusionPaint config helper`

## Self-Check: PASSED

- `Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js` — FOUND
- `Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` — FOUND
- Commit `5986fcd` — FOUND in `git log`
- All grep gates passed
- `npm run build` exit 0
