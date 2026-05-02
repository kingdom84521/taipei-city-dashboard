---
gsd_state_version: 1.0
milestone: v2.3
milestone_name: Cross-Compare Hexbin Heatmap
status: phase-2-shipped-pending-browser-smoke
last_updated: "2026-05-03T00:00:00.000Z"
last_activity: 2026-05-03 — Phase 2 (FE Cross-Compare Page) shipped end-to-end; build passes; browser smoke deferred (Vite cache root-owned)
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 7
  completed_plans: 7
  percent: 67
---

# State — Milestone v2.3 (Cross-Compare Hexbin Heatmap)

## Current Position

- **Phase 1 (BE District Score API):** COMPLETE ✓
- **Phase 2 (FE Cross-Compare Page):** SHIPPED ✓ — all 6 plans complete, `npm run build` passes, 19/19 D-IDs evidenced in source. **Browser smoke deferred** pending the user resolving the root-owned `Taipei-City-Dashboard-FE/node_modules/.vite/deps` cache (see "Open verification" below).
- **Phase 3 (Hover Interaction & Polish):** Not yet discussed — recommended to wait until Phase 2 browser smoke confirms baseline before starting.

## Active Phase

(none — Phase 2 shipped, awaiting user browser smoke; Phase 3 not yet started)

## Accumulated Context

### Phase 2 deliverables on disk

- `Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` (new — Mapbox-mounted view, own `mapboxgl.Map` instance, `promoteId: "TNAME"` seam for Phase 3 hover)
- `Taipei-City-Dashboard-FE/src/store/crossCompareStore.js` (new — Pinia store: scores fetch, viewMode + localStorage whitelist, derived enabled/disabled district sets)
- `Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js` (new — colour-ramp + paint expression builders, `normalizeDistrictKey()` for 臺/台)
- `Taipei-City-Dashboard-FE/src/components/crosscompare/ViewToggle.vue` (new — floating top-left pill toggle)
- `Taipei-City-Dashboard-FE/src/components/crosscompare/RampLegend.vue` (new — floating bottom-right legend)
- `Taipei-City-Dashboard-FE/src/router/index.js` (edited — `/crosscompare` route)
- `Taipei-City-Dashboard-FE/src/components/utilities/bars/NavBar.vue` (edited — `跨區比較` link)

### Phase 2 commit window

- Phase 1 boundary: `4f05999`
- Phase 2 last commit: `36da7e8` (acceptance SUMMARY)
- 23 commits across plans 02-01..02-06 (16 source + 6 docs + 1 lint fix)

### Decisions logged (cumulative)

- New top-level route `/crosscompare` (NOT synthetic-index hack)
- BE-side score storage + endpoint, no client aggregation
- District-level, NOT hex — reuse existing `tp_district` + `metrotaipei_town` Mapbox vector tiles
- Single source layer for both modes: `metrotaipei_town` (covers all 41 districts) — D-19
- Vector tile join key confirmed: `TNAME` (verified via existing label layers in mapConfig.js)
- Mapbox-native fill paint via `interpolate-hcl`; greyed via second fill layer with inverted filter
- Phase 3 hover seam: `promoteId: "TNAME"` + `setFeatureState` on the same source — already wired
- mapStore.js / mapConfig.js / dark_map_style.json (the last doesn't exist) UNTOUCHED throughout Phase 2

### Blockers

- **Environmental (not Phase 2 code):** `Taipei-City-Dashboard-FE/node_modules/.vite/deps` is owned by root from a prior `sudo` run, blocking `npm run dev`. Production `npm run build` is unaffected and passes.
- **Pre-existing working tree dirty change** at `Taipei-City-Dashboard-FE/src/assets/configs/mapbox/mapConfig.js` line 165 (one-character source-layer ID rename for `taipei_building_3d`) — predates Phase 2 and was deliberately not touched. User's call whether to commit/revert/stash separately.

## Open verification (deferred to user)

Browser smoke of the 4 ROADMAP success criteria + 8-step interaction checklist:

1. Resolve the Vite cache permission issue:
   - `sudo chown -R $USER Taipei-City-Dashboard-FE/node_modules/.vite` then `cd Taipei-City-Dashboard-FE && DOCKER_COMPOSE=false npm run dev`
   - OR `sudo rm -rf Taipei-City-Dashboard-FE/node_modules/.vite` then `cd Taipei-City-Dashboard-FE && npm install && npm run dev`
   - OR full Docker stack: `docker network create br_dashboard 2>/dev/null; docker compose -f docker/docker-compose-db.yaml up -d; docker compose -f docker/docker-compose.yaml up -d`
2. Visit `http://localhost:80/crosscompare` (Vite) or `http://localhost:8080/crosscompare` (Docker)
3. Verify the 4 ROADMAP success criteria:
   - #1 page resolves with Mapbox map centred on 雙北 (no 404, no MapView fallback)
   - #2 NavBar shows `跨區比較` between `儀表板總覽` and `地圖交叉比對`
   - #3 toggle 台北 ↔ 雙北 swaps greyed set within < 200ms; greyed districts at #3a3a3a / 0.35 opacity
   - #4 中正區 (63.88) brightest band; 萬華區 (10.62) dimmest; coverage matches the 12/41 BE payload
4. Network tab: exactly ONE request to `/api/v1/crosscompare/scores?view=metrotaipei` returning 41 rows; toggling does NOT trigger a second request
5. localStorage round-trip: refresh after toggling — selection persists; manual tampering with invalid value falls back to default

## Next Step

```
# After browser smoke succeeds:
/gsd-discuss-phase 3 --auto
```

Phase 3 (Hover Interaction & Polish) adds the levitate hover animation + popup using the `promoteId: "TNAME"` seam already shipped in Phase 2, and removes the `make-new-thing-here` injection slot now that the real `/crosscompare` route exists. The `store.disabledDistricts` getter is the contract Phase 3's hover handler MUST consult to honour the non-interactive grey-out semantics.
