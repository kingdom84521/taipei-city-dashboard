# External Integrations

**Analysis Date:** 2026-05-02

## APIs & External Services

### Mapping

**Mapbox GL JS:**
- Used for: Base map rendering, custom vector tiles, popups, markers, 3D camera
- Wired up: `Taipei-City-Dashboard-FE/src/store/mapStore.js:106-107` (sets `mapboxGl.accessToken`) and `:213` (custom tile URL)
- Configs: `Taipei-City-Dashboard-FE/src/assets/configs/mapbox/mapConfig.js`, `mapStyle.js`
- Auth: Public access token via `VITE_MAPBOXTOKEN` (env at build time); custom tile endpoint via `VITE_MAPBOXTILE`

**Deck.gl (over Mapbox):**
- Used for: Layered visualizations on top of Mapbox (`ArcLayer`, `MapboxOverlay`)
- Wired up: `Taipei-City-Dashboard-FE/src/store/mapStore.js:17-18`
- Auth: None (renders client-side, uses Mapbox token via the underlying map)

**GeoServer (Taipei City):**
- Used for: WMS/WFS geographic layer service
- Wired up: Vite dev proxy `Taipei-City-Dashboard-FE/vite.config.js:30-34` proxies `/geo_server` → `https://citydashboard.taipei/geo_server/`
- Auth: None at the proxy layer (public endpoint)

### Authentication / Identity

**Taipei Pass / ISSO (Taipei City SSO — `id.taipei`):**
- Used for: OAuth-style citizen login for the dashboard
- Wired up (BE): `Taipei-City-Dashboard-BE/app/controllers/isso.go` (callback, token exchange, user info)
- Wired up (FE): `Taipei-City-Dashboard-FE/src/store/authStore.js:77-89` (`loginByTaipeiPass(code)` → `GET /auth/callback?code=...`)
- Routes: `POST /auth/login`, `GET /auth/callback`, `POST /auth/logout` (`Taipei-City-Dashboard-BE/app/routes/router.go:configureAuthRoutes`)
- Auth method: OAuth 2.0 authorization code flow
- Endpoints (defaults from `global.go`): `ISSO_URL=https://id.taipei/isso`, `TAIPEIPASS_URL=https://id.taipei/tpcd`
- Credentials: `ISSO_CLIENT_ID`, `ISSO_CLIENT_SECRET` (env vars; passed as Docker build ARGs in backend `Dockerfile`)
- Frontend exposes: `VITE_TAIPEIPASS_URL`, `VITE_TAIPEIPASS_CLIENT_ID`, `VITE_TAIPEIPASS_SCOPE`

**JWT (in-house):**
- Used for: Session authentication for non-SSO and post-SSO requests
- Wired up: `Taipei-City-Dashboard-BE/app/middleware/auth.go` (`ValidateJWT`, `IsLoggedIn`, `IsSysAdm`); applied globally in `routes/router.go:ConfigureRoutes`
- Library: `github.com/dgrijalva/jwt-go v3.2.0+incompatible`
- Auth method: HS256 with `JWT_SECRET` env var; token set as `Authorization: Bearer <token>` (FE: `src/router/axios.js:27`, persisted to `localStorage` as `token` / `isso_token`)

### LLM / AI

**TWCC AI Foundry (TaiwanCloudComputing — Llama 3.3 hosted):**
- Used for: Conversational AI / chart query agent
- Wired up: `Taipei-City-Dashboard-BE/app/services/ai/providers/twcc/twcc.go` (custom langchaingo `llms.Model` implementation), invoked from `app/services/ai/ai_service.go:ChatWithTWCC`
- Routes: `configureAIRoutes()` and `configureChatLogRoutes()` in `app/routes/router.go`; controller `app/controllers/ai.go`
- Auth: Bearer API key in HTTP header
- Endpoint: `TWCC_API_URL` (default `https://api-ams.twcc.ai/api`), model `TWCC_MODEL` (default `llama3.3-ffm-70b-32k-chat`)
- Concurrency: Capped via `golang.org/x/sync/semaphore` using `TWCC_MAX_CONCURRENT` (`ai_service.go:20-25`)

**ONNX embedding model (local):**
- Used for: Generating text embeddings for Qdrant semantic search
- Wired up: `Taipei-City-Dashboard-BE/global/global.go:125-126` (`LMSession`, `LMTokenizer`); embeddings produced in `app/models/qdrant.go` (`GenVector`)
- Model artifact: Built into the BE container via the `model_export` Dockerfile stage; mounted at `/opt/lm_model/onnx-e5/` (configurable via `LM_MODEL_PATH`)
- Source: HuggingFace `intfloat/multilingual-e5` exported with `optimum[onnxruntime]` (see `Taipei-City-Dashboard-BE/export_model.py`, `export_model_docker.py`)
- Auth: Optional `HF_TOKEN` build ARG for private/rate-limited HuggingFace downloads
- Native runtime: ONNX Runtime v1.23.2 (`https://github.com/microsoft/onnxruntime/releases/download/v1.23.2/...`) downloaded into `/usr/lib/libonnxruntime.so` at image build

### Data Sources (Data Engineering)

**TDX — Transport Data eXchange (`tdx.transportdata.tw`):**
- Used for: Transit/transport open data ingestion
- Wired up: `Taipei-City-Dashboard-DE/dags/utils/auth_tdx.py` (`TDXAuth.get_token`)
- Token endpoint: `https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token`
- Auth: OAuth2 `client_credentials` grant; token cached to `tdx_token.pickle` until expiry
- Credentials: Airflow Variables `TDX_CLIENT_ID`, `TDX_CLIENT_SECRET`

**CHT / HiNet Crowds (`crowds.hinet.net`):**
- Used for: Crowd density / mobile signal data
- Wired up: `Taipei-City-Dashboard-DE/dags/utils/auth_cht.py` (`CHTAuth.get_token`)
- Endpoint: `https://crowds.hinet.net/webapi/api/Login`
- Auth: Username/password JSON POST → access token cached to `cht_token.pickle`
- Credentials: Airflow Variables `CHT_ACCOUNT`, `CHT_PASSWORD`

**Taipei Open Data portal (`data.taipei`):**
- Used for: City open dataset ingestion (e.g. childcare facilities — `dags/proj_city_dashboard/D100102_1/childcare_etl.py`)
- Wired up: Helpers `get_data_taipei_api`, `get_data_taipei_file_last_modified_time` in `Taipei-City-Dashboard-DE/dags/utils/extract_stage.py`
- Auth: None (public open-data API)

## Data Storage

### Databases

**PostgreSQL — `dashboard` (data DB):**
- Image: `postgis/postgis:16-3.4-alpine` (`docker/docker-compose-db.yaml:11-20`, container `postgres-data`)
- Used for: Component data, geometry, viewpoints, dashboard payloads (PostGIS geometry types)
- Connection (BE): `Taipei-City-Dashboard-BE/global/global.go:79-86` → `global.PostgresDashboard`; opened via GORM in `app/models/database.go`
- Auth: `DB_DASHBOARD_USER` / `DB_DASHBOARD_PASSWORD` env vars

**PostgreSQL — `dashboardmanager` (manager DB):**
- Image: `postgis/postgis:16-3.4-alpine` (container `postgres-manager`)
- Used for: User accounts, roles, groups, permissions, dashboard configs, chat logs, contributors
- Connection (BE): `Taipei-City-Dashboard-BE/global/global.go:69-76` → `global.PostgresManager`
- Bootstrap: `Taipei-City-Dashboard-BE/app/initial/initial.go` runs `psql -f` against seed file `dashboardmanager-demo.sql` (see `db-sample-data/`)

**Qdrant (vector DB):**
- Image: `qdrant/qdrant:latest` (`docker/docker-compose-db.yaml:48-64`); HTTP `:6333`, gRPC `:6334`
- Used for: Vector similarity search over component descriptions; collection rebuilt by `Taipei-City-Dashboard-BE/app/services/qdrant.go:RebuildQdrantPublicCollection`
- Default collection: `query_charts`
- Auth: API key header `api-key: $QDRANT_API_KEY`; enforced via `QDRANT__SERVICE__API_KEY_ENABLED=true`
- One-shot upgrade job: `vector-db-upgrade` service in `docker/docker-compose.yaml:85-99`

**Redis:**
- Image: `redis:7.2.3-alpine` (`docker/docker-compose-db.yaml:4-9`)
- Used for: Rate limiting (`Taipei-City-Dashboard-BE/app/middleware/rateLimit.go`), cache
- Client: `github.com/go-redis/redis v6.15.9+incompatible`
- Connection: `global.Redis` — `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` / `REDIS_DB`

### File / Object Storage

**MinIO (S3-compatible) — DE only:**
- Used for: Object storage for ETL artifacts
- Library: `minio==7.2.5` (`Taipei-City-Dashboard-DE/docker/prod/requirements.txt`)
- Auth: Configured via Airflow Variables / connection (not in repo)

**Google Cloud Storage — DE CI only:**
- Used for: Uploading DAG artifacts to Cloud Composer
- Library: `google-cloud-storage==2.9.0` (`Taipei-City-Dashboard-DE/cicd/utils/requirements.txt`)
- Auth: Service account via Cloud Build environment

**Local filesystem:**
- BE logs: `Taipei-City-Dashboard-BE/logs/`
- DE pickled tokens / data: `DATA_PATH` set in `dags/settings/global_config.py`

## Monitoring & Observability

**Logging:**
- BE: Custom `logs/` package wrapping `github.com/comail/colog` — leveled colored logs to stdout
- FE: Browser `console` (ESLint allows only `warn`/`error` per `eslint.config.js:22`)
- DE: Standard Airflow task logging + `logging` module

**Metrics:**
- Helm template `helm-chart/templates/servicemonitor.yaml` — Prometheus Operator ServiceMonitor (existence; not deeply audited)

**Error Tracking:**
- No third-party tracker (Sentry/Datadog/etc.) detected

**Analytics:**
- Frontend references `gtag` (Google Analytics global, `mapStore.js:11`); no inline GA snippet found in `index.html` (likely injected at deploy)

## CI/CD & Deployment

**GitHub Actions (`.github/workflows/`):**
- `node.js.yml` — Frontend: `npm ci && npm run build` on Node 18.x / 20.x for push/PR to `main`
- `go.yml` — Backend: `go build ./...` on Go 1.21.x for push/PR to `main`
- `build-and-push.yml` — Builds & pushes images to Azure Container Registry (`citydashboard-dhc2gtetgcfqeqhv.azurecr.io`) for branches `sit` / `pre-develop` / `develop`; deploys to namespace `dashboard`

**Google Cloud Build:**
- `Taipei-City-Dashboard-FE/cloudbuild.yaml` — Frontend image build with secrets (`MAPBOX_TOKEN`, `TAIPEIPASS_CLIENT_ID`)
- `Taipei-City-Dashboard-BE/cloudbuild.yaml` — Backend image build
- `Taipei-City-Dashboard-DE/cicd/add-dags-to-composer.cloudbuild.yaml` — Sync DAGs to Cloud Composer (Airflow on GCP)

**Hosting:**
- Public site: `https://citydashboard.taipei` (referenced from FE Vite proxy and README)
- Kubernetes deployment via `helm-chart/` (values: `values-prod.yaml`, `values-sit.yaml`, `values-external-db.yaml`)

## Webhooks & Callbacks

**Incoming:**
- `GET /api/v1/auth/callback` — TaipeiPass / ISSO OAuth redirect callback (`Taipei-City-Dashboard-BE/app/controllers/isso.go::ExecIssoAuth`)

**Outgoing (server-initiated HTTP):**
- ISSO token + userinfo exchange (`controllers/isso.go`)
- Qdrant REST: `DELETE/PUT /collections/{name}` and `PUT /collections/{name}/points` (`app/services/qdrant.go`)
- TWCC chat completions (`app/services/ai/providers/twcc/twcc.go`)
- TDX OAuth + data fetches (DE)
- CHT login + crowd data (DE)
- data.taipei open-data API (DE)

**WebSocket:**
- Controller present: `Taipei-City-Dashboard-BE/app/controllers/websocket.go`
- Routes currently disabled — `// configureWsRoutes()` is commented out in `app/routes/router.go`

## Environment Configuration

**Required env vars (backend — see `global/global.go`):**
- `JWT_SECRET`, `IDNO_SALT`
- `GIN_DOMAIN`, `GIN_PORT`
- `DB_DASHBOARD_HOST`, `DB_DASHBOARD_PORT`, `DB_DASHBOARD_USER`, `DB_DASHBOARD_PASSWORD`, `DB_DASHBOARD_DBNAME`, `DB_DASHBOARD_SSLMODE`
- `DB_MANAGER_HOST`, `DB_MANAGER_PORT`, `DB_MANAGER_USER`, `DB_MANAGER_PASSWORD`, `DB_MANAGER_DBNAME`, `DB_MANAGER_SSLMODE`
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB`
- `ISSO_URL`, `TAIPEIPASS_URL`, `ISSO_CLIENT_ID`, `ISSO_CLIENT_SECRET`
- `QDRANT_URL`, `QDRANT_COLLECTION`, `QDRANT_API_KEY`
- `LM_MODEL_PATH`
- `TWCC_API_URL`, `TWCC_API_KEY`, `TWCC_MODEL`, `TWCC_TIMEOUT`, `TWCC_MAX_RETRY`, `TWCC_MAX_CONCURRENT`
- `DASHBOARD_DEFAULT_USERNAME`, `DASHBOARD_DEFAULT_Email`, `DASHBOARD_DEFAULT_PASSWORD` (init only)

**Required env vars (frontend — see `Taipei-City-Dashboard-FE/.env.template`):**
- `VITE_API_URL`, `VITE_APP_TITLE`, `VITE_APP_VERSION`
- `VITE_MAPBOXTOKEN`, `VITE_MAPBOXTILE`
- `VITE_TAIPEIPASS_URL`, `VITE_TAIPEIPASS_CLIENT_ID`, `VITE_TAIPEIPASS_SCOPE`

**Required Airflow Variables (DE):**
- `TDX_CLIENT_ID`, `TDX_CLIENT_SECRET`
- `CHT_ACCOUNT`, `CHT_PASSWORD`
- `HTTPS_PROXY_ENABLED`, `PROXY_URL`

**Secrets location:**
- Local dev: `docker/.env` and `Taipei-City-Dashboard-FE/.env` (templates committed; actual files git-ignored — existence noted, contents not read)
- CI: GitHub Actions secrets + Cloud Build substitutions (`$$MAPBOX_TOKEN`, `$$TAIPEIPASS_CLIENT_ID`)
- K8s: Helm values + `imagePullSecrets: [{name: acr-secret}]` (`helm-chart/values-sit.yaml`)

---

*Integration audit: 2026-05-02*
