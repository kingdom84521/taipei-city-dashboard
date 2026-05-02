---
project: taipei-city-dashboard
milestone: v2.3
generated: 2026-05-03
---

# Requirements — Milestone v2.3 (Cross-Compare Hexbin Heatmap)

## v2.3 Requirements

### Cross-Compare Page (CC)

- [ ] **CC-01**: User can navigate from the main NavBar to a new top-level page at `/crosscompare`. The link uses `<router-link>` like the existing `/dashboard` and `/mapview` entries.
- [ ] **CC-02**: User can switch the view between "台北" (Taipei only) and "雙北" (Taipei + New Taipei) using a visible toggle on the page. When "台北" is active, 新北 hexes render greyed-out and do not respond to hover.
- [ ] **CC-03**: User sees the active region (or both regions in 雙北 mode) covered with hex polygons. Each hex is filled with a colour from a sequential ramp keyed to its `score` property. The ramp must be readable on the existing dark map theme.
- [ ] **CC-04**: User hovers an enabled hex → that hex visually "levitates" (extrusion lift / scale animation, transition < 200ms via deck.gl `updateTriggers`) and a popup shows the region name + score. Hover on disabled hexes does nothing.
- [ ] **CC-05**: Backend serves `GET /api/v1/crosscompare/hex?view={taipei|metrotaipei}` returning `application/json` GeoJSON `FeatureCollection`. Each feature: `{ type: "Feature", properties: { region_id, region_name, city, score }, geometry: <Polygon> }`. Status `200` with `{status, data}` envelope per existing BE convention.
- [ ] **CC-06**: Backend has a PostGIS-enabled table (e.g. `crosscompare_hex_region`) with a `GEOMETRY(Polygon, 4326)` column, seeded with at least one valid fixture covering 台北市 and 新北市 (fake scores OK). Idempotent SQL fixture lives under `db-sample-data/`.

## Future Requirements (deferred)

- Real scoring algorithm + ETL pipeline that populates `crosscompare_hex_region.score` from upstream open data
- Time-axis playback (score over time)
- Region-level click → drill-down to per-region detail
- Cross-comparison between two arbitrary metrics (split view)
- Mobile-narrow responsive layout

## Out of Scope (v2.3)

- Client-side hex aggregation (`@turf/hexGrid`) — BE supplies pre-shaped regions
- New FE packages — `@deck.gl/aggregation-layers`, `d3-hexbin`, `h3-js` explicitly disallowed
- 3D extrusion based on score value (only hover lift)
- Synthetic-index hack inside MapView (`make-new-thing-here` pattern is the anti-pattern this milestone explicitly fixes)
- Login wall — page is publicly readable

## Traceability

(filled in by roadmap)

| REQ-ID | Phase | Status |
|--------|-------|--------|
| CC-01 | Phase 2 | Pending |
| CC-02 | Phase 2 | Pending |
| CC-03 | Phase 2 | Pending |
| CC-04 | Phase 3 | Pending |
| CC-05 | Phase 1 | Pending |
| CC-06 | Phase 1 | Pending |

## Acceptance — How We Know We're Done

- `/crosscompare` resolves in dev (`http://localhost:8080/crosscompare`) and in prod build
- BE endpoint returns valid GeoJSON for both `view=taipei` and `view=metrotaipei`
- Toggle visibly switches enabled/disabled hex sets
- Hover on Taipei view, on a Taipei hex, lifts and shows score; hover on a New Taipei hex (in Taipei view) does nothing
- `npm run build` passes (eslint clean)
- `go build -v ./...` passes
