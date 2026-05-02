---
project: taipei-city-dashboard
milestone: v2.3
milestone_name: Cross-Compare Hexbin Heatmap
status: planning
generated: 2026-05-03
last_updated: 2026-05-03
progress:
  phases_total: 3
  phases_complete: 0
  requirements_total: 6
  requirements_complete: 0
---

# State — Milestone v2.3 (Cross-Compare Hexbin Heatmap)

## Current Position

- **Phase:** Not started (planning complete, awaiting `/gsd-plan-phase 1`)
- **Plan:** —
- **Status:** Ready for Phase 1 planning
- **Last activity:** 2026-05-03 — Project initialized, milestone v2.3 scoped, roadmap approved

## Active Phase

(none yet)

## Accumulated Context

### Decisions logged
- New top-level route `/crosscompare` (NOT synthetic-index hack)
- BE-side region storage + endpoint, no client aggregation
- Stay on installed deck.gl 9 + turf 6.5 + mapbox-gl 3 (no new packages)
- Two view modes (台北 / 雙北) with grey-out, not side-by-side dual canvas
- Hover "levitate" via deck.gl extrusion transition
- Fake/seeded scores OK for v1

### Blockers
(none)

### Pending todos for next phase
- Verify `CREATE EXTENSION postgis;` is present in `postgres-data` `dashboard` DB before Phase 1 schema work
- Confirm with user before deleting `Taipei-City-Dashboard-FE/src/make-new-thing-here/` in Phase 3

## Next Step

```
/gsd-plan-phase 1
```

Phase 1 (BE Hex Region API) plans the GORM model, controller, route registration, and seed-data SQL.
