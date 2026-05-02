---
phase: 02-fe-cross-compare-page
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - Taipei-City-Dashboard-FE/src/store/crossCompareStore.js
autonomous: true
requirements: [CC-02]
tags: [pinia, store, axios, localStorage, security]
must_haves:
  truths:
    - "useCrossCompareStore().fetchScores() resolves and populates state.scores with 41 rows when BE returns success"
    - "store.viewMode persists across page reloads via localStorage key 'crossCompare.viewMode'"
    - "Setting an invalid viewMode string ('foo') is REJECTED — store falls back to default 'metrotaipei' (D-09 + threat-model T-02-02-01)"
    - "store.enabledDistricts and store.disabledDistricts are derived (computed) from scores + viewMode — switching viewMode does not refetch (D-18)"
    - "store.rampDomain is derived [min, max] of total_score across fetched rows"
    - "store does NOT import mapboxgl, does NOT touch DOM (D-05)"
  artifacts:
    - path: "Taipei-City-Dashboard-FE/src/store/crossCompareStore.js"
      provides: "Pinia store: scores fetch + viewMode persistence + derived enabled/disabled sets"
      exports: ["useCrossCompareStore"]
      min_lines: 80
  key_links:
    - from: "Taipei-City-Dashboard-FE/src/store/crossCompareStore.js"
      to: "/api/v1/crosscompare/scores"
      via: "axios singleton (../router/axios)"
      pattern: "http\\.get\\(['\"]\\/crosscompare\\/scores['\"]"
    - from: "Taipei-City-Dashboard-FE/src/store/crossCompareStore.js"
      to: "localStorage"
      via: "setItem/getItem on key 'crossCompare.viewMode'"
      pattern: "crossCompare\\.viewMode"
    - from: "Taipei-City-Dashboard-FE/src/store/crossCompareStore.js"
      to: "../assets/configs/crossCompareConfig"
      via: "named import normalizeDistrictKey"
      pattern: "normalizeDistrictKey"
---

<objective>
Create the Pinia store `crossCompareStore.js` that owns: fetched scores, current view
mode, derived enabled/disabled district sets, and the colour-ramp domain. Implements
the data half of CC-02 (state + persistence). Plan 02-05 wires UI to it.

Purpose: Per D-04 / D-05 the view owns the Mapbox instance; the store owns DATA. This
separation means the store is testable / cheap to mount and never loads mapboxgl. Per
D-18 the toggle is a CLIENT-SIDE filter — single fetch on mount.

Output:
- New file `src/store/crossCompareStore.js` (Pinia options API store, mirrors `authStore.js` shape)
- A whitelist-validated `setViewMode(mode)` action that persists to localStorage (security: rejects arbitrary strings — see T-02-02-01)
- Derived getters: `rampDomain`, `enabledDistricts`, `disabledDistricts`, `scoreByDistrict`

NOTE: This plan does NOT modify `crossCompareConfig.js` — that file ships in Plan 02-03. We import `normalizeDistrictKey` from there. Wave 1 plans are independent (no shared file edits); both must finish before Plan 02-04 can mount the map.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/02-fe-cross-compare-page/02-CONTEXT.md
@.planning/phases/02-fe-cross-compare-page/02-PATTERNS.md
@./CLAUDE.md
@Taipei-City-Dashboard-FE/src/store/authStore.js
@Taipei-City-Dashboard-FE/src/store/contentStore.js
@Taipei-City-Dashboard-FE/src/router/axios.js
@.planning/fixtures/crosscompare_scores_v1.json

<interfaces>
<!-- Contracts the store consumes / produces. Use verbatim. -->

BE endpoint contract (Phase 1, locked):
- Method: GET
- URL: /crosscompare/scores?view={taipei|metrotaipei}
  (axios baseURL is VITE_API_URL — store writes only the path tail)
- Auth: none required (public)
- Success response: { status: "success", data: [Row, ...] }
- Row shape (snake_case, all 11 fields):
  {
    city: string,                  // e.g. "臺北市" or "新北市"
    district: string,              // e.g. "中正區"
    rank: number,                  // 1..41
    courses: number,
    food_businesses: number,
    inspected: number,
    not_inspected: number,
    inspection_rate: number,       // 0..16.4557
    course_score: number,          // 0..40
    inspection_score: number,      // 0..60
    total_score: number            // 10.62..63.88 (per fixture)
  }

Functions imported FROM ../assets/configs/crossCompareConfig (provided by Plan 02-03):
- `normalizeDistrictKey(city, name) => string`  — canonicalises 臺/台 + whitespace; returns "city|district" key

Functions exported BY this store (consumed by Plan 02-04 view + Plan 02-05 toggle):
- `useCrossCompareStore()` — Pinia store hook
- state.scores: Row[]
- state.viewMode: 'taipei' | 'metrotaipei'
- state.loading: boolean
- state.error: boolean
- getter rampDomain: [number, number]   — [min, max] of total_score, or [0, 100] when scores is empty
- getter enabledDistricts: Set<string>  — normalized "city|district" strings of currently active districts
- getter disabledDistricts: Set<string> — complement (only meaningful in 'taipei' mode; empty Set in 'metrotaipei')
- getter enabledDistrictNames: string[] — array of district names (TNAME values) for Mapbox setFilter (D-19)
- getter scoreByDistrict: Map<string, Row>  — quick lookup by normalized key
- action fetchScores() — single GET; populates scores
- action setViewMode(mode) — whitelist-validated; persists to localStorage
- action initFromStorage() — read localStorage on store creation; called by view in onMounted before fetchScores
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create crossCompareStore.js (state + getters + actions, with localStorage validation)</name>
  <files>Taipei-City-Dashboard-FE/src/store/crossCompareStore.js</files>
  <read_first>
    - Taipei-City-Dashboard-FE/src/store/authStore.js (full — cleanest options-API store; localStorage usage at lines 47-50, 95-99, 114, 133)
    - Taipei-City-Dashboard-FE/src/store/contentStore.js lines 134-167 (axios fetch inside an action; assignment to state, no commit ceremony)
    - Taipei-City-Dashboard-FE/src/router/axios.js (full — interceptor handles 401/403/429/500 toasts; store action does NOT need its own try/catch toast)
    - .planning/phases/02-fe-cross-compare-page/02-PATTERNS.md (`crossCompareStore.js` section — defineStore skeleton lines 192-225, axios fetch pattern lines 230-256, lazy useXStore inside actions)
    - .planning/phases/02-fe-cross-compare-page/02-CONTEXT.md (D-05 store boundaries; D-09 localStorage default; D-13/D-14 join key + normalize; D-17 axios; D-18 single fetch; D-19 single source layer)
    - .planning/fixtures/crosscompare_scores_v1.json (confirms 41 rows, 臺北市/新北市 city values, score range 10.62-63.88)
    - ./CLAUDE.md (hard tabs MANDATORY; snake_case JSON end-to-end; relative imports)
  </read_first>
  <action>
    Create `Taipei-City-Dashboard-FE/src/store/crossCompareStore.js` using HARD TABS. The file is a Pinia options-API store (matches `authStore.js` and `mapStore.js` precedent — Phase 2 PATTERNS.md "<script setup> Composition API for components, options-API for stores"). The store does NOT import mapboxgl, does NOT touch DOM.

    **Security note (T-02-02-01):** `setViewMode` MUST validate the input against a whitelist `['taipei', 'metrotaipei']` and reject any other string. localStorage is user-tamperable; treat values from `localStorage.getItem` as untrusted and run them through the same whitelist on `initFromStorage`. Default to `'metrotaipei'` per D-09.

    **Data flow per D-18:** Single fetch on mount with `view=metrotaipei` (BE returns all 41 rows). Toggling to 'taipei' is a client-side filter on `city === '臺北市'` — never refetch. `enabledDistricts` is derived in a getter from `scores` + `viewMode`.

    **Snake_case end-to-end** (per CLAUDE.md): row fields stay `total_score`, `course_score`, `inspection_score` etc. — no camelCase transformation.

    **Inline comments in Traditional Chinese** to match `mapStore.js` / `contentStore.js` precedent.

    Paste this content verbatim. After writing, verify hard-tab indentation: `head -50 Taipei-City-Dashboard-FE/src/store/crossCompareStore.js | grep -P '^\t' | head -1` must match a real line.

    ```js
    // Developed by Taipei Urban Intelligence Center 2023-2024

    /* crossCompareStore */
    /*
    crossCompareStore 拉取後端的各區分數，並衍生出當前 view mode 下的
    啟用 / 停用 district 集合與色階 domain。
    本 store 只管資料；地圖實例由 CrossCompareView.vue 持有 (D-04 / D-05)。
    切換 view mode 時不重新打 API（D-18 — 後端永遠回傳 41 筆，前端做 client-side filter）。
    */

    import { defineStore } from "pinia";
    import http from "../router/axios";
    import { normalizeDistrictKey } from "../assets/configs/crossCompareConfig";

    // localStorage 持久化用 key (D-09)
    const STORAGE_KEY = "crossCompare.viewMode";
    // viewMode 白名單 — 防止 localStorage 遭竄改後注入任意字串（threat T-02-02-01）
    const VALID_VIEW_MODES = ["taipei", "metrotaipei"];
    const DEFAULT_VIEW_MODE = "metrotaipei";

    function readStoredViewMode() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw && VALID_VIEW_MODES.includes(raw)) {
                return raw;
            }
        } catch (err) {
            // localStorage 在 SSR / 隱私模式下可能無法存取 — 回到預設
        }
        return DEFAULT_VIEW_MODE;
    }

    export const useCrossCompareStore = defineStore("crossCompare", {
        state: () => ({
            // 從 BE 取得的原始 rows（snake_case 欄位保留）
            scores: [],
            // 當前檢視模式 — 'taipei' 或 'metrotaipei'（D-09，初始值由 initFromStorage 寫入）
            viewMode: DEFAULT_VIEW_MODE,
            loading: false,
            error: false,
        }),
        getters: {
            // [min, max] of total_score；scores 為空時回 [0, 100] 讓 UI 不爆
            rampDomain(state) {
                if (!state.scores.length) return [0, 100];
                let min = Infinity;
                let max = -Infinity;
                for (const row of state.scores) {
                    const s = Number(row.total_score);
                    if (!Number.isFinite(s)) continue;
                    if (s < min) min = s;
                    if (s > max) max = s;
                }
                if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 100];
                return [min, max];
            },
            // Map<normalizedKey, row> — 供 view 端做色階 lookup
            scoreByDistrict(state) {
                const m = new Map();
                for (const row of state.scores) {
                    const k = normalizeDistrictKey(row.city, row.district);
                    if (k) m.set(k, row);
                }
                return m;
            },
            // 啟用區的正規化 key 集合（"city|district"）。
            // 'taipei' 模式只有 city === '臺北市' 的列（D-18 client-side filter）。
            // 'metrotaipei' 模式包含全部 41 列。
            enabledDistricts(state) {
                const set = new Set();
                for (const row of state.scores) {
                    if (state.viewMode === "taipei") {
                        // 用 normalize 處理 臺/台 變體（D-14）
                        const c = String(row.city || "").replace(/臺/g, "台");
                        if (c !== "台北市") continue;
                    }
                    const k = normalizeDistrictKey(row.city, row.district);
                    if (k) set.add(k);
                }
                return set;
            },
            // 停用區（'metrotaipei' 模式下為空 Set）— Phase 3 hover 必須以此為 guard（D-11）
            disabledDistricts(state) {
                if (state.viewMode === "metrotaipei") return new Set();
                const set = new Set();
                for (const row of state.scores) {
                    const c = String(row.city || "").replace(/臺/g, "台");
                    if (c === "台北市") continue;
                    const k = normalizeDistrictKey(row.city, row.district);
                    if (k) set.add(k);
                }
                return set;
            },
            // 啟用區的 district 名稱陣列（TNAME），給 Mapbox setFilter 用（D-19）
            enabledDistrictNames(state) {
                const names = [];
                for (const row of state.scores) {
                    if (state.viewMode === "taipei") {
                        const c = String(row.city || "").replace(/臺/g, "台");
                        if (c !== "台北市") continue;
                    }
                    if (row.district) names.push(row.district);
                }
                return names;
            },
        },
        actions: {
            // 在 view onMounted 第一行呼叫 — 從 localStorage 還原 viewMode（白名單驗證）
            initFromStorage() {
                this.viewMode = readStoredViewMode();
            },
            // 單次 fetch（D-18）— BE 一律回 41 筆 metrotaipei 資料；前端做 client-side filter
            async fetchScores() {
                this.loading = true;
                this.error = false;
                try {
                    const response = await http.get("/crosscompare/scores", {
                        params: { view: "metrotaipei" },
                    });
                    this.scores = response.data?.data ?? [];
                } catch (err) {
                    // axios interceptor (router/axios.js) 已彈出本地化 toast；這裡只記錄狀態
                    this.error = true;
                    this.scores = [];
                } finally {
                    this.loading = false;
                }
            },
            // 切換檢視模式 — 白名單驗證後寫入 localStorage（T-02-02-01）
            setViewMode(mode) {
                if (!VALID_VIEW_MODES.includes(mode)) {
                    // 不丟例外，只是忽略（呼叫端不應該丟非白名單值，但 defensive 寫法）
                    // eslint-disable-next-line no-console
                    console.warn(`[crossCompareStore] rejected invalid viewMode: ${mode}`);
                    return;
                }
                this.viewMode = mode;
                try {
                    localStorage.setItem(STORAGE_KEY, mode);
                } catch (err) {
                    // 隱私模式下寫入失敗 — 不阻塞 UI
                }
            },
        },
    });
    ```

    **Sanity checks before declaring done:**
    - File starts with `// Developed by Taipei Urban Intelligence Center 2023-2024`
    - HARD TABS in every indented line (verify: `grep -P '^\t' Taipei-City-Dashboard-FE/src/store/crossCompareStore.js | head -1`)
    - No `import mapboxgl` (the store NEVER touches map)
    - No `import { useDialogStore }` — interceptor handles toasts (PATTERNS.md "HTTP — singleton + interceptor toasts")
    - Snake_case field names preserved (`total_score`, `course_score`, etc.)
    - The `normalizeDistrictKey` import path is `../assets/configs/crossCompareConfig` — that file lands in Plan 02-03; this plan can finish first and the build will fail until 02-03 ships, which is expected since they are independent Wave 1 plans (no shared file). Plan 02-06 owns the integrated build gate.
  </action>
  <verify>
    <automated>test -f Taipei-City-Dashboard-FE/src/store/crossCompareStore.js &amp;&amp; grep -q 'defineStore("crossCompare"' Taipei-City-Dashboard-FE/src/store/crossCompareStore.js &amp;&amp; grep -q 'http\.get("/crosscompare/scores"' Taipei-City-Dashboard-FE/src/store/crossCompareStore.js &amp;&amp; grep -q 'crossCompare\.viewMode' Taipei-City-Dashboard-FE/src/store/crossCompareStore.js &amp;&amp; grep -q 'VALID_VIEW_MODES' Taipei-City-Dashboard-FE/src/store/crossCompareStore.js &amp;&amp; grep -qE 'enabledDistricts|enabledDistrictNames' Taipei-City-Dashboard-FE/src/store/crossCompareStore.js &amp;&amp; ! grep -q 'mapboxgl' Taipei-City-Dashboard-FE/src/store/crossCompareStore.js &amp;&amp; grep -P '^\t' Taipei-City-Dashboard-FE/src/store/crossCompareStore.js | head -1 | grep -q .</automated>
  </verify>
  <acceptance_criteria>
    - File exists at exact path
    - Exports `useCrossCompareStore` via `defineStore("crossCompare", ...)`
    - State shape matches: `scores: []`, `viewMode: "metrotaipei"`, `loading: false`, `error: false`
    - Has all 5 getters: `rampDomain`, `scoreByDistrict`, `enabledDistricts`, `disabledDistricts`, `enabledDistrictNames`
    - Has all 3 actions: `initFromStorage`, `fetchScores`, `setViewMode`
    - `setViewMode` validates input against `VALID_VIEW_MODES` whitelist BEFORE writing to localStorage (grep `VALID_VIEW_MODES.includes` near `setViewMode` body)
    - localStorage key is exactly the string `crossCompare.viewMode`
    - Axios path is `/crosscompare/scores` (no host, no `/api/v1` — that's in `axios.js` baseURL)
    - Imports `normalizeDistrictKey` from `../assets/configs/crossCompareConfig` (Plan 02-03 ships that)
    - Does NOT import `mapboxgl` or any DOM API
    - Hard-tab indented (eslint indent rule passes)
  </acceptance_criteria>
  <done>
    Store is callable in isolation: `useCrossCompareStore()` returns the store instance with the documented state, getters, actions. `setViewMode("foo")` is a no-op + warn (whitelist enforcement). `setViewMode("taipei")` writes `crossCompare.viewMode=taipei` to localStorage and updates state.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser localStorage → store state | localStorage is user-writable via DevTools. Any string a user puts in `crossCompare.viewMode` flows into `viewMode` state on init unless validated. |
| BE response → store state | The BE endpoint is public-readable (no auth). Response shape is locked by Phase 1, but we still treat the JSON as untrusted: missing fields handled with `?? []` and `Number.isFinite` checks. |
| store action argument → state | UI components call `setViewMode(mode)` — any caller could pass a non-whitelist string by mistake or via XSS injection elsewhere. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-02-01 | Tampering | localStorage `crossCompare.viewMode` value | mitigate | `readStoredViewMode()` runs every read through `VALID_VIEW_MODES.includes(raw)`; non-whitelist values fall back to `DEFAULT_VIEW_MODE`. `setViewMode()` runs the same check before persisting. Coverage: explicit whitelist of exactly two strings. |
| T-02-02-02 | Tampering | function argument to `setViewMode` (caller may pass arbitrary string) | mitigate | Same `VALID_VIEW_MODES.includes` check at action entry; invalid call is a no-op + console.warn (allowed by ESLint config — `no-console` permits warn/error). |
| T-02-02-03 | Information disclosure | scores stored in Pinia state | accept | The data is intentionally public-readable per D-17. No PII. |
| T-02-02-04 | Denial of service | malformed BE response (e.g. `data: null` or non-array) | mitigate | `response.data?.data ?? []` defends against missing field; rampDomain guards against empty array (returns [0, 100]). |
| T-02-02-05 | Spoofing | XSS reflected via district name in popup | accept | Phase 2 does NOT render district names in HTML. Phase 3 popup must re-evaluate this threat. (Documented seam.) |
| T-02-02-06 | Repudiation | localStorage write failure (e.g. private mode) | accept | try/catch around `setItem`; UI still updates in-memory. No audit log requirement. |
</threat_model>

<verification>
- `test -f Taipei-City-Dashboard-FE/src/store/crossCompareStore.js`
- `grep -c 'VALID_VIEW_MODES' Taipei-City-Dashboard-FE/src/store/crossCompareStore.js` >= 3 (declared once + used in `setViewMode` + used in `readStoredViewMode`)
- `grep -c 'crossCompare\.viewMode' Taipei-City-Dashboard-FE/src/store/crossCompareStore.js` >= 1 (the localStorage key constant)
- File does NOT mention `mapboxgl` or `mapboxGl`: `! grep -i 'mapbox' Taipei-City-Dashboard-FE/src/store/crossCompareStore.js`
- File ends with `});` (well-formed defineStore close)
- Plan 02-06 will run `cd Taipei-City-Dashboard-FE && npm run build` once Plans 02-03 and 02-04 are done.
</verification>

<success_criteria>
- `crossCompareStore.js` exists with full Pinia options-API shape
- localStorage round-trip works AND is whitelist-validated (T-02-02-01 mitigated)
- `setViewMode` rejects arbitrary strings (T-02-02-02 mitigated)
- Store has zero coupling to Mapbox / DOM (per D-05)
- Single fetch contract enforced — only `metrotaipei` view is ever requested (per D-18)
- Snake_case field names preserved (per CLAUDE.md API conventions)
- Requirement CC-02 (state half) implemented; UI half lands in Plan 02-05
</success_criteria>

<output>
After completion, create `.planning/phases/02-fe-cross-compare-page/02-02-SUMMARY.md` documenting:
- Store API surface (state / getters / actions) for downstream consumers
- Confirmation that localStorage validation rejects non-whitelist input
- The `normalizeDistrictKey` import is wired but not yet importable (Plan 02-03 ships the module — independent Wave 1 plans converge in Plan 02-04)
</output>
