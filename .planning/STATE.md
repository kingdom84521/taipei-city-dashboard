---
gsd_state_version: 1.0
milestone: v2.3
milestone_name: Cross-Compare Hexbin Heatmap
status: Ready for Phase 2 (FE Cross-Compare Page)
last_updated: "2026-05-02T18:21:14.000Z"
last_activity: 2026-05-03 — Phase 1 shipped; CC-05 + CC-06 verified end-to-end (`GET /api/v1/crosscompare/scores?view=` returns 41/12 rows, view whitelist enforced, public-readable)
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# State — Milestone v2.3 (Cross-Compare Hexbin Heatmap)

## Current Position

- **Phase:** 1 (BE District Score API) — **COMPLETE** ✓
- **Plan:** `.planning/phases/01-be-district-score-api/PLAN.md`
- **Status:** Ready for Phase 2 (FE Cross-Compare Page)
- **Last activity:** 2026-05-03 — Phase 1 shipped; CC-05 + CC-06 verified end-to-end (`GET /api/v1/crosscompare/scores?view=` returns 41/12 rows, view whitelist enforced, public-readable)

## Active Phase

(none yet)

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
/gsd-plan-phase 1
```

Phase 1 (BE Hex Region API) plans the GORM model, controller, route registration, and seed-data SQL.
