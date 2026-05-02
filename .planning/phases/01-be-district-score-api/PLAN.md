---
phase: 01-be-district-score-api
milestone: v2.3
requirements: [CC-05, CC-06]
status: ready
generated: 2026-05-03
---

# Phase 1 — BE District Score API

## Overview

Stand up a flat, non-PostGIS `crosscompare_district_score` table on `DBManager`, serve it through `GET /api/v1/crosscompare/scores?view={taipei|metrotaipei}`, and seed it idempotently from the v1 fixture (41 rows: 12 臺北市 + 29 新北市). The endpoint is the contract Phase 2's frontend choropleth will fetch — there is no PostGIS geometry, no GeoJSON, and no client-side aggregation in Phase 1. The whole phase is one new GORM model file, one new controller file, one new route registration, one AutoMigrate edit, and one fixture SQL file.

## Touches

| Status | Path | Purpose |
|--------|------|---------|
| **NEW** | `Taipei-City-Dashboard-BE/app/models/crosscompareDistrictScore.go` | GORM model + `GetCrossCompareScores(view string)` query helper |
| **NEW** | `Taipei-City-Dashboard-BE/app/controllers/crosscompare.go` | `GetCrossCompareScores` handler + city/view whitelist |
| **EDIT** | `Taipei-City-Dashboard-BE/app/routes/router.go` | Register `configureCrossCompareRoutes()`, call from `ConfigureRoutes()` |
| **EDIT** | `Taipei-City-Dashboard-BE/app/models/database.go` | Add `&CrossCompareDistrictScore{}` to `MigrateManagerSchema()`'s `AutoMigrate` list |
| **NEW** | `db-sample-data/crosscompare_district_score.sql` | Idempotent `CREATE TABLE IF NOT EXISTS` + `TRUNCATE` + 41-row `INSERT` block |

> **AutoMigrate note:** The user prompt referenced `app/initial/initial.go`, but the actual GORM `AutoMigrate(...)` registry lives in `app/models/database.go` `MigrateManagerSchema()` (lines 121-140). Edit the latter — `initial/initial.go` only loads sample SQL and seeds the admin user, it does not register schemas.

> **DBManager vs DBDashboard:** `crosscompare_district_score` is reference/config data (sibling to `dashboards`, `components`, `query_charts`), not statistical fact data fed by a DAG. Per project convention it lives in **DBManager**. The `migrateDB` Cobra subcommand will pick up the new model automatically once it is appended to the `MigrateManagerSchema()` list.

## Tasks

### Task 1 — GORM model & query helper

**File (new):** `Taipei-City-Dashboard-BE/app/models/crosscompareDistrictScore.go`

**Action:** Create the file with the TUIC banner (copy lines 1-10 of `app/app.go` verbatim, adjust the `// Package` line). Define the `CrossCompareDistrictScore` struct and a single query helper `GetCrossCompareScores(view string) ([]CrossCompareDistrictScore, error)`.

The struct must use snake_case JSON tags end-to-end. `inspection_rate` is `float64` because the fixture stores it to 4 decimal places (e.g. `6.5486`, `16.4557`) — int would lose precision. Use `numeric(7,4)` for `inspection_rate` (fits up to 999.9999 — well above the observed max of 16.4557) and `numeric(6,2)` for the three derived score columns. `(city, district)` is the natural composite primary key per CC-06.

```go
// Package models stores the models for the postgreSQL databases.
/*
Developed By Taipei Urban Intelligence Center 2023-2024

// Lead Developer:  Igor Ho (Full Stack Engineer)
// Systems & Auth: Ann Shih (Systems Engineer)
// Data Pipelines:  Iima Yu (Data Scientist)
// Design and UX: Roy Lin (Prev. Consultant), Chu Chen (Researcher)
// Testing: Jack Huang (Data Scientist), Ian Huang (Data Analysis Intern)
*/
package models

// CrossCompareDistrictScore is one row of the v2.3 cross-compare district score
// table. Schema is flat (no geometry); FE joins by (city, district) onto the
// existing tp_district / metrotaipei_town Mapbox vector tile features.
type CrossCompareDistrictScore struct {
	City             string  `json:"city"             gorm:"column:city;type:varchar(16);primaryKey;not null"`
	District         string  `json:"district"         gorm:"column:district;type:varchar(32);primaryKey;not null"`
	Rank             int     `json:"rank"             gorm:"column:rank;type:integer;not null"`
	Courses          int     `json:"courses"          gorm:"column:courses;type:integer;not null;default:0"`
	FoodBusinesses   int     `json:"food_businesses"  gorm:"column:food_businesses;type:integer;not null;default:0"`
	Inspected        int     `json:"inspected"        gorm:"column:inspected;type:integer;not null;default:0"`
	NotInspected     int     `json:"not_inspected"    gorm:"column:not_inspected;type:integer;not null;default:0"`
	InspectionRate   float64 `json:"inspection_rate"  gorm:"column:inspection_rate;type:numeric(7,4);not null;default:0"`
	CourseScore      float64 `json:"course_score"     gorm:"column:course_score;type:numeric(6,2);not null;default:0"`
	InspectionScore  float64 `json:"inspection_score" gorm:"column:inspection_score;type:numeric(6,2);not null;default:0"`
	TotalScore       float64 `json:"total_score"      gorm:"column:total_score;type:numeric(6,2);not null;default:0"`
}

// TableName pins the table name so plural inflection cannot drift.
func (CrossCompareDistrictScore) TableName() string {
	return "crosscompare_district_score"
}

// GetCrossCompareScores returns rows ordered by rank ASC. view is one of
// "taipei" (filters city = '臺北市', expect 12 rows) or "metrotaipei"
// (no filter, expect 41 rows). Caller is responsible for whitelisting view.
func GetCrossCompareScores(view string) (rows []CrossCompareDistrictScore, err error) {
	q := DBManager.Order("rank ASC")
	if view == "taipei" {
		q = q.Where("city = ?", "臺北市")
	}
	err = q.Find(&rows).Error
	return rows, err
}
```

**Acceptance criteria:**
- File exists with TUIC banner (matches the banner block in `app/app.go` lines 1-10 verbatim)
- Hard tabs throughout (gofmt default — verify with `gofmt -d <file>` outputs nothing)
- `go build -v ./...` passes from `Taipei-City-Dashboard-BE/`
- `grep -c '`json:"' Taipei-City-Dashboard-BE/app/models/crosscompareDistrictScore.go` returns ≥ 11 (one per exported field)
- Struct field for `inspection_rate` is `float64` (NOT `int`) — the fixture's 4-decimal values must round-trip

**Commit:** `新增: crosscompare_district_score GORM 模型與查詢 helper`

---

### Task 2 — Controller with view whitelist + AutoMigrate registration

**File (new):** `Taipei-City-Dashboard-BE/app/controllers/crosscompare.go`
**File (edit):** `Taipei-City-Dashboard-BE/app/models/database.go`

**Action (controller):** Mirror the `componentData.go` city-whitelist pattern (lines 28-38), but the query parameter is `view` not `city`. Whitelist exactly two values: `"taipei"` and `"metrotaipei"` — anything else (including empty) returns 400. Do **not** default to `taipei` on empty (different from `componentData.go`'s behavior; CC-05 makes the parameter explicit so the FE always sends it). Use the `errors.Is(err, gorm.ErrRecordNotFound)` 404/500 split per project convention. Log errors via `logs.FError`, never `fmt.Println`.

```go
// Package controllers stores all the controllers for the Gin router.
/*
Developed By Taipei Urban Intelligence Center 2023-2024

// Lead Developer:  Igor Ho (Full Stack Engineer)
// Systems & Auth: Ann Shih (Systems Engineer)
// Data Pipelines:  Iima Yu (Data Scientist)
// Design and UX: Roy Lin (Prev. Consultant), Chu Chen (Researcher)
// Testing: Jack Huang (Data Scientist), Ian Huang (Data Analysis Intern)
*/
package controllers

import (
	"errors"
	"net/http"

	"TaipeiCityDashboardBE/app/models"
	"TaipeiCityDashboardBE/logs"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type crossCompareScoresQuery struct {
	View string `form:"view"`
}

/*
GetCrossCompareScores returns the v2.3 district-level cross-compare scores.
GET /api/v1/crosscompare/scores?view=taipei      -> 12 rows (only 臺北市)
GET /api/v1/crosscompare/scores?view=metrotaipei -> 41 rows (臺北市 + 新北市)
Public-readable, like /dashboard GETs.
*/
func GetCrossCompareScores(c *gin.Context) {
	var q crossCompareScoresQuery
	_ = c.ShouldBindQuery(&q)

	if q.View != "taipei" && q.View != "metrotaipei" {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid view. Must be 'taipei' or 'metrotaipei'.",
		})
		return
	}

	rows, err := models.GetCrossCompareScores(q.View)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": err.Error()})
			return
		}
		logs.FError("GetCrossCompareScores DB error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "data": rows})
}
```

**Action (AutoMigrate edit):** In `app/models/database.go`, append `&CrossCompareDistrictScore{}` to one of the existing `DBManager.AutoMigrate(...)` lines inside `MigrateManagerSchema()` (lines 121-140). The cleanest spot is alongside the other `Dashboard`-family configs:

```go
// Before:
DBManager.AutoMigrate(&Dashboard{}, &DashboardGroup{}, &Issue{}, &QueryCharts{})

// After:
DBManager.AutoMigrate(&Dashboard{}, &DashboardGroup{}, &Issue{}, &QueryCharts{}, &CrossCompareDistrictScore{})
```

**Acceptance criteria:**
- `go build -v ./...` passes from `Taipei-City-Dashboard-BE/`
- `grep -n 'CrossCompareDistrictScore' Taipei-City-Dashboard-BE/app/models/database.go` returns ≥ 1 line inside `MigrateManagerSchema()`
- Running `./TaipeiCityDashboardBE migrateDB` (or `docker compose run --rm dashboard-be ./TaipeiCityDashboardBE migrateDB`) creates the empty `crosscompare_district_score` table; verify with: `docker exec -i postgres-manager psql -U postgres -d dashboardmanager -c '\d crosscompare_district_score'`
- The composite primary key shows up as `PRIMARY KEY (city, district)` in `\d` output
- The handler rejects `view=foo` with HTTP 400 (verified in Task 4)
- The handler rejects empty `view` with HTTP 400 (verified in Task 4)

**Commit:** `新增: /crosscompare/scores controller 與 AutoMigrate 註冊`

---

### Task 3 — Fixture SQL (idempotent loader)

**File (new):** `db-sample-data/crosscompare_district_score.sql`

**Action:** Generate SQL from `.planning/fixtures/crosscompare_scores_v1.json` `all_districts_ranked[]`. **Recommended approach: a one-shot Python script** invoked by the developer once. Python is already on the developer's machine (used by the DE subproject, same monorepo) — no Go build cycle, no extra Go file to maintain, no jq dependency. The script is throwaway: run it once, paste output into the .sql file, delete the script. Hand-writing 41 rows is error-prone; a Go helper would need a build/run cycle for one-time output.

**Generator one-liner (run from repo root, paste output into the `.sql` file body between the markers below):**

```bash
python3 - <<'PY'
import json
with open('.planning/fixtures/crosscompare_scores_v1.json') as f:
    rows = json.load(f)['all_districts_ranked']
for r in rows:
    print(
        f"  ('{r['city']}', '{r['district']}', {r['rank']}, {r['courses']}, "
        f"{r['food_businesses']}, {r['inspected']}, {r['not_inspected']}, "
        f"{r['inspection_rate']}, {r['course_score']}, {r['inspection_score']}, {r['total_score']}),"
    )
PY
```

The final `.sql` file structure (replace the `-- INSERT ROWS HERE` marker with the script output, and change the trailing comma on the last row to a semicolon):

```sql
-- crosscompare_district_score.sql
-- Phase 1, milestone v2.3 (Cross-Compare District Score Heatmap)
-- Idempotent: safe to re-run. CREATE matches GORM struct
-- in Taipei-City-Dashboard-BE/app/models/crosscompareDistrictScore.go.
-- Source: .planning/fixtures/crosscompare_scores_v1.json all_districts_ranked[]
-- Generator: python3 one-liner in .planning/phases/01-be-district-score-api/PLAN.md Task 3.

CREATE TABLE IF NOT EXISTS crosscompare_district_score (
  city             varchar(16)   NOT NULL,
  district         varchar(32)   NOT NULL,
  rank             integer       NOT NULL,
  courses          integer       NOT NULL DEFAULT 0,
  food_businesses  integer       NOT NULL DEFAULT 0,
  inspected        integer       NOT NULL DEFAULT 0,
  not_inspected    integer       NOT NULL DEFAULT 0,
  inspection_rate  numeric(7,4)  NOT NULL DEFAULT 0,
  course_score     numeric(6,2)  NOT NULL DEFAULT 0,
  inspection_score numeric(6,2)  NOT NULL DEFAULT 0,
  total_score      numeric(6,2)  NOT NULL DEFAULT 0,
  PRIMARY KEY (city, district)
);

TRUNCATE TABLE crosscompare_district_score;

INSERT INTO crosscompare_district_score
  (city, district, rank, courses, food_businesses, inspected, not_inspected,
   inspection_rate, course_score, inspection_score, total_score)
VALUES
-- INSERT ROWS HERE
  ('臺北市', '中正區', 1, 59, 10277, 673, 9604, 6.5486, 40, 23.88, 63.88),
  ('新北市', '烏來區', 2, 0, 79, 13, 66, 16.4557, 0, 60, 60),
  -- ... (39 more rows from generator output) ...
  ('臺北市', '萬華區', 41, 0, 14214, 414, 13800, 2.9126, 0, 10.62, 10.62);
```

**Idempotency mechanism:** `CREATE TABLE IF NOT EXISTS` + `TRUNCATE` + `INSERT`. Re-running the file produces identical state — no dup-key errors, no row count drift.

**Loader command (run once after schema exists, also used by Task 4 verification):**

```bash
docker exec -i postgres-manager psql -U postgres -d dashboardmanager \
  < db-sample-data/crosscompare_district_score.sql
```

(`postgres-manager` is the container name set in `docker/docker-compose-db.yaml`; `dashboardmanager` is the DBManager database name. Confirm with `docker ps --format '{{.Names}}'` if needed — adjust if local stack uses a different container name.)

**Acceptance criteria:**
- File exists at `db-sample-data/crosscompare_district_score.sql`
- File contains exactly 41 `(...)` value rows
- After `docker exec -i postgres-manager psql ... < ...sql`, `SELECT COUNT(*) FROM crosscompare_district_score;` returns `41`
- After running the loader **twice**, `SELECT COUNT(*) FROM crosscompare_district_score;` still returns `41` (idempotency proof)
- Top-3 ranks load verbatim: `SELECT city, district, total_score FROM crosscompare_district_score ORDER BY rank LIMIT 3;` returns `(臺北市,中正區,63.88) (新北市,烏來區,60.00) (新北市,五股區,59.78)`
- `SELECT COUNT(*) FROM crosscompare_district_score WHERE city = '臺北市';` returns `12`
- `SELECT COUNT(*) FROM crosscompare_district_score WHERE city = '新北市';` returns `29`

**Commit:** `新增: crosscompare_district_score 種子 SQL (41 rows, idempotent)`

---

### Task 4 — Route registration & end-to-end verification

**File (edit):** `Taipei-City-Dashboard-BE/app/routes/router.go`

**Action:** Add `configureCrossCompareRoutes()` and call it from `ConfigureRoutes()`. Mirror the `/dashboard` route group structure (lines 129-151): rate-limit middleware, public GET (no `IsLoggedIn`). Reuse the existing `DashboardLimitAPIRequestsTimes` / `DashboardLimitTotalRequestsTimes` constants from `global/consts.go` — adding new constants is unnecessary for a single GET endpoint.

```go
// 1. In ConfigureRoutes() (existing function, ~line 29), add the call:
func ConfigureRoutes() {
	Router.Use(middleware.ValidateJWT)
	RouterGroup = Router.Group("/api/" + global.VERSION)
	configureAuthRoutes()
	configureUserRoutes()
	configureLMRoutes()
	configureComponentRoutes()
	configureDashboardRoutes()
	configureCrossCompareRoutes() // <-- new line
	configureIssueRoutes()
	configureIncidentRoutes()
	configureContributorRoutes()
	configureChatLogRoutes()
	configureAIRoutes()
}

// 2. Add the new function (place it right after configureDashboardRoutes):
func configureCrossCompareRoutes() {
	crossCompareRoutes := RouterGroup.Group("/crosscompare")
	crossCompareRoutes.Use(middleware.LimitAPIRequests(global.DashboardLimitAPIRequestsTimes, global.LimitRequestsDuration))
	crossCompareRoutes.Use(middleware.LimitTotalRequests(global.DashboardLimitTotalRequestsTimes, global.LimitRequestsDuration))
	{
		crossCompareRoutes.GET("/scores", controllers.GetCrossCompareScores)
	}
	// No IsLoggedIn — public-readable like /dashboard GETs.
}
```

**Verification (run after `go build` + restart of the BE container):**

```bash
# Re-load fixture (idempotent, safe to repeat)
docker exec -i postgres-manager psql -U postgres -d dashboardmanager \
  < db-sample-data/crosscompare_district_score.sql

# Restart BE so AutoMigrate runs and the new route is registered
docker compose -f docker/docker-compose.yaml restart dashboard-be

# Then run the four curl checks below.
```

```bash
# Success criterion #2 from ROADMAP: 41 rows for view=metrotaipei
curl -s 'http://localhost:8088/api/v1/crosscompare/scores?view=metrotaipei' \
  | jq '{status, count: (.data | length), top: .data[0]}'
# Expected:
# {
#   "status": "success",
#   "count": 41,
#   "top": { "city": "臺北市", "district": "中正區", "rank": 1, "courses": 59,
#            "food_businesses": 10277, "inspected": 673, "not_inspected": 9604,
#            "inspection_rate": 6.5486, "course_score": 40, "inspection_score": 23.88,
#            "total_score": 63.88 }
# }

# Success criterion #1: 12 rows for view=taipei, all city=臺北市
curl -s 'http://localhost:8088/api/v1/crosscompare/scores?view=taipei' \
  | jq '{status, count: (.data | length), cities: (.data | map(.city) | unique)}'
# Expected: { "status": "success", "count": 12, "cities": ["臺北市"] }

# Success criterion #3: every row has all 11 fields (snake_case keys)
curl -s 'http://localhost:8088/api/v1/crosscompare/scores?view=metrotaipei' \
  | jq '.data[0] | keys | sort'
# Expected:
# ["city","course_score","courses","district","food_businesses","inspected",
#  "inspection_rate","inspection_score","not_inspected","rank","total_score"]

# View whitelist: invalid value rejected
curl -s -o /dev/null -w '%{http_code}\n' \
  'http://localhost:8088/api/v1/crosscompare/scores?view=foo'
# Expected: 400

# Empty view also rejected (no implicit default — FE must send the param)
curl -s -o /dev/null -w '%{http_code}\n' \
  'http://localhost:8088/api/v1/crosscompare/scores'
# Expected: 400

# Public-readable: no Authorization header → still 200
curl -s -o /dev/null -w '%{http_code}\n' \
  'http://localhost:8088/api/v1/crosscompare/scores?view=taipei'
# Expected: 200
```

**Acceptance criteria:**
- `grep -n configureCrossCompareRoutes Taipei-City-Dashboard-BE/app/routes/router.go` returns 2 lines (definition + call inside `ConfigureRoutes`)
- All seven curl checks above pass with the expected outputs
- `go build -v ./...` passes
- BE process logs no panics on startup; AutoMigrate completes without error

**Commit:** `新增: /api/v1/crosscompare/scores 路由 (公開, view 白名單)`

---

## Verification — Mapped to ROADMAP Phase 1 Success Criteria

| # | ROADMAP Criterion | Verification Command (from Task 4) | Pass Signal |
|---|-------------------|-------------------------------------|-------------|
| 1 | `view=taipei` returns 200 + 12 rows matching `taipei_ranked` | `curl ... ?view=taipei \| jq '.data \| length'` | `12`, all rows `city == "臺北市"` |
| 2 | `view=metrotaipei` returns 41 rows matching `all_districts_ranked` | `curl ... ?view=metrotaipei \| jq '.data \| length'` | `41` |
| 3 | Each row has all 11 fields enforced by GORM tags | `curl ... \| jq '.data[0] \| keys'` | The 11-key array shown above |
| 4 | `db-sample-data/crosscompare_district_score.sql` is idempotent — loadable without dup rows | Run loader twice, then `SELECT COUNT(*)` | `41` after both runs |

## Goal-Backward Sanity Check

**Phase 1 goal:** Stand up a flat scores table and JSON endpoint that returns the v1 fixture, ready for FE consumption.

**Decompose into observable truths:**

1. The table `crosscompare_district_score` exists in DBManager with the right columns and `(city, district)` PK
   → satisfied by **Task 2** (AutoMigrate) and verified by `\d crosscompare_district_score`
2. The table contains exactly 41 rows matching the fixture verbatim
   → satisfied by **Task 3** (fixture SQL) and verified by row-count + top-3 spot check
3. The endpoint `GET /api/v1/crosscompare/scores?view=metrotaipei` returns those 41 rows wrapped in `{status:"success", data:[...]}`
   → satisfied by **Tasks 1+2+4** and verified by the metrotaipei curl in Task 4
4. The endpoint with `view=taipei` returns 12 rows filtered to `city = '臺北市'`
   → satisfied by the `WHERE city = '臺北市'` branch in `GetCrossCompareScores` (Task 1) and verified by the taipei curl in Task 4
5. Every row's JSON field names are snake_case matching the fixture keys
   → satisfied by struct tags in Task 1 and verified by the `keys` curl in Task 4
6. Invalid `view` is rejected with 400 (no silent default)
   → satisfied by the whitelist branch in Task 2 and verified by the `view=foo` curl in Task 4
7. The endpoint is public-readable (no auth needed) — Phase 2 FE can fetch without a token
   → satisfied by the route group having no `IsLoggedIn` middleware (Task 4) and verified by the no-auth curl

**CC-05 coverage:** Truths 3, 4, 5, 6, 7 collectively deliver `GET /api/v1/crosscompare/scores?view={taipei|metrotaipei}` returning the documented `{status, data:[...]}` envelope with all 11 snake_case fields. ✓

**CC-06 coverage:** Truths 1 and 2 collectively deliver the regular (non-PostGIS) `crosscompare_district_score` table keyed by `(city, district)`, seeded idempotently from the fixture. ✓

**Key links** (where breakage would cascade):
- Struct field JSON tags (Task 1) ↔ fixture key names (Task 3) ↔ FE expected keys (Phase 2 plan) — all three must agree on snake_case spelling. Drift here breaks Phase 2's choropleth join silently.
- Composite PK `(city, district)` (Task 1 GORM tag, Task 3 SQL DDL) — these must match or AutoMigrate will try to alter the table on every restart.
- `臺` (full-form, U+81FA) vs `台` (simplified, U+53F0) — the fixture uses `臺北市` consistently. Phase 2 will need to canonicalise when joining onto vector tile features (already flagged as a Phase 2 risk in ROADMAP). Phase 1 just stores what the fixture says.
- Container name `postgres-manager` and DB name `dashboardmanager` in the loader command — if local stack uses different names, Task 3 verification fails first.

## Out of Phase 1 Scope (deferred to later phases)

- Frontend route, NavBar entry, choropleth rendering — Phase 2
- Hover/levitate animation, popup, removal of `make-new-thing-here` — Phase 3
- Real ETL pipeline that recomputes `total_score` from upstream open data — future milestone (per PROJECT.md)
- PostGIS / GeoJSON / hex generation — out of scope for entire v2.3 milestone

## Phase Exit Checklist

- [ ] Task 1 committed: GORM model file exists, `go build` passes
- [ ] Task 2 committed: controller + AutoMigrate edit, `go build` passes, `migrateDB` creates the table
- [ ] Task 3 committed: SQL file exists with 41 rows, loader runs idempotently
- [ ] Task 4 committed: route registered, all 7 curl checks pass
- [ ] BE container restart shows no startup errors / no panic
- [ ] Branch ready for Phase 2 to fetch `GET /api/v1/crosscompare/scores`
