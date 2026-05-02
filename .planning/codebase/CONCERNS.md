# Codebase Concerns

**Analysis Date:** 2026-05-02
**Project:** Taipei City Dashboard
**Scope:** Full repo (Taipei-City-Dashboard-BE, Taipei-City-Dashboard-FE, Taipei-City-Dashboard-DE, docker, helm-chart)

> Audit covers tech debt, fragile areas, security smells, performance bottlenecks, deprecated dependencies, and TODO/FIXME hot spots. Each entry lists actual file paths and a suggested next step.

---

## TODO / FIXME / HACK Hot Spots

Grep results (`TODO|FIXME|HACK|XXX`) across `*.go`, `*.vue`, `*.js`, `*.py`, `*.yml`, `*.sh`. Surprisingly few inline markers — the actual debt lives in commented-out code, stub files, and "minor corrections" commits (see Fragile Areas below).

| File | Count | Summary |
|------|-------|---------|
| `Taipei-City-Dashboard-BE/app/controllers/componentConfig.go` | 1 | `// FIXME:` at line 44 — `CreateComponent` is a half-finished endpoint that cannot be used without manual `components.index` / `component_charts.index` design. |
| `Taipei-City-Dashboard-BE/app/models/user.go` | 1 | `// TODO: delete user's view point` at line 234 — `DeleteUser` leaves orphaned `view_point` rows after the user is deleted. |
| `Taipei-City-Dashboard-BE/app/middleware/rateLimit.go` | 1 | `// TO BE COMPLETED: check if white_listed or black_listed and skip if so` at line 65 — global throttling has no allow-list escape hatch. |
| `Taipei-City-Dashboard-FE/src/store/contentStore.js` | inline | Lines 1103-1124 commented-out `wsConnect/wsDisconnect/sendMessage` block referencing hardcoded LAN IP `ws://192.168.88.193:8088` — leftover from prototype. |
| `Taipei-City-Dashboard-DE/dags/utils/transform_address.py` | inline | Line 1007 `# !!! add retry process` — the looping `get_xy_from_address` has no retry/back-off; relies only on session retries inside `get_single_addr_xy`. |
| `Taipei-City-Dashboard-FE/src/make-new-thing-here/MakeNewThingHerePanel.vue` | n/a | 19-line stub with empty `<script setup>`; placeholder injection point committed to `develop` (commits `8f6082f`, `a880f9c`, `fc9afb1`). |

> Total inline `TODO/FIXME/HACK/XXX` matches in real code (after excluding base64/SVG noise): **5**. The low marker count masks much larger structural debt enumerated below.

---

## Tech Debt

### BE — `componentData.go` queries are server-side `fmt.Sprintf` of DB-stored SQL

- Issue: `GetTwoDimensionalData`, `GetThreeDimensionalData`, `GetTimeSeriesData`, `GetPercentData` (all in `Taipei-City-Dashboard-BE/app/models/componentData.go` lines 202-340) load a `query_chart` / `query_history` *string* from `query_charts` table and execute via `DBDashboard.Raw(queryString)` after `fmt.Sprintf(*query, timeFrom, timeTo)`.
- Files: `Taipei-City-Dashboard-BE/app/models/componentData.go:208,214,234,240,290,296,338`
- Impact: Any admin / DB write that lands a malicious template into `query_charts.query_chart` becomes an unsanitised SQL execution at request time. Also fragile to escaping bugs (e.g. literal `%s` clashing with timestamp values).
- Fix approach: Move templated queries to parameterised `?` binds; reject any stored query containing more than the expected `%s` slot count; gate write-side endpoints with stricter validation.

### BE — Half-finished `CreateComponent` endpoint exposed via routes

- Issue: `Taipei-City-Dashboard-BE/app/controllers/componentConfig.go:44-68` is annotated `FIXME` and creates a `CityComponent` without `component_charts.index`, leaving the row unusable.
- Impact: 500 / inconsistent state when admins call it; downstream chart APIs silently fail.
- Fix approach: Either remove the route until the chart-config flow is designed, or wire it to `models.CreateComponentChart` inside the same transaction.

### BE — `DeleteUser` leaves orphaned `view_point` rows

- Issue: Comment at `Taipei-City-Dashboard-BE/app/models/user.go:234` ("TODO: delete user's view point") inside the user-delete transaction. No cascade is configured on `view_points` either.
- Impact: Slow growth of dead rows; PII (view points may include addresses / coordinates) survives account deletion — GDPR / 個資法 risk.
- Fix approach: Add `tx.Where("user_id = ?", userID).Delete(&ViewPoint{})` before `tx.Delete(&user)`, or declare an `OnDelete:CASCADE` foreign key.

### BE — Disabled / dead route handler `WriteMap`

- Issue: `Taipei-City-Dashboard-BE/app/controllers/writemap.go` writes user-controlled JSON to a fixed CWD path `incident.geojson` with no auth / sanitisation. Route is currently commented out (`Taipei-City-Dashboard-BE/app/routes/router.go:228`).
- Impact: If accidentally re-enabled, any client (incl. unauth) can overwrite a server-side file under the BE working directory and crash other map flows.
- Fix approach: Delete the file or move it under an admin-only route group with path / size validation.

### BE — Dual middleware CORS layer (header-only, half-commented)

- Issue: `Taipei-City-Dashboard-BE/app/middleware/common.go:22-34` adds `Access-Control-Allow-Headers/Methods/Credentials: true` but the actual `Access-Control-Allow-Origin` is commented (`// c.Header("Access-Control-Allow-Origin", "*")`). The proper `gin-contrib/cors` block in `Taipei-City-Dashboard-BE/app/app.go:55-61` (allow-list `https://tuic.gov.taipei`) is also commented out.
- Impact: In production CORS is enforced only by the upstream nginx (`Taipei-City-Dashboard-FE/nginx.conf*`); any deploy that strips that gateway exposes credentialed APIs cross-origin. Setting `Allow-Credentials: true` without an explicit origin is the worst combination.
- Fix approach: Re-enable the `cors.New(...)` middleware with the prod origin list; remove the half-baked headers in `common.go`.

### FE — Stub feature panel `make-new-thing-here` shipped to `develop`

- Issue: Recent commits (`8f6082f`, `a880f9c`, `fc9afb1`) renamed `datalab → make-new-thing-here` and merged an empty injection point. `Taipei-City-Dashboard-FE/src/make-new-thing-here/MakeNewThingHerePanel.vue` is 19 lines, `<script setup>` is empty.
- Files: `Taipei-City-Dashboard-FE/src/make-new-thing-here/`, `Taipei-City-Dashboard-FE/src/views/MapView.vue` (computed `isMakeNewThingHere`).
- Impact: Confusing landing if the route query `?index=make-new-thing-here` is hit; placeholder name will leak into URLs / analytics.
- Fix approach: Either implement the planned components or feature-flag the route until ready; do not merge a literal "make-new-thing-here" identifier into prod.

### FE — Massive single-file stores

- `Taipei-City-Dashboard-FE/src/store/mapStore.js` (2,589 lines / 71 KB) and `Taipei-City-Dashboard-FE/src/store/contentStore.js` (1,130 lines) hold the bulk of map + content logic. `Taipei-City-Dashboard-FE/src/assets/configs/mapbox/mapStyle.js` is 4,246 lines / 86 KB.
- Impact: Hard to test, slow to lint, every layer change requires editing the same god-store. Blocks code-splitting.
- Fix approach: Extract per-layer modules under `src/store/map/` and dynamic-import non-critical layer styles.

### FE — Commented-out WebSocket prototype with hardcoded LAN URL

- Issue: `Taipei-City-Dashboard-FE/src/store/contentStore.js:1103-1124` keeps a `ws://192.168.88.193:8088/api/v1/ws` connection alongside `innerHTML +=` message handling.
- Impact: Encourages copy-paste of an XSS pattern (`messagesDiv.innerHTML += "<p>" + message + "</p>"`) and leaks an internal IP.
- Fix approach: Delete the block; if WS is on the roadmap, build it behind the existing axios `http` base URL with proper sanitisation.

### DE — `ast.literal_eval` on Airflow Variables

- Issue: `Taipei-City-Dashboard-DE/dags/settings/global_config.py:12`, `dags/common_dags/housekeeping_tables/housekeeping_tables.py:21`, `dags/operators/common_pipeline.py:315` call `literal_eval(Variable.get(...))` to parse JSON-ish lists.
- Impact: `literal_eval` is safe vs `eval`, but a malformed Variable value produces an opaque crash for an entire DAG run; makes debugging schedule failures harder.
- Fix approach: Replace with `json.loads` and a `try/except` that logs which Variable failed.

### DE — `ast.literal_eval` on a SOAP response body (R0088)

- Issue: `Taipei-City-Dashboard-DE/dags/proj_city_dashboard/R0088/R0088.py:57` parses an external SOAP payload from `getCarWeightBRInfoResult` using `ast.literal_eval(r_split)`.
- Impact: Brittle if the upstream service ever returns valid Python-tuple syntax with side-effects (still bounded by `literal_eval`, but any non-literal text raises and kills the DAG). The SOAP envelope also embeds username/password as plain text.
- Fix approach: Parse with `xmltodict` / `lxml` instead and switch credentials to Airflow Variable injection (already partially used).

### DE — `default_table` interpolated directly into `read_sql` strings

- Issue: 6 DAGs run `pd.read_sql(f"SELECT ... FROM {default_table}", engine)` (e.g. `D050303_7/D050303_7.py:25`, `D100104_1/D100104_1.py:8`, `D100105/D100105.py:8`, `D100106_1/D100106_1.py:8`, `D100106_2/D100106_2.py:8`, `R0060/R0060.py:13`).
- Impact: `default_table` comes from the DAG config dict, so the immediate risk is low — but the same f-string pattern is copied into `dags/utils/housekeeping.py:155-170` where `qualified_table` is interpolated into `LOCK TABLE`, `DROP TABLE`, `ALTER TABLE` with no quoting policy. A misnamed table containing whitespace will crash the housekeeping job mid-swap and leave the DB in a half-renamed state (table dropped, replacement not yet renamed).
- Fix approach: Wrap with `psycopg2.sql.Identifier` / SQLAlchemy `quoted_name`; surround the swap in a single transactional block (already `with engine.begin()` — but order the rename before the drop, or use `RENAME ... CONCURRENTLY` style).

### DE — Test-coverage desert (153 ETL DAGs, 1 test file)

- Issue: Only `Taipei-City-Dashboard-DE/dags/test/test_housekeeping.py` and `cicd/utils/add_dags_to_composer_test.py` exist. 153 DAG packages live under `dags/proj_city_dashboard/` and 14 under `dags/proj_new_taipei_city_dashboard/` with zero unit tests.
- Impact: Regressions are caught only when Airflow runs in prod (see "Recent Fixes" below — at least 8 hotfix commits in the last 6 months for upstream API drift).
- Fix approach: At minimum, add transform-only unit tests for the 5 highest-traffic DAGs and a contract test fixture per upstream data source (data.taipei JSON, MOENV, TPGOS).

---

## Known Bugs (and Recently-Fixed Fragile Areas)

`git log --since="6 months ago"` shows 181 commits, ~30 of which are tagged `fix:` / `修復` / `修正`. These are the live fragility hot spots.

| Date / Commit | Symptom | Files / Trigger |
|---------------|---------|-----------------|
| `4e0cfd0` | `StringDataRightTruncation` when `name` / `phone` exceeded 50 chars | `Taipei-City-Dashboard-DE/dags/proj_city_dashboard/D100102_1/childcare_etl.py` — relies on hardcoded `.str[:50]` matching DB schema |
| `e8a817c` | data.taipei JSON API returns empty → ETL inserts nothing | same childcare DAG; CSV fallback added |
| `c5ae300` | Hotel registry encoding broken + `area` extraction wrong | `Taipei-City-Dashboard-DE/dags/proj_new_taipei_city_dashboard/general_hotel_registry/general_hotel_registry.py` |
| `5743b3d` | 3 DAGs broke after dataset column / value format change | unspecified — points to upstream coupling |
| `bf491fe` | D100101 哺乳室 extension column too long | matches schema-truncation pattern above; recurring |
| `58e34aa` | `aed_locations` upstream removed `縣市別代碼` column | brittle column-name dependency |
| `2ad6713` / `9399dfe` / `c4140c4` | MOENV API v2 format change broke 3+ DAGs | `dags/utils/extract_stage.py` — JSON parsing assumptions |
| `629f36d` | 24 DAGs had hardcoded `RID` values that expired on data.taipei | mass refactor introduced `get_current_rid_from_page_id` helper, but 24 DAGs touched in one commit = high blast radius |
| `94d0766` / `8778bd3` | "補上 prod 設定環境變數" — production missing required env vars | repeated env drift; no validation script |
| `27a4ac7` | `QDRANT_COLLECTION_NAME` vs `QDRANT_COLLECTION` mismatch | `Taipei-City-Dashboard-BE/global/global.go:108` only reads `QDRANT_COLLECTION`; config-naming churn |

**Pattern:** Almost every recent bug is one of (a) upstream open-data schema drift, (b) DB-column length mismatch with the ETL, (c) env-var naming inconsistency. None have automated regression tests.

---

## Security Considerations

### Hardcoded fallback for TWCC API key

- File: `Taipei-City-Dashboard-BE/global/global.go:118`
- Code: `ApiKey: getEnv("TWCC_API_KEY", "default_your_twcc_api_key_here")`
- Risk: Service silently boots with a placeholder key if env is missing; subsequent AI requests leak the placeholder string in logs / upstream telemetry. Other secrets default to empty string (correct), but TWCC was made special.
- Recommendation: Default to empty + fast-fail in `app.StartApplication` if `len(global.TWCC.ApiKey)==0` and the AI route is enabled.

### `JWT_SECRET=secret` in `docker/.env.template`

- File: `docker/.env.template:21`
- Risk: Devs commonly copy `.env.template → .env` without editing. A live deployment using the literal string `secret` lets anyone forge JWTs and become admin.
- Recommendation: Replace with `JWT_SECRET=` (empty) + add a startup assertion that `JwtSecret != "" && len(JwtSecret) >= 32`.

### Legacy / unmaintained JWT library — `dgrijalva/jwt-go v3.2.0+incompatible`

- File: `Taipei-City-Dashboard-BE/go.mod:9`
- Risk: This package is **archived** since 2021 and has CVE-2020-26160 (`access type-cast bypass`). Active fork is `golang-jwt/jwt`.
- Recommendation: Replace import paths with `github.com/golang-jwt/jwt/v5`; update `Taipei-City-Dashboard-BE/app/middleware/auth.go` and `app/util/auth.go`.

### Auth middleware applied **globally**, with anonymous fallback

- File: `Taipei-City-Dashboard-BE/app/middleware/auth.go:20-38`
- Behaviour: Missing/invalid token → request gets `loginType=no login` + viewer permissions on every public group, and continues. Only `IsLoggedIn()` + `IsSysAdm()` route-level guards stop unauth access.
- Risk: Easy to forget the guard on a new route → unintentionally public endpoints. The recent `WriteMap` example (`writemap.go:12`) is a textbook case of a route that would have been world-writable.
- Recommendation: Invert the default to **deny**; add a test that asserts every registered route (`Taipei-City-Dashboard-BE/app/routes/router.go`) either has an `IsLoggedIn` middleware or is in an explicit allow-list.

### `verify=False` on outbound HTTPS requests

- Files: `Taipei-City-Dashboard-DE/dags/proj_new_taipei_city_dashboard/general_hotel_registry/general_hotel_registry.py:38`, `dags/proj_new_taipei_city_dashboard/elderly_club/elderly_club.py:31`, `dags/proj_city_dashboard/cht_e2/cht_e2.py:43`, `dags/proj_city_dashboard/cht_g2/cht_g2.py:40`, `dags/utils/auth_cht.py:58`, `dags/proj_city_dashboard/D100102_1/childcare_etl.py:57`.
- Risk: 6 outbound calls disable TLS verification, including credentialed CHT auth (`auth_cht.py`). MITM in the Airflow network → leaked credentials / poisoned data.
- Recommendation: Pin upstream CA bundles or, if the source uses a self-signed cert, vendor the cert into the image and pass `verify=/path/to/ca.pem`.

### SOAP credentials interpolated into request body (R0088)

- File: `Taipei-City-Dashboard-DE/dags/proj_city_dashboard/R0088/R0088.py:42-44`
- Risk: `<userName>{user_name}</userName> <passWord>{password}</passWord>` — credentials enter the request via f-string; if `password` ever contains `<` `>` `&`, the envelope breaks (and the password could leak in tracebacks).
- Recommendation: XML-escape via `xml.sax.saxutils.escape` and source the credentials from Airflow Variables (not module-level constants).

### SQL string interpolation in BE (server-side admin queries)

- Already covered above (`componentData.go` `Raw(queryString)`). Combined with the JWT fallback, an admin compromise → arbitrary read/write on the dashboard DB.

### Broad trusted-proxy range

- File: `Taipei-City-Dashboard-BE/app/app.go:47`
- `SetTrustedProxies({"127.0.0.1", "::1", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"})` — fine for k8s, but if the BE is ever exposed without an ingress, anyone in those private ranges can spoof `X-Forwarded-For` and bypass the per-IP rate limiter.
- Recommendation: Pin to the specific cluster service CIDR via env variable.

### `.env.template` files committed but no `.env` leaked

- Verified: Only `Taipei-City-Dashboard-FE/.env.template` and `docker/.env.template` exist; no `.env` / credentials JSON tracked. `.gitignore` covers binaries and `dist/`. Good — but the gitignore does **not** explicitly list `.env`, so a future careless commit would slip through. Add `.env` and `*.pem` / `*.key` patterns.

---

## Performance Bottlenecks

### N+1-style geocoding loop

- File: `Taipei-City-Dashboard-DE/dags/utils/transform_address.py:1003-1029`
- Issue: `get_xy_from_address` does **synchronous, sequential** `requests.get` per address with **no timeout** and only the comment `# !!! add retry process`. Many DAGs feed thousands of addresses through this.
- Impact: Single slow upstream response (TPGOS API) blocks the worker; one hung TCP socket can stall an entire DAG.
- Fix approach: Switch to the existing `get_single_addr_xy` (line 1033, has `HTTPAdapter(max_retries=5)` + Session) and parallelise via `concurrent.futures.ThreadPoolExecutor`; always pass `timeout=30`.

### 40 outbound `requests.get/post` calls — only 1 with `timeout=`

- Grep: 40 hits, of which the only explicit `timeout=` is in `dags/proj_city_dashboard/D100102_1/childcare_etl.py:57` (`timeout=120`) and a couple in `extract_stage.py`.
- Impact: An Airflow worker can hang indefinitely if upstream stops responding mid-stream; default `requests` timeout is `None`. Combined with high DAG concurrency, this risks worker-pool exhaustion.
- Fix approach: Add a default `(connect, read) = (10, 60)` timeout helper in `dags/utils/extract_stage.py` and refactor the existing call sites.

### Frontend ships ~215 MB of static GeoJSON in `public/mapData/`

- Files: `Taipei-City-Dashboard-FE/public/mapData/` totals **215 MB**, including `bld_2d_older_than_30.geojson` (53 MB), `bld_2d_no_renew.geojson` (13 MB), `bld_2d_in_soil_liquid.geojson` (9 MB), `flood_simulate_*.geojson` (~16 MB combined).
- Impact: Initial page-loads on slow networks try to fetch tens of MB before the map renders. `vite-plugin-compression` helps but doesn't change the cold-load cost. Also bloats the Docker image.
- Fix approach: Convert to vector tiles (`tippecanoe → .mbtiles`) served by Mapbox / Tegola, or lazy-fetch only when the corresponding layer toggles on. At minimum, exclude `bld_2d_older_than_30.geojson` from the default bundle.

### Vite `chunkSizeWarningLimit: 1600` (KB) intentionally raised

- File: `Taipei-City-Dashboard-FE/vite.config.js:50`
- Impact: Threshold raised from the 500 KB default — silencing warnings rather than fixing them indicates main bundle is well over 1 MB.
- Fix approach: Audit with `vite build --report` (or `rollup-plugin-visualizer`); split `mapStore.js` (71 KB raw) and `mapStyle.js` (86 KB raw); dynamic-import `three`, `threebox-plugin`, `hls.js`, `apexcharts` (heaviest deps in `package.json:14-33`).

### `log.Fatalf` in BE model-init paths

- File: `Taipei-City-Dashboard-BE/app/models/qdrant.go:102, 130, 142, 159, 166, 176, 189, 205, 215`
- Impact: A transient ONNX runtime error (e.g. shared-lib path mismatch on a new node) will crash the entire BE process instead of failing the AI route gracefully. In k8s this triggers a pod-restart loop.
- Fix approach: Convert `log.Fatalf` to error-returns from `InitLmSession` / `InitTokenizer`; let `app.StartApplication` decide whether AI is degraded vs the whole service being down.

### Per-component data fetched serially in `GetDashboardByIndex`

- File: `Taipei-City-Dashboard-BE/app/models/dashboard.go:193-210`
- Issue: After loading the component list, the loop unmarshals every `MapConfig` JSON, mutates each map's `City`, and re-marshals — done synchronously per component on every dashboard fetch. Result is also not cached in Redis even though Redis is wired up.
- Impact: Repeated CPU + GC pressure on the most-called endpoint (`/dashboard/:index`).
- Fix approach: Cache the assembled component list in Redis keyed by `(index, groupHash, city)`; invalidate on dashboard / component updates.

### Missing PG indexes signal (no `CreateIndex` calls anywhere)

- Grep for `CreateIndex` / `gorm:"index"` returns **zero matches** in `Taipei-City-Dashboard-BE/app/models/`. All FK / lookup fields rely on whatever `db-sample-data/*.sql` declares.
- Impact: Lookups like `chat_logs.user_id` (`models/chatlog.go:46`), `dashboard_groups.group_id` (`models/dashboard.go:142`), and `view_points.user_id` likely scan sequentially as data grows.
- Fix approach: Add `gorm:"index"` tags or migration files for the most-queried columns; verify with `EXPLAIN` against the prod DB sample.

---

## Fragile Areas

### `Taipei-City-Dashboard-DE/dags/utils/extract_stage.py` (943 lines)

- Why fragile: Central HTTP / file extractor for ~150 DAGs. Recent commits (`2ad6713`, `9399dfe`, `c4140c4`, `d11fcf8`) show repeated edits to handle MOENV API list/v2 format changes.
- Safe modification: Add a parametrised test fixture with sample payloads from each upstream type before touching parsing logic.
- Test coverage: None.

### `Taipei-City-Dashboard-DE/dags/utils/transform_address.py` (1,088 lines)

- Why fragile: Largest util in DE, handles geocoding + address normalisation + WKB transforms. Mixes sync `requests` loop, multi-thread variant, and commented-out proxy code (lines 993, 1051).
- Safe modification: Pin Python dependencies (no `requirements.txt` at repo root for DE — check `docker/` images); add at least one happy-path test covering `get_single_addr_xy` and one for `transform_taipei_addr`.

### `Taipei-City-Dashboard-FE/src/store/mapStore.js` (2,589 lines)

- Why fragile: Owns Mapbox + Deck.GL + Three.js layer lifecycles. Any new layer type touches this single file. `innerHTML = ""` reset at line 1494 is the only DOM mutation but the store frequently `markRaw`s deck instances — easy to leak references.
- Safe modification: Always `removeLayer` before `addLayer`; verify `MapView.vue` watch teardown.
- Test coverage: None.

### `Taipei-City-Dashboard-DE/dags/proj_city_dashboard/D100102_1/childcare_etl.py`

- Why fragile: Three commits in two weeks (`4e0cfd0`, `e8a817c`, `0b389af`) — schema truncation + JSON-API empty fallback + helper rewrite. Driven by upstream behaviour, not bugs in our code.
- Safe modification: Add a `LIMIT 50` style truncation helper used uniformly across childcare DAGs.

### Hardcoded `default_your_twcc_api_key_here` and `JWT_SECRET=secret` defaults

- Already covered under Security; flagged again here because they will silently land in any environment that boots without explicit env injection.

---

## Scaling Limits

### Redis used both for cache and rate-limit ZSETs

- Files: `Taipei-City-Dashboard-BE/app/middleware/rateLimit.go:27,67` create per-`(user, method, URI)` ZSETs that grow unboundedly until `LimitRequestsDuration` expiry.
- Limit: With many distinct URIs (every component ID is a separate key), Redis memory grows linearly with traffic. `cache.Redis.Expire` is set per-key which prevents permanent leak but a single burst can balloon mem.
- Scaling path: Switch to a sliding-window counter (`INCR`+`EXPIRE`) instead of ZSET-of-timestamps; cap key cardinality by hashing the URI prefix.

### Frontend bundle / map data — already discussed (215 MB static)

### Postgres without explicit indexes — already discussed

### `chat_logs.session DISTINCT ON` query

- File: `Taipei-City-Dashboard-BE/app/models/chatlog.go:43-48`
- Limit: Full table scan across `chat_logs` for every "list my sessions" call. Will degrade as users rack up history.
- Scaling path: Index `(user_id, session, created_at)`; consider materialising a `chat_sessions` table.

---

## Dependencies at Risk

| Package | File | Risk |
|---------|------|------|
| `github.com/dgrijalva/jwt-go v3.2.0+incompatible` | `Taipei-City-Dashboard-BE/go.mod:9` | **Archived (2021), CVE-2020-26160.** Migrate to `github.com/golang-jwt/jwt/v5`. |
| `github.com/fvbock/endless v0.0.0-20170109170031-...` | `Taipei-City-Dashboard-BE/go.mod:10` | 8-year-old graceful-restart wrapper, no commits since 2017. Replace with stdlib `http.Server.Shutdown`. |
| `github.com/comail/colog v0.0.0-20160416085026-...` | `Taipei-City-Dashboard-BE/go.mod:8` | 9-year-old logger, unmaintained. Replace with `slog` (stdlib since Go 1.21). |
| `github.com/go-redis/redis v6.15.9+incompatible` | `Taipei-City-Dashboard-BE/go.mod:12` | v6 is EOL; v9 is current and is import path `github.com/redis/go-redis/v9`. |
| `vue@^3.4.15` / `vite@^5.0.12` | `Taipei-City-Dashboard-FE/package.json:31,40` | Behind current minor (Vue 3.5.x, Vite 6.x). Audit security advisories before next deploy. |
| `mapbox-gl@^3.1.0` | `Taipei-City-Dashboard-FE/package.json:25` | Verify against Mapbox token policy / billing changes; major releases happen every ~6 months. |
| `axios@^1.6.5` | `Taipei-City-Dashboard-FE/package.json:21` | CVE-2024-39338 (SSRF) fixed in 1.7.4 — current pin is below. Upgrade. |

---

## Missing Critical Features

- **No automated tests for ETL DAGs** (1 test file for ~167 DAGs). Blocks safe upstream-schema migrations.
- **No BE Go test files** (`find ... -name '*_test.go'` returns zero). Blocks refactor of the SQL-template path.
- **No FE component tests** (no `*.test.*` / `*.spec.*` under `Taipei-City-Dashboard-FE/src`). Blocks safe extraction of the giant stores.
- **No env-var validation at boot** for BE; missing JWT secret silently boots with empty key (`global/global.go:58`).
- **No request-ID / correlation-ID middleware** in BE — debugging the recurring upstream-API drift across DE→BE→FE is harder than it needs to be.

---

## Test Coverage Gaps

| Untested area | Files | Risk | Priority |
|---------------|-------|------|----------|
| All BE controllers | `Taipei-City-Dashboard-BE/app/controllers/*.go` | Auth / SQL paths regressions | **High** |
| Component data SQL templating | `Taipei-City-Dashboard-BE/app/models/componentData.go` | Combined with `Raw(queryString)` is the highest-impact untested code | **High** |
| ETL transforms | `Taipei-City-Dashboard-DE/dags/utils/transform_address.py`, `transform_geometry.py`, `transform_time.py` | Drives 150+ DAGs; one regression hits all | **High** |
| Map store mutations | `Taipei-City-Dashboard-FE/src/store/mapStore.js` | Visual regressions surface only at runtime | Medium |
| Auth middleware | `Taipei-City-Dashboard-BE/app/middleware/auth.go` | Anonymous-fallback behaviour is easy to misconfigure | **High** |
| Rate-limit middleware | `Taipei-City-Dashboard-BE/app/middleware/rateLimit.go` | Off-by-one / Redis ZSET edge cases | Medium |

---

## Suggested Priorities (next 1-2 sprints)

1. Replace `dgrijalva/jwt-go` and add a startup assertion on `JWT_SECRET` length.
2. Re-enable `gin-contrib/cors` allow-list in `app.go` and remove the half-baked headers in `middleware/common.go`.
3. Delete `controllers/writemap.go` and the placeholder `make-new-thing-here` panel until they have a real spec.
4. Add timeouts (and `verify=` proper certs) to all `requests.get/post` in DE.
5. Introduce `pytest` smoke tests for the 5 most-edited DAGs (childcare, hotel-registry, MOENV toilet, AED locations, address-geocode).
6. Migrate raw `Raw(queryString)` paths in `componentData.go` to parameterised queries.
7. Audit `public/mapData/` — move >1 MB GeoJSON layers to vector tiles or lazy-load.

---

*Concerns audit: 2026-05-02*
