# Coding Conventions

**Analysis Date:** 2026-05-02

This monorepo contains three subprojects with distinct conventions. Conventions below are split per subproject so contributors can apply the right rules in the right tree.

- Frontend (Vue 3 + JS, some TS): `Taipei-City-Dashboard-FE/`
- Backend (Go + Gin + GORM): `Taipei-City-Dashboard-BE/`
- Data Engineering (Python + Airflow): `Taipei-City-Dashboard-DE/`

## Linting & Formatting

**Frontend:**
- Linter: ESLint v9 flat config — `Taipei-City-Dashboard-FE/eslint.config.js`
  - Base: `js.configs.recommended` + `eslint-plugin-vue` flat/recommended
  - Indentation: hard tabs (`indent: ["error", "tab"]`)
  - `quotes`, `semi`, `spaced-comment`: off (mixed double/single quotes appear in the codebase; semicolons are nonetheless used everywhere by convention)
  - `no-console`: error, but `console.warn` and `console.error` are allowed
  - `no-unused-vars`: error, with `argsIgnorePattern: "req|res|next|val|err"` (carry-over from the original Express-style backend naming)
  - `prefer-destructuring` enabled for objects only
  - Several `vue/*` rules deliberately disabled (`prop-name-casing`, `require-default-prop`, `require-prop-types`, `no-template-shadow`, `no-setup-props-destructure`)
  - Ignores: `**/public/`, `**/dist/`, `**/node_modules/`, `*.json`
- Formatter: Prettier — `Taipei-City-Dashboard-FE/.prettierrc`
  - `useTabs: true`, `tabWidth: 4`, `semi: true`, `singleQuote: false`
- Run on every build: `npm run build` runs `eslint . --fix && vite build` (see `Taipei-City-Dashboard-FE/package.json` `scripts`). Stand-alone lint: `npm run lint`.
- No TypeScript compiler config (`tsconfig.json`) is checked in even though a handful of `.ts` files exist under `Taipei-City-Dashboard-FE/src/dashboardComponent/utilities/` — Vite handles them with esbuild's loose mode. Treat `.ts` files there as JS-with-types, not as a strict TS project.

**Backend (Go):**
- No `golangci-lint` / `gofmt` config file is checked in. CI (`.github/workflows/go.yml`) only runs `go build -v ./...`, so style is enforced informally via `gofmt` defaults (tabs, `goimports`-style grouping).
- Standard `go vet` is not wired up in CI — be defensive when introducing new packages.

**Data Engineering (Python):**
- No `pyproject.toml`, `setup.cfg`, `.flake8`, `ruff.toml`, or `black` config in the repo. Style is "PEP 8-ish" by convention.
- Imports inside Airflow task callables are deliberately deferred (function-local), e.g. `Taipei-City-Dashboard-DE/dags/proj_city_dashboard/D010501/D010501.py` lines 5–14, to keep DAG parse time low.

## Naming Patterns

**Files:**
- Vue Single-File Components: `PascalCase.vue` — examples: `LogIn.vue`, `MapContainer.vue`, `DashboardComponent.vue`, `MakeNewThingHerePanel.vue` under `Taipei-City-Dashboard-FE/src/components/dialogs/` and `src/dashboardComponent/components/`.
- Pinia stores: `camelCaseStore.js` — `Taipei-City-Dashboard-FE/src/store/authStore.js`, `contentStore.js`, `mapStore.js`, `dialogStore.js`, `adminStore.js`, `chatStore.js`.
- JS utilities: `camelCase.js` — `Taipei-City-Dashboard-FE/src/assets/utilityFunctions/calculateHaversineDistance.js`, `colorConvert.js`, `getThematicColor.js`.
- TS utilities (rare): `camelCase.ts` — `Taipei-City-Dashboard-FE/src/dashboardComponent/utilities/cityManager.ts`, `chartTypes.ts`.
- Go files: `lowerCamelCase.go` for resources (one file per domain) — `Taipei-City-Dashboard-BE/app/controllers/dashboard.go`, `auth.go`, `componentConfig.go`. Special-case `sanitizeXForwardedFor.go` keeps long camelCase to mirror the middleware function it exports.
- Airflow DAG modules: project code IDs `D######(_n).py` with a sibling `job_config.json` — e.g. `Taipei-City-Dashboard-DE/dags/proj_city_dashboard/D010501/D010501.py`.
- New scaffolded feature folder uses kebab-case: `Taipei-City-Dashboard-FE/src/make-new-thing-here/` (the recently renamed datalab shell).

**Identifiers:**
- JS / Vue: `camelCase` for variables/functions, `PascalCase` for component names registered in templates, `UPPER_SNAKE` for env (`VITE_APP_TITLE`, `VITE_TAIPEIPASS_URL` in `LogIn.vue`).
- API field names returned/consumed from the BE are `snake_case` (e.g. `user_id`, `is_admin`, `is_active`, `login_at` in `authStore.js` state) — matches the Go struct JSON tags.
- Go: exported `PascalCase` (`Login`, `GenerateJWT`, `GetUserInfoFromContext`), unexported `camelCase` (`emailRegex`, `jwtSecret`); GORM models use struct tags `json:"snake_case" gorm:"column:..."` (see `Taipei-City-Dashboard-BE/app/models/auth.go` lines 11–34).
- Python (DE): `snake_case` functions/variables, `PascalCase` classes (`HousekeepingConfig`, `PostgresHousekeeper` in `Taipei-City-Dashboard-DE/dags/utils/housekeeping.py`).

## File / Module Layout

**Frontend (`Taipei-City-Dashboard-FE/src/`):**
- `main.js` — app bootstrap (Vue + Pinia + Router + Apexcharts directive registration).
- `App.vue` — root component.
- `router/` — Vue Router setup (`index.js`) and a centralized Axios instance (`router/axios.js`).
- `store/` — one Pinia store per domain.
- `views/` — top-level routed pages (`DashboardView.vue`, `MapView.vue`, `EmbedView.vue`, plus `views/admin/Admin*.vue`).
- `components/` — split by purpose: `charts/`, `dialogs/`, `icons/`, `map/`, `utilities/{bars,forms,miscellaneous}/`.
- `dashboardComponent/` — self-contained chart subsystem with its own `components/`, `utilities/`, `styles/`, `assets/`, and its own LICENSE — treat as a vendored subpackage.
- `assets/` — `configs/`, `images/`, `styles/`, `utilityFunctions/`.
- `directives/` — custom Vue directives (e.g. `horizontalWheel`).
- `make-new-thing-here/` — feature injection slot mounted inside `MapView.vue` when `route.query.index === "make-new-thing-here"` (see `MapView.vue` line 24–26).

**Backend (`Taipei-City-Dashboard-BE/`):**
- `main.go` → `cmd/root.go` (cobra) → `app.StartApplication()` in `app/app.go`.
- `app/` follows a controller/model/middleware/route layered split:
  - `app/controllers/` — one file per resource (`auth.go`, `dashboard.go`, `user.go`, `componentData.go`, `ai.go`, …).
  - `app/models/` — GORM models + DB handlers (no separate repository layer); two DBs (`DBManager`, `DBDashboard`) declared in `app/models/database.go`.
  - `app/routes/router.go` — single file registering every route group.
  - `app/middleware/` — `auth.go`, `rateLimit.go`, `common.go`, `sanitizeXForwardedFor.go`.
  - `app/util/` — small helpers (`auth.go`, `common.go`, `user.go`).
  - `app/services/` — outbound integrations (`qdrant.go`, `ai/`).
  - `app/cache/redis.go`, `app/initial/` (cron, seed data).
- `global/` — package-level config and constants loaded from env (`global.go`, `consts.go`).
- `logs/` — wrapper around `comail/colog`.

**Data Engineering (`Taipei-City-Dashboard-DE/dags/`):**
- One folder per dataset with `<DAG_ID>.py` + `job_config.json` + `__init__.py`.
- Shared logic in `dags/utils/` (extract/transform/load helpers, `housekeeping.py`).
- Custom operators in `dags/operators/` (e.g. `common_pipeline.py:CommonDag`).
- `dags/test/test_housekeeping.py` is the only test file; CI does not currently run it.

## Import Organization

**Frontend (`src/main.js`, `src/router/axios.js`, `src/store/*.js`):**
1. Vue / framework imports first.
2. CSS / asset side-effect imports next.
3. Internal store imports (`./authStore`, `./dialogStore`, …).
4. Local component imports last.
- Path style: relative imports throughout (`../store/authStore`, `../../assets/images/TUIC.svg`). No bundler aliases (`@/`) configured in `vite.config.js`.

**Backend (Go):** standard `goimports` 3-group style — stdlib, then `TaipeiCityDashboardBE/...` internal packages, then third-party (`github.com/...`, `gorm.io/...`). See `Taipei-City-Dashboard-BE/app/controllers/auth.go` lines 3–17.

**Python DE:** stdlib, third-party, local — but task callables import lazily inside the function body to keep top-level light.

## Component & Store Patterns (Frontend)

- Vue components use `<script setup>` Composition API (e.g. `Taipei-City-Dashboard-FE/src/components/dialogs/LogIn.vue` line 3, `MakeNewThingHerePanel.vue`, `MapView.vue`).
- Styles use `<style scoped lang="scss">` and reference CSS custom properties (`var(--font-m)`, `var(--color-complement-text)`) defined in `src/assets/styles/globalStyles.css`.
- Pinia stores use the **options API** (`defineStore("auth", { state, getters, actions })`) consistently — see `Taipei-City-Dashboard-FE/src/store/authStore.js` line 15. Stores cross-call each other via `useOtherStore()` inside actions.
- A custom Pinia plugin in `main.js` lines 30–44 wires `options.debounce` to wrap declared actions with `lodash.debounce`.

## API & Error Handling

**Frontend HTTP:**
- All HTTP goes through the singleton `http` Axios client in `Taipei-City-Dashboard-FE/src/router/axios.js`.
- Response interceptor (lines 35–97) maps HTTP status codes to user-facing toast notifications via `dialogStore.showNotification("fail", ...)`. Messages are localized in **Traditional Chinese** ("登入逾時，請重新登入", "請求過於頻繁，請稍後再試").
- 401 with an existing token → forced `authStore.handleLogout()`.
- Errors are re-thrown via `Promise.reject(error)` so callers can still `try/catch`.
- File begins with `/* eslint-disable indent */` — note this directive style for files that need a localized escape hatch.

**Backend HTTP:**
- Controllers always return `c.JSON(<status>, gin.H{"status": "...", "message": ...})` or `gin.H{"error": ...}`. See `dashboard.go` line 40 vs `auth.go` line 30.
- Errors logged via `logs.FError` / `logs.FInfo` (see `Taipei-City-Dashboard-BE/app/controllers/auth.go` line 62, `app/app.go` line 48).
- DB errors check `errors.Is(err, gorm.ErrRecordNotFound)` to differentiate 404 vs 500 (`dashboard.go` line 62).
- Auth middleware (`app/middleware/auth.go`) is intentionally **permissive**: a missing/invalid Authorization header sets a guest viewer permission set rather than rejecting — keep this behavior in mind when adding new endpoints.

## Logging & Comments

- Backend logging: `logs.FInfo`, `logs.FWarn`, `logs.FError` with printf-style formats — never `fmt.Println`.
- Frontend: `console.error` allowed; `console.log` is an ESLint error.
- File headers: every long-lived JS / Go / Vue file starts with the TUIC contributor banner (`/* Developed By Taipei Urban Intelligence Center 2023-2024 */` plus the developer/data/UX/testing block) — see `main.js` lines 1–9, `main.go` lines 1–9, `app/app.go` lines 1–10, `views/MapView.vue` lines 1–9. Preserve this header when editing legacy files; new scaffolded files (e.g. `make-new-thing-here/MakeNewThingHerePanel.vue`) skip it and that is acceptable.
- Inline comments in newer code are written in **Traditional Chinese** (e.g. `vite.config.js` line 5 "嘗試讀取環境變數", `mapStore.js` line 51 "// 3D Mrt Map 相關 Utility Functions").

## Validation Patterns

- Frontend validation lives in `Taipei-City-Dashboard-FE/src/assets/utilityFunctions/validate.js` and uses callback-style validators (`(rule, value, callback) => …`) compatible with form libraries. Error strings are Chinese (e.g. "請輸入 E-mail").
- Backend validation is regex/inline inside controllers (e.g. `emailRegex` constant in `app/controllers/auth.go` line 20).

## Commit Message Conventions

The repository uses **mixed Chinese + Conventional Commits** prefixes. Real examples from `git log` on `develop`:

- `重新命名: datalab → make-new-thing-here` (rename)
- `修正: DataLab 改為 MapView 下的 synthetic index,殼層保留` (correction)
- `新增: 為新功能組件集 scaffold /datalab 注入點` (addition / new feature)
- `修復: childcare_etl 截斷 name/phone 至 50 字對齊 DB schema` (bug fix)
- `修改: 24 支 DAG 改為動態 resolve data.taipei RID` (modification)
- `feature: twai api with sse and tool calling (#1213)`
- `fix(etl): minor corrections`
- `feat: ...`, `fix: ...`, `[fix] ...` also appear

**Practical rules:**
- Prefer the Chinese verb prefix (`新增` / `修改` / `修正` / `修復` / `重新命名`) for direct commits to `develop`/feature branches.
- Use `feat:` / `fix:` / `feature:` (English Conventional Commits) for squash-merge PR titles, often with `(#NNNN)` issue/PR refs at the end.
- Keep the subject in the imperative present tense and reference subsystems explicitly (`DAG`, `ETL`, `MapView`, `make-new-thing-here`).
- Body / details after `:` may freely mix Chinese and English; commas in subject are sometimes the full-width `,` — accept either.

## PR Conventions

- `.github/PULL_REQUEST_TEMPLATE.md` requires linking an issue, a Type checkbox (Bug Fix / New Feature), and a four-item checklist (linter run, manually tested, fully resolves issue, no scope creep).
- `.github/CONTRIBUTING.md` defers to the public docs site at `https://tuic.gov.taipei/documentation/front-end/contribution-overview` — there is no in-repo CONTRIBUTING text beyond that pointer.

## Function Design

- Frontend: small composition functions inside `<script setup>`; long handlers split into `handleX` / `openX` style (`LogIn.vue` lines 10–69).
- Backend: each handler is a single `func(c *gin.Context)` that parses input, calls a `models.*` function, then returns JSON. No service layer between controller and model.
- Python: ETL DAGs follow `extract → transform → load` callables registered through `CommonDag(...)` (see `dags/proj_city_dashboard/D010501/D010501.py`).

---

*Convention analysis: 2026-05-02*
