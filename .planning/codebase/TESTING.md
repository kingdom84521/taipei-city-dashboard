# Testing Patterns

**Analysis Date:** 2026-05-02

## Headline

**Automated test coverage in this monorepo is essentially zero.** Across the three subprojects (Vue 3 frontend, Go backend, Python Airflow DAGs) there are exactly **two** Python test files and **no** frontend or backend tests. CI workflows do not invoke any test runner — they only build.

Treat any new feature you ship as untested unless you add tests yourself. Where you do add them, follow the per-subproject guidance below so future contributors can find and run them.

## Inventory of Existing Test Files

A repo-wide scan (`find . -type f \( -name "*.test.*" -o -name "*.spec.*" -o -name "*_test.go" \)`) returns **no matches** in the FE (`Taipei-City-Dashboard-FE/`) or BE (`Taipei-City-Dashboard-BE/`) subprojects.

The only test files are in the data-engineering subproject:

| File | Purpose | Framework |
|------|---------|-----------|
| `Taipei-City-Dashboard-DE/dags/test/test_housekeeping.py` | Unit tests for `utils/housekeeping.py` (`_parse_table_name`, `_normalize_table_names`, `PostgresHousekeeper.cleanup_table`) using stub SQLAlchemy connections/engines | `pytest` |
| `Taipei-City-Dashboard-DE/cicd/utils/add_dags_to_composer_test.py` | Integration test for the GCP Composer DAG-upload helper; uses real `google.cloud.storage` and temp buckets | `pytest` (with `@pytest.fixture`) |

`Taipei-City-Dashboard-DE/dags/test/` is excluded from Airflow's DAG scan via `.airflowignore` so these test files do not pollute the scheduler (see `Taipei-City-Dashboard-DE/README.md` section "DAG 掃描排除清單").

## Test Frameworks

- **Frontend:** none configured. `Taipei-City-Dashboard-FE/package.json` declares no test script and no test dependency (no `vitest`, no `jest`, no `@vue/test-utils`, no `cypress`, no `playwright`). The only `scripts` are `start`, `dev`, `build`, `build:test`, `lint`, `preview`. Note: `build:test` is **not** a test target — it runs `eslint . --fix && vite build --mode test` to produce a build that points at the test API.
- **Backend (Go):** none configured. No `*_test.go` files exist. `go test` would simply report "no test files" for every package. CI (`.github/workflows/go.yml`) runs `go build -v ./...` only.
- **Data Engineering (Python):** `pytest` (used directly as `import pytest`). No `pyproject.toml`, `pytest.ini`, `setup.cfg`, `conftest.py`, or `tox.ini` is present, so `pytest` runs with its built-in defaults.

## Running the Tests

There is no top-level test command. Concrete commands for what does exist:

```bash
# Python DE unit tests (housekeeping)
cd Taipei-City-Dashboard-DE
pip install pytest sqlalchemy   # plus whatever housekeeping.py imports
pytest dags/test/test_housekeeping.py -v

# Composer uploader integration test (requires GCP creds + a real bucket)
cd Taipei-City-Dashboard-DE/cicd/utils
pip install pytest google-cloud-storage
pytest add_dags_to_composer_test.py -v
```

For the FE / BE there is currently nothing to run. `npm test` and `go test ./...` will both fail / report no tests.

## Test File Layout (where to put new tests)

**Frontend (recommended convention if you add tests):**
- Add `vitest` + `@vue/test-utils` to `Taipei-City-Dashboard-FE/package.json` devDependencies.
- Co-locate spec files next to the unit under test using `*.spec.js` (matches the most common Vite/Vitest default and ESLint already ignores `*.json` only — `*.spec.js` files would still be linted).
- Pure utility functions in `Taipei-City-Dashboard-FE/src/assets/utilityFunctions/` (e.g. `calculateHaversineDistance.js`, `colorConvert.js`, `validate.js`) are the easiest first targets — they have no Vue/store dependencies and already include input-validation branches that beg for table-driven tests.
- Pinia stores (`src/store/*.js`) need `setActivePinia(createPinia())` in a `beforeEach` and Axios mocked (the singleton lives in `src/router/axios.js`).

**Backend (recommended convention):**
- Standard Go layout: `app/util/auth_test.go` next to `app/util/auth.go`. `GetAuthFromRequest`, `DecodeCredentials`, `HasPermission`, `GetPermissionAllGroupIDs`, `GetPermissionGroupIDs` (all in `Taipei-City-Dashboard-BE/app/util/auth.go`) are pure functions and should be the first to gain coverage.
- Controllers in `app/controllers/*.go` would need `httptest` + Gin's `gin.CreateTestContext` plus a sqlmock or testcontainers-postgres setup because `models.DBManager` / `models.DBDashboard` are package-level globals (`app/models/database.go` lines 31–34).
- Middleware in `app/middleware/auth.go` likewise needs a JWT fixture (the `jwtSecret` is read from `global.JwtSecret`).

**Data Engineering:**
- Continue to place tests under `Taipei-City-Dashboard-DE/dags/test/test_*.py` to stay inside the existing `.airflowignore` exclusion. Never put test files inside `dags/proj_*/` or they will be picked up by the scheduler as DAGs.

## Mocking Strategy (existing example)

`Taipei-City-Dashboard-DE/dags/test/test_housekeeping.py` does **not** use `unittest.mock` — it uses **hand-rolled stub classes** to fake SQLAlchemy primitives:

- `_StubResult` mirrors `Result.fetchall()` / `fetchone()`.
- `_StubConn` fakes `engine.begin()` and pattern-matches on SQL substrings (`"FROM pg_indexes"`, `"FROM pg_class"`, `"relkind = 'i'"`) to return canned rows.
- `_BeginCtx` / `_StubEngine` provide context-manager and `execute(...)` semantics so production code paths run unmodified.

This is the project's de-facto pattern for testing DB code without spinning up Postgres. Reuse it (or migrate to `pytest-mock`) when adding tests for other `dags/utils/*.py` helpers.

The Composer test (`add_dags_to_composer_test.py`) takes the opposite approach — real `google.cloud.storage.Client`, `tempfile.mkdtemp()`, and `pytest.fixture(scope="function" | "module")` for setup/teardown — so it must run with real GCP credentials.

## Fixtures and Sample Data

- There is no `tests/fixtures/` directory anywhere in the repo.
- Database seed data lives in `db-sample-data/` at the repo root and is loaded by `app.InsertDashbaordSampleData()` (see `Taipei-City-Dashboard-BE/app/app.go` lines 92–96). Future BE integration tests can reuse this seed against a throwaway Postgres.

## Coverage

- No coverage thresholds are enforced anywhere.
- No `coverage.py`, `nyc`, `c8`, or `go test -cover` invocations are wired into CI.
- `pytest-cov` is not configured; if you add it, suggest committing a `pyproject.toml` with `[tool.pytest.ini_options]` so settings are discoverable.

## CI Behavior (important caveat)

GitHub Actions workflows live in `.github/workflows/`:

- `node.js.yml` — runs `npm ci` and `npm run build --if-present` against Node `18.x` and `20.x` in `Taipei-City-Dashboard-FE`. **Does not run any test command.**
- `go.yml` — runs `go build -v ./...` in `Taipei-City-Dashboard-BE`. **Does not run `go test`.** Note also it pins `go-version: "1.21.x"` while `go.mod` declares `go 1.24.4` — builds will fail until this drifts back into sync.
- `build-and-push.yml` — image build/push only.

Both `node.js.yml` and `go.yml` only trigger on pushes/PRs to `main`, so feature branches landing on `develop` are not gated by anything beyond the local lint that `npm run build` runs.

## Manual / Smoke Testing Workflow

In the absence of automated tests, the de facto QA process is:

1. Run the FE locally with `cd Taipei-City-Dashboard-FE && npm run dev` (Vite serves on port 80 with proxies to the live `citydashboard.taipei` API — see `vite.config.js` lines 22–35).
2. Or against a local BE via `DOCKER_COMPOSE=true npm run dev`, which proxies `/api/dev` to `http://dashboard-be:8080/v1` (`vite.config.js` lines 8–20).
3. Tick the "code has been thoroughly tested and no visible bugs have been introduced" box in `.github/PULL_REQUEST_TEMPLATE.md` — this checklist item is currently the only enforced "test" gate.

## Gaps Worth Filling First

If/when test infrastructure is added, the highest-value targets given current code shape are:

1. **`Taipei-City-Dashboard-FE/src/assets/utilityFunctions/calculateHaversineDistance.js`** and `validate.js` — pure functions with explicit error branches.
2. **`Taipei-City-Dashboard-BE/app/util/auth.go`** — `GenerateJWT`, `DecodeCredentials`, `HasPermission` are deterministic and security-sensitive.
3. **`Taipei-City-Dashboard-BE/app/middleware/auth.go`** `ValidateJWT` — currently silently downgrades unauth'd requests to "guest viewer"; a regression here is a privilege-escalation risk that no test would catch today.
4. **`Taipei-City-Dashboard-DE/dags/utils/extract_stage.py`, `transform_*.py`, `load_stage.py`** — share the stub-engine pattern from `test_housekeeping.py`.

---

*Testing analysis: 2026-05-02*
