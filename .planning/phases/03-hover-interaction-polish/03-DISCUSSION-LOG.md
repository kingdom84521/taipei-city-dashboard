# Phase 3: Hover Interaction & Polish - Discussion Log

> **Audit trail only.** Decisions are captured in CONTEXT.md.

**Date:** 2026-05-03
**Phase:** 3-Hover Interaction & Polish
**Mode:** `--auto` — Claude resolved all gray areas with recommended options; no interactive question rounds.

---

## Levitate Animation Physics

| Option | Description | Selected |
|--------|-------------|----------|
| Constant lift (0 → 4000m) on hover, score-INDEPENDENT | Predictable visual; doesn't compete with the colour-ramp encoding | ✓ |
| Score-scaled lift (height proportional to total_score) | Adds a second visual encoding of the same dimension | |
| 3D extrusion at rest + extra lift on hover | Out of scope — PROJECT.md explicitly excludes this | |

**Selected:** Constant 4000m lift via Mapbox `feature-state` + `fill-extrusion-height` paint expression.
**Notes:** Resting elevation 0 keeps Phase 2's flat-fill rendering visually identical when nothing is hovered. Mapbox built-in `fill-extrusion-height-transition: { duration: 150 }` satisfies CC-04's "< 200ms" boundary with margin.

---

## Popup Positioning

| Option | Description | Selected |
|--------|-------------|----------|
| Cursor-anchored (`anchor: 'bottom'`, follows mousemove lng/lat) | Intuitive for hover popups | ✓ |
| Centroid-anchored (computed from polygon, anchor stays fixed) | Polygon centroid jitter on irregular shapes is visible | |
| District-edge-aware (snap to nearest edge) | Over-engineered for a polish phase | |

**Selected:** Cursor-anchored.

---

## Popup Content & Layout

| Option | Description | Selected |
|--------|-------------|----------|
| 區名 + #rank + total_score + 2-row grid (course / inspection) | Exactly matches CC-04 spec ("district name + total_score + rank + per-component scores") | ✓ |
| All 11 row fields | Info overload; defeats hover-popup purpose | |
| 區名 + total_score only | Drops rank + per-component scores from spec | |

**Selected:** 4-element layout. `value.toFixed(1)` for all three score fields. Rank as `#N` integer.

---

## Hover Handler Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Inline in CrossCompareView.vue + new DistrictPopup.vue SFC mounted via createApp into Mapbox Popup HTML container | ROADMAP "Touches" names DistrictPopup.vue; small enough to inline the handler; Vue gives XSS-safe interpolation by default | ✓ |
| Inline + Mapbox Popup with template-string HTML body (no Vue component) | Skips a SFC but loses Vue's auto-escape | |
| Extract `useCrossCompareHover.js` composable | Premature abstraction — only one consumer | |

**Selected:** Inline handler + Vue SFC popup, mounted into Mapbox Popup container.

---

## Cursor & Reset Behaviour

| Option | Description | Selected |
|--------|-------------|----------|
| pointer-cursor on enabled hover; restore on leave; rely on Mapbox transition for re-fall | Minimal code; consistent app feel | ✓ |
| Add outline halo + cursor + lift | Over-design for polish phase | |
| Custom CSS animation for re-fall | Mapbox transition handles it for free | |

**Selected:** Cursor toggle only; extrusion lift is the sole visual feedback.

---

## Non-Interactive Greyed Districts

| Option | Description | Selected |
|--------|-------------|----------|
| Bind hover events ONLY to `crosscompare_fill_active` layer | Structurally guarantees grey districts can't fire hover events; honours Phase 2 D-11 contract structurally instead of via Vue-level guard | ✓ |
| Bind to both layers + Vue-level early-return guard | Works but adds runtime check on every event | |

**Selected:** Layer-scoped event binding. Belt-and-suspenders via the `store.disabledDistricts.has(name)` check inside the handler in case the active filter ever drifts.

---

## make-new-thing-here Removal Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Delete dir (2 files) + remove 3 MapView.vue lines + remove SideBar.vue line 163; preserve historical context in deletion commit message body | Matches CC-04 acceptance #3 exactly; archaeology preserved via git log | ✓ |
| Delete + add a regression test for MapView | No test framework configured (CLAUDE.md) — would be dead test | |
| Soft-deprecate (leave files, add `[deprecated]` comment) | Doesn't satisfy "grep returns zero matches" acceptance | |

**Selected:** Hard delete; verification via grep gate at end of plan.

---

## Claude's Discretion (under --auto)

- Extrusion height = **4000m** (chosen for visible lift on the existing zoom level; could be 2000m or 6000m — final value tweakable in CSS-equivalent without code changes if visual feedback is too subtle / too dramatic)
- Transition duration = **150ms** (well under the 200ms CC-04 boundary; could go to 100ms or 200ms)
- Popup font sizes inherit from `var(--font-s)`, `var(--font-m)`, `var(--font-ms)` (matches RampLegend.vue family)
- Popup background = `var(--color-component-background)` for theme consistency
- Rank badge accent = `var(--color-highlight)` (orange-amber per existing dashboard chart accents)
- No outline halo, no click-to-pin, no drill-down panel — all deferred per spec scope

---

## Deferred Ideas

- Drill-down panel with full BE row (courses, inspected, not_inspected, inspection_rate, food_businesses) on click — future milestone
- Outline halo / glow on hover — out of scope for polish phase
- Click-to-pin popup — out of scope for v2.3
- Score-scaled extrusion at rest — explicitly out of scope per PROJECT.md
- Mobile-narrow responsive popup — out of scope for v2.3
- Cross-fade between view modes — Phase 2 deferral, may revisit
