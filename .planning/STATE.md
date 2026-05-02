---
gsd_state_version: 1.0
milestone: v2.3
milestone_name: Cross-Compare Hexbin Heatmap
status: executing
last_updated: "2026-05-02T18:52:56.406Z"
last_activity: 2026-05-02
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 6
  completed_plans: 0
  percent: 0
---

# State — Milestone v2.3 (Cross-Compare Hexbin Heatmap)

## Current Position

- **Phase:** 2 (FE Cross-Compare Page) — context gathered, ready for plan
- **Context:** `.planning/phases/02-fe-cross-compare-page/02-CONTEXT.md`
- **Status:** Ready to execute
- **Last activity:** 2026-05-02

## Active Phase

Phase 2 — FE Cross-Compare Page (CC-01, CC-02, CC-03)

## Accumulated Context

### Decisions logged

- New top-level route `/crosscompare` (NOT synthetic-index hack)
- BE-side score storage + endpoint, no client aggregation
- **District-level, NOT hex** — real fixture data is district-aggregated; reuse existing `tp_district` + `metrotaipei_town` Mapbox vector tiles (no PostGIS, no hex generation) [2026-05-03]
- Stay on installed deck.gl 9 + turf 6.5 + mapbox-gl 3 (no new packages)
- Two view modes (台北 / 雙北) with grey-out, not side-by-side dual canvas
- Hover "levitate" via deck.gl extrusion transition OR Mapbox feature-state (Phase 3 picks)
- v1 BE seeded from `.planning/fixtures/crosscompare_scores_v1.json` (41 rows)

### Blockers

(none)

### Pending todos for next phase

- Confirm property name on `tp_district` + `metrotaipei_town` vector tiles for the district join (could be `district_name`, `name`, `TOWNNAME`)
- Canonicalise 臺/台 character variants when joining BE scores to vector tile features
- Confirm with user before deleting `Taipei-City-Dashboard-FE/src/make-new-thing-here/` in Phase 3

## Next Step

```
/gsd-plan-phase 2
```

Phase 2 (FE Cross-Compare Page) plans the new Vue route, dedicated `crossCompareStore.js`, the Mapbox-native fill layers (with feature-state seam for Phase 3 hover), the floating toggle/legend chrome, and runtime discovery of the vector-tile join key with 臺/台 normalization.
