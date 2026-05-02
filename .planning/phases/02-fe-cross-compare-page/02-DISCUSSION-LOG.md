# Phase 2: FE Cross-Compare Page - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-03
**Phase:** 2-FE Cross-Compare Page
**Areas discussed:** Render & hover substrate, Map instance & store architecture, Page chrome, Colour ramp & greyed-out
**Mode:** `--auto` — Claude selected recommended option for every gray area; no interactive question rounds.

---

## Render & Hover Substrate

| Option | Description | Selected |
|--------|-------------|----------|
| Mapbox `match`/`interpolate` paint on a NEW fill layer reusing existing vector sources | Phase 3 swaps to `fill-extrusion-height` driven by `feature-state` | ✓ |
| deck.gl `PolygonLayer` over `MVTLayer` reading the same vector tiles | `getElevation` transitions for hover | |
| Hybrid: Mapbox for fill, deck.gl overlay only for the lifted/popup district | More moving parts, two layer systems to coordinate | |

**Selected:** Mapbox-native fill + Phase 3 feature-state-driven extrusion.
**Notes:** `@deck.gl/geo-layers` (needed for `MVTLayer`) is not installed and adding it violates the no-new-packages constraint. Mapbox-native paint expressions are zero added JS overhead, render natively, and `setFeatureState` + `fill-extrusion-height` gives smooth GPU-driven hover transitions without coordinating two layer systems. Sets up the cleanest seam for Phase 3.

---

## Map Instance & Store Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| New independent `mapboxgl.Map` instance in CrossCompareView + new `crossCompareStore.js` | mapStore untouched — full isolation | ✓ |
| Reuse `mapStore.js` singleton with a "crossCompare mode" branch | Single map instance app-wide | |
| Hybrid: dedicated store, but mount fresh Mapbox instance | Same outcome as option 1 with extra ceremony | |

**Selected:** Independent map instance + dedicated `crossCompareStore.js`.
**Notes:** `mapStore` is heavy and dashboard-coupled (chart-component layers, deck.gl overlay registry, popup state). Pulling cross-compare into it would pollute a critical store and create regression risk on `/dashboard` and `/mapview`. ROADMAP already proposes the dedicated store. The duplicated ~100 LOC of map setup is worth the isolation.

---

## Page Chrome Around the Map

| Option | Description | Selected |
|--------|-------------|----------|
| Bare full-bleed map; floating toggle top-left; floating colour-ramp legend bottom-right | Popup (Phase 3) carries per-district detail | ✓ |
| Sidebar with ranked district list (top-12 / top-41 with current view) | Visible ranking but clutters the map view | |
| Top header with legend + view toggle | More structured but less map-first | |

**Selected:** Bare full-bleed with floating toggle + floating legend.
**Notes:** Matches existing `MapView` aesthetic and PROJECT.md's "map-first" core value. 41-row sidebar is clutter; ranked info will live in the hover popup (Phase 3). Legend is essential for choropleth readability — kept small and floating, not as a full header.

---

## Colour Ramp & Greyed-out Treatment

| Option | Description | Selected |
|--------|-------------|----------|
| Single-hue sequential teal-cyan ramp via `interpolate-hcl` on `total_score`; greyed = `#3a3a3a` @ 0.35 opacity | Single-hue is correct visual encoding for ordinal score; teal-cyan reads on dark theme | ✓ |
| Multi-hue spectrum (yellow → red) | Categorical-feeling on what is actually ordinal data | |
| You decide | Folded into the recommended option | |

**Selected:** Single-hue teal-cyan sequential, `interpolate-hcl`, runtime-computed domain from fetched scores. Greyed districts are flat dark grey at low opacity, non-interactive.
**Notes:** Existing app theme is dark — the `dark_map_style.json` style is the default. Single-hue sequential properly encodes ordinal score (low → desaturated, high → bright). `#1a3a3f` → `#5dffe6` chosen for readability without clashing with dashboard chart accents. Domain computed at runtime (`Math.min/Math.max` over the 41-row payload) so future fixture refresh doesn't break the legend.

---

## Claude's Discretion

The following Phase-2 decisions were made entirely by Claude under `--auto` and are flagged here for review:

- Default view mode on first load = `metrotaipei` (richer 41-district view)
- View mode persisted in `localStorage` under key `crossCompare.viewMode`
- Colour ramp endpoints: `#1a3a3f` (low) → `#5dffe6` (high). Could shift to match a different brand accent if the team has a preference.
- NavBar label for the new entry deferred to plan-phase (suggestion: `跨區比較`)
- Initial map center/zoom: `[121.55, 25.07]` @ z9.5 — derived from 雙北 bbox, not measured
- Discovery strategy for the vector-tile join key: runtime probe via `map.querySourceFeatures` after `style.load`, log a sample feature, hardcode the discovered key. Alternative considered: hardcode best-guess (`name` or `district_name`) and fall back. Probe-first is safer.

## Deferred Ideas

- Hover levitate animation + popup — Phase 3 (CC-04)
- Removal of `make-new-thing-here` injection slot — Phase 3
- Cross-fade animation between view modes — defer pending user feedback on instant swap
- Sidebar with ranked-district list — rejected for Phase 2; could resurface as future "compare panel"
- 3D extrusion based on score at rest — out of scope per REQUIREMENTS.md
- Real ETL pipeline for scores — separate future milestone
- Mobile-narrow responsive layout — out of scope for v2.3
