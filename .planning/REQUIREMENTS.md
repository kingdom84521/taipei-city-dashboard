---
project: taipei-city-dashboard
milestone: v2.3
generated: 2026-05-03
last_updated: 2026-05-03
---

# Requirements — Milestone v2.3 (Cross-Compare District Score Heatmap)

> **Scope correction (2026-05-03):** Initial framing called this a "hexbin"
> heatmap. After receiving real data shape from TUIC team
> (`.planning/fixtures/crosscompare_scores_v1.json`), the actual unit is
> **administrative district** (41 rows: 12 臺北市 + 29 新北市), not hex bins.
> District polygon vector tiles already exist in `mapConfig.js` (`tp_district`,
> `metrotaipei_town`), so no PostGIS hex generation is needed. The milestone
> name still reads "hexbin" in MILESTONES.md for historical traceability — the
> deliverable is a **district choropleth** with the same UX (toggle + grey-out
> + levitate hover).

## v2.3 Requirements

### Cross-Compare Page (CC)

- [ ] **CC-01**: User can navigate from the main NavBar to a new top-level page at `/crosscompare`. The link uses `<router-link>` like the existing `/dashboard` and `/mapview` entries.
- [ ] **CC-02**: User can switch the view between "台北" (Taipei only) and "雙北" (Taipei + New Taipei) using a visible toggle on the page. When "台北" is active, 新北 districts render greyed-out and do not respond to hover/click.
- [ ] **CC-03**: User sees each enabled district filled with a colour from a sequential ramp keyed to `total_score`. Render uses the existing Mapbox vector source layers (`tp_district` for 臺北市, `metrotaipei_town` for 新北市 districts) — **no new vector tile uploads, no hex generation**. Colour ramp is readable on the existing dark map theme.
- [ ] **CC-04**: User hovers an enabled district → that district visually "levitates" (deck.gl extruded fill with `getElevation` transition < 200ms, OR Mapbox `feature-state` driven extrusion) and a popup shows district name + total_score + rank + per-component scores (course_score / inspection_score). Hover on greyed districts does nothing.
- [ ] **CC-05**: Backend serves `GET /api/v1/crosscompare/scores?view={taipei|metrotaipei}` returning `application/json` per existing `{status, data}` envelope. `data` is a flat array of `{ city, district, rank, courses, food_businesses, inspected, not_inspected, inspection_rate, course_score, inspection_score, total_score }`. Shape matches `.planning/fixtures/crosscompare_scores_v1.json` `all_districts_ranked[]`.
- [ ] **CC-06**: Backend has a regular (non-PostGIS) table `crosscompare_district_score` keyed by `(city, district)` with columns matching the row shape above. Idempotent SQL fixture under `db-sample-data/` seeds the v1 fake-but-realistic dataset from `.planning/fixtures/crosscompare_scores_v1.json`.

## Future Requirements (deferred)

- Real scoring algorithm + ETL pipeline that recomputes `total_score` from upstream open data on a schedule (Airflow DAG)
- Time-axis playback (score over time / score deltas)
- District click → drill-down panel with per-component breakdown chart
- Cross-comparison between two arbitrary metrics (e.g. score vs population density)
- Mobile-narrow responsive layout

## Out of Scope (v2.3)

- **Hex grid generation** — Original framing assumed hexbin; corrected to district-level. No `@deck.gl/aggregation-layers`, no `ST_HexagonGrid`.
- **PostGIS GEOMETRY column** — District polygons live in Mapbox vector tiles already. BE table holds scores only, no geometry.
- **New FE packages** — `@deck.gl/aggregation-layers`, `d3-hexbin`, `h3-js` explicitly disallowed.
- **3D extrusion based on score value at rest** — Only hover-triggered "levitate" animation. Resting state is flat fill.
- **Synthetic-index hack inside MapView** — `make-new-thing-here` pattern is the anti-pattern this milestone explicitly fixes.
- **Login wall** — Page is publicly readable like `/dashboard` is.

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| CC-01  | Phase 2 | Pending |
| CC-02  | Phase 2 | Pending |
| CC-03  | Phase 2 | Pending |
| CC-04  | Phase 3 | Pending |
| CC-05  | Phase 1 | Pending |
| CC-06  | Phase 1 | Pending |

## Acceptance — How We Know We're Done

- `/crosscompare` resolves in dev (`http://localhost:8080/crosscompare`) and in prod build
- BE endpoint returns 41 rows for `view=metrotaipei`, 12 rows for `view=taipei`
- Toggle visibly switches enabled/disabled district sets within < 200ms
- Hover on Taipei view, on a Taipei district, lifts and shows score; hover on a New Taipei district (in Taipei view) does nothing
- Top-3 ranks (中正區, 烏來區, 五股區 from fixture) render with the highest-scoring colour band
- `npm run build` passes (eslint clean), `go build -v ./...` passes
