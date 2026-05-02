# Technology Stack

**Analysis Date:** 2026-05-02

This monorepo contains three subprojects sharing one repo root:

- `Taipei-City-Dashboard-FE/` — Vue 3 SPA (Vite, Mapbox, Deck.gl)
- `Taipei-City-Dashboard-BE/` — Go (Gin) REST API + ONNX language model + Qdrant integration
- `Taipei-City-Dashboard-DE/` — Apache Airflow data engineering pipelines (Python)

Plus orchestration assets: `docker/` (compose files), `helm-chart/` (Helm), `.github/workflows/` (CI), `db-sample-data/` (seed SQL).

## Languages

**Primary:**
- JavaScript / Vue SFC — Frontend (`Taipei-City-Dashboard-FE/src/**/*.{js,vue}`)
- Go 1.24.4 (toolchain `go1.24.10`) — Backend (`Taipei-City-Dashboard-BE/go.mod`)
- Python 3 (Airflow image `apache/airflow:2.10.5`) — Data pipelines (`Taipei-City-Dashboard-DE/dags/**/*.py`)

**Secondary:**
- SCSS / CSS — Frontend styles via `sass` (`Taipei-City-Dashboard-FE/src/assets/styles/**`)
- SQL — Sample data and schema seeds (`db-sample-data/`)
- HCL/YAML — Helm templates (`helm-chart/templates/*.yaml`), GitHub Actions, Cloud Build (`*/cloudbuild.yaml`)
- Bash — Container entrypoints (`Taipei-City-Dashboard-FE/docker-entrypoint.sh`)

## Runtime

**Frontend:**
- Node.js — image `node:21-slim` for build (`Taipei-City-Dashboard-FE/Dockerfile`); CI matrix `[18.x, 20.x]` (`.github/workflows/node.js.yml`)
- Served by `nginx:alpine` in production (`Taipei-City-Dashboard-FE/nginx.conf` listens on port 8081)

**Backend:**
- Go 1.25.4 builder image `golang:1.25.4-bookworm`; runtime `debian:bookworm-slim` (`Taipei-City-Dashboard-BE/Dockerfile`)
- ONNX Runtime native lib v1.23.2 downloaded at image build (`/usr/lib/libonnxruntime.so`)
- Listens on port 8080 (`global.GinAddr` in `Taipei-City-Dashboard-BE/global/global.go`)

**Data Engineering:**
- Apache Airflow 2.10.5 (`Taipei-City-Dashboard-DE/docker/prod/Dockerfile`)
- Configured via `Taipei-City-Dashboard-DE/config/airflow.cfg`

**Package Manager:**
- npm — Frontend; lockfile present at `Taipei-City-Dashboard-FE/package-lock.json`; install via `npm ci` in Dockerfile
- Go modules — Backend; `Taipei-City-Dashboard-BE/go.mod` + `go.sum`
- pip — DE; `Taipei-City-Dashboard-DE/docker/{develop,prod}/requirements.txt`

## Frameworks

### Frontend (`Taipei-City-Dashboard-FE/package.json`, version 2.2.0)

**Core:**
- `vue@^3.4.15` — UI framework (Composition + Options API in `src/components/**/*.vue`)
- `vue-router@^4.2.5` — SPA routing (`src/router/index.js`)
- `pinia@^2.1.7` — State management (`src/store/*.js`: `authStore`, `contentStore`, `mapStore`, `dialogStore`, `chatStore`, `adminStore`)

**Mapping & Geospatial:**
- `mapbox-gl@^3.1.0` — Base map renderer (`src/store/mapStore.js`)
- `@deck.gl/core`, `@deck.gl/layers`, `@deck.gl/mapbox` — All `^9.0.9` for layered visualization on top of Mapbox
- `@turf/turf@^6.5.0` — Geospatial calculations
- `three@^0.163.0` + `threebox-plugin@^2.2.7` — 3D scenes (e.g. 3D MRT map utilities in `src/assets/utilityFunctions/`)

**Charts & Media:**
- `apexcharts@^3.45.2` + `vue3-apexcharts@^1.4.4` — Chart components (`src/components/charts/`)
- `hls.js@^1.6.7` — HLS video stream playback (camera/CCTV layers)

**Utilities:**
- `axios@^1.6.5` — HTTP client (centralized in `src/router/axios.js`)
- `dayjs@^1.11.10` — Date handling
- `lodash.debounce@^4.0.8` — Debounce wired into Pinia plugin (`src/main.js:30-43`)
- `uuid@^9.0.1` — Identifier generation
- `@vueuse/core@^10.7.2` — Composition utilities
- `material-icons@^1.13.12` — Icon font

**Build/Dev:**
- `vite@^5.0.12` — Dev server + bundler (`vite.config.js`); dev server on port 80 with `/api` and `/geo_server` proxies
- `@vitejs/plugin-vue@^5.0.3` — Vue SFC plugin
- `vite-plugin-compression@^0.5.1` — Gzip pre-compression on build
- `sass@^1.70.0` — SCSS compilation
- `eslint@9.0.0` (`@eslint/js`) + `eslint-plugin-vue@^9.20.1` — Flat-config lint (`eslint.config.js`); enforced via `npm run build` (`eslint . --fix && vite build`)

### Backend (`Taipei-City-Dashboard-BE/go.mod`)

**Core:**
- `github.com/gin-gonic/gin v1.9.1` — HTTP web framework (routes in `app/routes/router.go`)
- `github.com/fvbock/endless v0.0.0-20170109170031-447134032cb6` — Zero-downtime restart wrapper

**Database:**
- `gorm.io/gorm v1.25.5` + `gorm.io/driver/postgres v1.5.4` — ORM
- `github.com/jackc/pgx/v5 v5.7.2` — PostgreSQL driver (transitive; required by GORM postgres driver)
- `github.com/lib/pq v1.10.9` — Used directly in `app/controllers/isso.go` for array types

**Cache / Queue:**
- `github.com/go-redis/redis v6.15.9+incompatible` — Redis client (config: `global.Redis`)

**Auth & Identity:**
- `github.com/dgrijalva/jwt-go v3.2.0+incompatible` — JWT signing (middleware: `app/middleware/auth.go`)
- `github.com/google/uuid v1.6.0` — UUID generation

**AI / ML:**
- `github.com/tmc/langchaingo v0.1.14` — LLM abstraction (used in `app/services/ai/ai_service.go`)
- `github.com/yalue/onnxruntime_go v1.22.0` — ONNX Runtime CGO binding for embedding model (`global.LMSession`)
- `github.com/sugarme/tokenizer v0.3.0` — HuggingFace tokenizer (`global.LMTokenizer`)
- `github.com/pkoukk/tiktoken-go v0.1.6` (indirect) — Token counting

**Scheduling & CLI:**
- `github.com/robfig/cron/v3 v3.0.1` — Cron jobs (`app/initial/cron.go`)
- `github.com/spf13/cobra v1.8.0` — CLI framework (`cmd/root.go`)

**Misc:**
- `github.com/comail/colog` — Colored logging (custom `logs/` package)
- `github.com/patrickmn/go-cache` (indirect) — In-memory caching
- `golang.org/x/sync v0.16.0` — `semaphore.Weighted` for AI request concurrency cap

### Data Engineering (`Taipei-City-Dashboard-DE/docker/prod/requirements.txt`)

**Core:**
- `apache/airflow:2.10.5` (base image) — Workflow orchestrator
- `apache-airflow-providers-postgres` (built into image) — PostgreSQL hooks (`PostgresHook` in `dags/operators/common_pipeline.py`)

**Geospatial:**
- `geopandas==0.13.2` (prod) / `1.1.1` (develop) — Geospatial DataFrames
- `GeoAlchemy2==0.14.7` — PostGIS SQLAlchemy types
- `Rtree==1.2.0` — Spatial indexing
- `geopy==2.4.1` — Geocoding
- GDAL (`gdal-bin`, `libgdal-dev`) — Installed via apt in Dockerfile

**Data IO:**
- `psycopg2==2.9.9` — PostgreSQL driver
- `openpyxl==3.1.2`, `XlsxWriter==3.2.0`, `odfpy==1.4.1` — Office document parsing
- `pyminizip==0.2.6` — Encrypted zip handling
- `wget==3.2` — Downloads
- `minio==7.2.5` — S3-compatible object storage client
- `google-cloud-storage==2.9.0` (CI utils only — `cicd/utils/requirements.txt`) — GCS uploads

**Testing:**
- `pytest==8.1.1` — Used in CI (`Taipei-City-Dashboard-DE/cicd/utils/requirements-test.txt`)

## Configuration

**Frontend env (`Taipei-City-Dashboard-FE/.env.template`):**
- `VITE_API_URL` — Backend base URL (defaults to `/api/dev` for dev proxy)
- `VITE_APP_TITLE`, `VITE_APP_VERSION`
- `VITE_MAPBOXTOKEN`, `VITE_MAPBOXTILE` — Mapbox creds + custom tile URL
- `VITE_TAIPEIPASS_URL`, `VITE_TAIPEIPASS_CLIENT_ID`, `VITE_TAIPEIPASS_SCOPE` — TaipeiPass OAuth (internal use only)
- Built into the image as ARGs in `Taipei-City-Dashboard-FE/Dockerfile`

**Backend env (`Taipei-City-Dashboard-BE/global/global.go`):**
- `JWT_SECRET`, `IDNO_SALT` — Secrets for token signing and ID hashing
- `GIN_DOMAIN`, `GIN_PORT` — HTTP bind address
- `DB_DASHBOARD_*`, `DB_MANAGER_*` — Two PostgreSQL databases (data + manager)
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB`
- `ISSO_URL`, `TAIPEIPASS_URL`, `ISSO_CLIENT_ID`, `ISSO_CLIENT_SECRET` — Taipei City SSO
- `QDRANT_URL`, `QDRANT_COLLECTION`, `QDRANT_API_KEY`
- `LM_MODEL_PATH` (default `/opt/lm_model/onnx-e5/`) — ONNX embedding model location
- `TWCC_API_URL`, `TWCC_API_KEY`, `TWCC_MODEL`, `TWCC_TIMEOUT`, `TWCC_MAX_RETRY`, `TWCC_MAX_CONCURRENT` — TWCC AI Foundry LLM config
- `DASHBOARD_DEFAULT_USERNAME/Email/PASSWORD` — Bootstrap admin user (`app/initial/initial.go`)

**Data Engineering env:**
- Airflow Variables (not env vars): `TDX_CLIENT_ID`, `TDX_CLIENT_SECRET`, `CHT_ACCOUNT`, `CHT_PASSWORD`, `HTTPS_PROXY_ENABLED`, `PROXY_URL`
- Loaded in `Taipei-City-Dashboard-DE/dags/utils/auth_tdx.py`, `auth_cht.py`, and `dags/settings/global_config.py`

**Compose orchestration:**
- `docker/docker-compose.yaml` — App services (FE, BE, vector-db-upgrade)
- `docker/docker-compose-db.yaml` — Postgres (×2), Redis, Qdrant, pgAdmin
- `docker/docker-compose-init.yaml` — One-shot init container
- Shared docker network: `br_dashboard` (external, must be pre-created)
- `.env.template` files exist at `Taipei-City-Dashboard-FE/.env.template` and `docker/.env.template` (existence noted; contents not quoted here)

**Build:**
- Frontend: `Taipei-City-Dashboard-FE/vite.config.js` — manual chunking by `node_modules` package
- Backend: `Taipei-City-Dashboard-BE/Dockerfile` — multi-stage (`model_export` → `builder` → `prod`/`dev`)
- DE: `Taipei-City-Dashboard-DE/docker/{develop,prod}/Dockerfile`

## Platform Requirements

**Development:**
- Docker + Docker Compose (compose v3.7 syntax)
- Node 21 (image), CI tests on 18.x and 20.x
- Go ≥ 1.24.4 (toolchain 1.24.10)
- Python via Airflow image — no host install required

**Production / Deployment:**
- Kubernetes via Helm chart `helm-chart/` (chart version 2.2.0, appVersion `"2.2.0"`)
  - Bitnami subcharts: `postgresql@15.x.x`, `redis@19.x.x` (conditionally enabled)
  - Templates: `frontend-deployment.yaml`, `backend-deployment.yaml`, `ingress.yaml`, `hpa.yaml`, `servicemonitor.yaml`, `serviceaccount.yaml`
- Container registry: Azure ACR `citydashboard-dhc2gtetgcfqeqhv.azurecr.io` (`.github/workflows/build-and-push.yml`)
- Google Cloud Build pipelines: `Taipei-City-Dashboard-{FE,BE}/cloudbuild.yaml`
- Google Cloud Composer for Airflow DAGs: `Taipei-City-Dashboard-DE/cicd/add-dags-to-composer.cloudbuild.yaml`
- Native dependency: ONNX Runtime shared library (auto-installed by backend Dockerfile for amd64/arm64)

---

*Stack analysis: 2026-05-02*
