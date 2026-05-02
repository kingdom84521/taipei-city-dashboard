---
gsd_state_version: 1.0
milestone: v2.3
milestone_name: Cross-Compare Hexbin Heatmap
status: milestone-v2.3-shipped-pending-browser-smoke
last_updated: "2026-05-03T00:00:00.000Z"
last_activity: 2026-05-03 — Milestone v2.3 all 3 phases shipped; build passes; browser smoke deferred (Vite cache root-owned)
progress:
  total_phases: 3
  completed_phases: 3
  total_plans: 11
  completed_plans: 11
  percent: 100
---

# State — Milestone v2.3 (Cross-Compare Hexbin Heatmap)

## Current Position

- **Phase 1 (BE District Score API):** COMPLETE ✓
- **Phase 2 (FE Cross-Compare Page):** SHIPPED ✓ — 6 plans complete, build passes, 19/19 D-IDs evidenced
- **Phase 3 (Hover Interaction & Polish):** SHIPPED ✓ — 5 plans complete, build passes, 23/23 D-IDs evidenced, all 3 ROADMAP criteria addressable, `make-new-thing-here` grep-zero achieved

**Milestone v2.3 implementation is complete.** Browser smoke for both phases is deferred pending the user resolving the root-owned `Taipei-City-Dashboard-FE/node_modules/.vite/deps` cache (environmental, not code).

## Active Phase

(none — milestone v2.3 implementation complete; awaiting user browser smoke before milestone close)

## Accumulated Context

### Phase 2 deliverables (Wave 1 + 2 + 3)

- `Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` (new in P2; extended in P3 with hover handler + extrusion layer)
- `Taipei-City-Dashboard-FE/src/store/crossCompareStore.js` (P2 — scores, viewMode, derived sets)
- `Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js` (P2; extended in P3 with extrusion constants + `buildExtrusionPaint`)
- `Taipei-City-Dashboard-FE/src/components/crosscompare/ViewToggle.vue` (P2)
- `Taipei-City-Dashboard-FE/src/components/crosscompare/RampLegend.vue` (P2)
- `Taipei-City-Dashboard-FE/src/router/index.js` (P2 edit — `/crosscompare` route)
- `Taipei-City-Dashboard-FE/src/components/utilities/bars/NavBar.vue` (P2 edit — `跨區比較` link)

### Phase 3 deliverables

- `Taipei-City-Dashboard-FE/src/components/crosscompare/DistrictPopup.vue` (NEW — popup body SFC with 5 camelCase props)
- Extrusion companion layer (`crosscompare_extrusion_active`) in CrossCompareView.vue — height 0 at rest, 4000m on `feature-state.hover`, 150ms transition
- Hover handler in CrossCompareView.vue — `setFeatureState` + Mapbox Popup mounting `DistrictPopup` via `createApp`; layer-scoped events on `crosscompare_fill_active` ONLY
- Paired teardown (popupApp.unmount → popup.remove → map.remove)
- `make-new-thing-here` removed from MapView.vue + SideBar.vue + contentStore.js (6 sites total) + directory deleted; v-else-if cascade trap fixed

### Phase 3 commit window

- Phase 2 boundary: `5f464d8`
- Phase 3 last commit: `b8414ae` (per-plan SUMMARYs picked up)
- ~16 commits across plans 03-01..03-05 (plus planning + corrections)

### Cumulative decisions

- New top-level route `/crosscompare` (NOT synthetic-index hack)
- BE-side score storage + endpoint, no client aggregation
- District-level, NOT hex — reuse existing `tp_district` + `metrotaipei_town` Mapbox vector tiles
- Single source layer for both modes: `metrotaipei_town` (covers all 41 districts)
- Join key: `TNAME`
- Mapbox-native fill via `interpolate-hcl`; greyed via second fill layer with inverted filter
- Hover: Mapbox `feature-state` + `fill-extrusion-height` (NOT deck.gl extrusion)
- Popup: Vue SFC body mounted into Mapbox Popup container via `createApp`; XSS-safe via Vue interpolation
- mapStore.js / mapConfig.js / mapStyle.js UNTOUCHED throughout v2.3

### Blockers

- **Environmental (not code):** `Taipei-City-Dashboard-FE/node_modules/.vite/deps` is owned by root from a prior `sudo` run, blocking `npm run dev`. Production `npm run build` is unaffected and passes.
- **Pre-existing working tree dirty change** at `Taipei-City-Dashboard-FE/src/assets/configs/mapbox/mapConfig.js` line 165 (one-character source-layer ID rename for `taipei_building_3d`) — predates v2.3, deliberately not touched by either phase. User's call whether to commit/revert/stash separately.

## Open verification (deferred to user)

Browser smoke for both Phase 2 (4 ROADMAP criteria) and Phase 3 (3 ROADMAP criteria + hover-popup interaction):

1. Resolve the Vite cache permission issue (pick one):
   - `sudo chown -R $USER Taipei-City-Dashboard-FE/node_modules/.vite` then `cd Taipei-City-Dashboard-FE && DOCKER_COMPOSE=false npm run dev`
   - OR `sudo rm -rf Taipei-City-Dashboard-FE/node_modules/.vite` then `cd Taipei-City-Dashboard-FE && npm install && npm run dev`
   - OR full Docker stack: `docker network create br_dashboard 2>/dev/null; docker compose -f docker/docker-compose-db.yaml up -d; docker compose -f docker/docker-compose.yaml up -d`

2. Visit `http://localhost:80/crosscompare` (Vite) or `http://localhost:8080/crosscompare` (Docker).

3. Phase 2 criteria (4):
   - #1 page resolves with Mapbox map centred on 雙北 (no 404)
   - #2 NavBar shows `跨區比較` between `儀表板總覽` and `地圖交叉比對`
   - #3 toggle 台北 ↔ 雙北 swaps greyed set within < 200ms; greyed districts at `#3a3a3a` @ 0.35 opacity
   - #4 中正區 (63.88) brightest band; 萬華區 (10.62) dimmest; coverage 12/41

4. Phase 3 criteria (3):
   - #1 hover an enabled district → visible elevation lift (transition < 200ms) + popup `區名 / #rank / total_score / course / inspection`. Sample: hovering 中正區 shows `中正區 / #1 / 63.9 / 28.1 / 35.8`
   - #2 in 台北 view, hover a 新北 district (e.g. 烏來區) → NOTHING (no lift, no popup, no cursor change)
   - #3 navigate `/crosscompare → /dashboard → /crosscompare` → no console errors, no leaked Vue/Mapbox instances

5. Network tab: exactly ONE request to `/api/v1/crosscompare/scores?view=metrotaipei` per page mount; toggle does NOT trigger second request; localStorage `crossCompare.viewMode` round-trip works on refresh.

## Next Step

After browser smoke confirms both phases:

```
/gsd-complete-milestone
```

Archives v2.3 phase artifacts and prepares for the next milestone. (If browser smoke surfaces an issue, run `/gsd-debug` against the affected acceptance criterion first.)
