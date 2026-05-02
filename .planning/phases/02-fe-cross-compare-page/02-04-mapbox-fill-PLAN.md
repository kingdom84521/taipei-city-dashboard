---
phase: 02-fe-cross-compare-page
plan: 04
type: execute
wave: 2
depends_on: ["02-01", "02-02", "02-03"]
files_modified:
  - Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue
autonomous: false
requirements: [CC-03]
tags: [vue, mapbox, fill-layer, source, promote-id, lifecycle]
must_haves:
  truths:
    - "Visiting /crosscompare in dev mounts a real Mapbox map (NavigationControl visible top-right)"
    - "On first paint with default viewMode='metrotaipei', all 41 districts render with colours interpolated from total_score (D-10)"
    - "中正區 renders the brightest band; 萬華區 the dimmest (PROJECT.md sanity-check)"
    - "Source descriptor declares promoteId: 'TNAME' so Phase 3 can call setFeatureState (D-02 seam)"
    - "On localhost (hasSourceLayer=false) the source loads as geojson from /mapData/metrotaipei_town.geojson; on prod it loads as vector tile (PATTERNS.md Concern 3)"
    - "onBeforeUnmount calls map.remove() (no leaked Mapbox instance — D-04 owns lifecycle)"
    - "Runtime probe logs a console.warn if sample feature lacks TNAME property (D-13)"
    - "D-01: choropleth rendered via Mapbox-native fill paint expression (interpolate-hcl on total_score). NO deck.gl layers used for the choropleth body."
    - "D-03: greyed districts get a SECOND fill layer using the inverted [in, TNAME, ...] filter — toggling 台北 ↔ 雙北 is a one-shot setFilter call (no teardown/rebuild)"
    - "D-06: map style imported from `../assets/configs/mapbox/mapStyle` (the existing default-export module). NO `dark_map_style.json` file is referenced (it does not exist)."
    - "D-07: CrossCompareView fills the viewport — full-bleed under NavBar, no sidebar, no top header bar"
  artifacts:
    - path: "Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue"
      provides: "Full Mapbox-mounted view with active fill + greyed fill layers"
      contains: "promoteId"
      min_lines: 150
  key_links:
    - from: "CrossCompareView.vue"
      to: "Plan 02-02 store"
      via: "import { useCrossCompareStore } from \"../store/crossCompareStore\""
      pattern: "useCrossCompareStore"
    - from: "CrossCompareView.vue"
      to: "Plan 02-03 config"
      via: "named imports of paint builders + constants"
      pattern: "buildFillPaint|CROSSCOMPARE_SOURCE_ID"
    - from: "CrossCompareView.vue"
      to: "Mapbox runtime"
      via: "new mapboxGl.Map({ container: 'crosscompareMapBox', style: mapStyle, ... })"
      pattern: "new mapboxGl\\.Map"
---

<objective>
Replace the empty CrossCompareView.vue scaffold (from Plan 02-01) with a fully wired
Mapbox-mounted view that:

1. Calls `store.initFromStorage()` then `store.fetchScores()` in `onMounted`.
2. Instantiates a NEW `mapboxgl.Map` (D-04 — no reuse of `mapStore.js`).
3. Adds the `metrotaipei_town` source with `promoteId: "TNAME"` (D-02 seam for Phase 3).
4. Branches on `CROSSCOMPARE_HAS_SOURCE_LAYER` to load vector tiles (prod) or geojson (localhost) per PATTERNS.md Concern 3.
5. Adds two fill layers — active (paint via `buildFillPaint(domain, scoreByDistrict)`) and greyed (`buildGreyPaint`) — both keyed off `metrotaipei_town` per D-19.
6. Sets the initial Mapbox `setFilter` from `store.enabledDistrictNames` so the active layer paints only enabled districts and the greyed layer paints the complement.
7. Watches `store.scoreByDistrict` and `store.rampDomain` to re-apply paint when scores arrive.
8. Watches `store.viewMode` so toggling (Plan 02-05's UI) triggers `setFilter` swaps WITHOUT refetching (D-18).
9. Calls `map.remove()` in `onBeforeUnmount` (Phase 3 hover handler will reuse this lifecycle).

This is the choropleth render — implements CC-03.

Output: a single edited file (`CrossCompareView.vue`). The ViewToggle and RampLegend imports are added but their `<template>` placements are deferred to Plan 02-05 to keep this plan focused on the Mapbox layer wiring.

NOTE: ViewToggle / RampLegend components do NOT exist yet (Plan 02-05). To keep the build from breaking on this plan's commit, this plan does NOT import them. Plan 02-05 will add the imports + template slots when both components ship.
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
@Taipei-City-Dashboard-FE/src/views/MapView.vue
@Taipei-City-Dashboard-FE/src/components/map/MapContainer.vue
@Taipei-City-Dashboard-FE/src/store/mapStore.js
@Taipei-City-Dashboard-FE/src/assets/configs/mapbox/mapConfig.js
@Taipei-City-Dashboard-FE/src/assets/configs/mapbox/mapStyle.js

<interfaces>
<!-- Contracts the view consumes. From the three Wave-1 plans + existing codebase. -->

From Plan 02-02 src/store/crossCompareStore.js:
- useCrossCompareStore() — Pinia store
- store.scores: Row[]
- store.viewMode: 'taipei' | 'metrotaipei'
- store.rampDomain: [number, number]
- store.scoreByDistrict: Map<string, Row>
- store.enabledDistrictNames: string[]   ← key consumer below
- store.initFromStorage(): void
- store.fetchScores(): Promise<void>

From Plan 02-03 src/assets/configs/crossCompareConfig.js:
- CROSSCOMPARE_HAS_SOURCE_LAYER: boolean
- CROSSCOMPARE_SOURCE_ID: "metrotaipei_town"
- CROSSCOMPARE_SOURCE_LAYER: "metrotaipei_town" | undefined
- CROSSCOMPARE_JOIN_KEY: "TNAME"
- CROSSCOMPARE_FILL_LAYER_ID: "crosscompare_fill_active"
- CROSSCOMPARE_GREY_LAYER_ID: "crosscompare_fill_greyed"
- CROSSCOMPARE_GREY_LINE_LAYER_ID: "crosscompare_line_greyed"
- buildFillPaint(domain, scoreByDistrict): MapboxPaint
- buildGreyPaint(): MapboxPaint
- buildLinePaint(): MapboxLinePaint

From src/store/mapStore.js (existing source-loading patterns to mirror; lines 219-296):
PROD vector tile (lines 229-238):
```js
{
    type: "vector",
    scheme: "tms",
    tolerance: 0,
    tiles: [
        `${location.origin}/geo_server/gwc/service/tms/1.0.0/taipei_vioc:metrotaipei_town@EPSG:900913@pbf/{z}/{x}/{y}.pbf`,
    ],
}
```
LOCALHOST geojson (lines 244-248):
```js
{
    type: "geojson",
    data: "/mapData/metrotaipei_town.geojson",
}
```
NEW: Phase 2 must add `promoteId: "TNAME"` to BOTH branches (D-02 seam — none of the existing addSource calls in mapStore use promoteId; this is a Phase-2-introduced pattern).

From src/store/mapStore.js (Mapbox instantiation; lines 102-122):
```js
mapboxGl.accessToken = import.meta.env.VITE_MAPBOXTOKEN;
const map = new mapboxGl.Map({ container, style, ... });
map.addControl(new mapboxGl.NavigationControl());
map.doubleClickZoom.disable();
```

Mapbox setFilter contract (D-19 toggle implementation):
```js
map.setFilter(layerId, ["in", ["get", "TNAME"], ["literal", arrayOfNames]]);
```
For greyed layer: invert with !=:
```js
map.setFilter(greyLayerId, ["!", ["in", ["get", "TNAME"], ["literal", enabledNames]]]);
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace CrossCompareView.vue scaffold with full Mapbox mount + fill layers + watchers</name>
  <files>Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue</files>
  <read_first>
    - Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue (current scaffold from Plan 02-01)
    - Taipei-City-Dashboard-FE/src/store/mapStore.js lines 99-296 (full Mapbox lifecycle: init, load handler, source-loading branches — verbatim source for our PROD/LOCALHOST split)
    - Taipei-City-Dashboard-FE/src/views/MapView.vue lines 1-150 (TUIC banner, view-level component shape)
    - Taipei-City-Dashboard-FE/src/components/map/MapContainer.vue (mapboxBox div + onMounted lifecycle inside a view-level component)
    - Taipei-City-Dashboard-FE/src/assets/configs/mapbox/mapStyle.js (default-export style object — confirm import path; D-06)
    - Taipei-City-Dashboard-FE/src/assets/configs/mapbox/mapConfig.js lines 191-251 (existing line layers — confirm we are NOT colliding on layer ids; the existing `metrotaipei_town` line layer id IS in use site-wide via mapStore, but our independent map instance has its own style — no real collision)
    - Taipei-City-Dashboard-FE/src/store/crossCompareStore.js (just shipped in Plan 02-02 — confirm getter names match what we destructure)
    - Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js (just shipped in Plan 02-03 — confirm export names match imports)
    - .planning/phases/02-fe-cross-compare-page/02-PATTERNS.md (full CrossCompareView.vue section + Concerns 1-7)
    - .planning/phases/02-fe-cross-compare-page/02-CONTEXT.md (D-01 Mapbox-native; D-02 promoteId seam; D-04 own map instance; D-06 mapStyle.js; D-12 instant setFilter swap; D-19 single source layer)
  </read_first>
  <action>
    REPLACE the full content of `Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` (the scaffold from Plan 02-01) with the following. Use HARD TABS. Inline comments in Traditional Chinese.

    Key implementation rules:
    - Mapbox container id is `crosscompareMapBox` (NOT `mapboxBox` — must not collide if `MapContainer` is later embedded somewhere else)
    - `accessToken` is read from `import.meta.env.VITE_MAPBOXTOKEN` (same as mapStore.js line 106-107)
    - `mapStyle` is imported from `"../assets/configs/mapbox/mapStyle.js"` (D-06; PATTERNS.md Concern 1 — `dark_map_style.json` does NOT exist)
    - Source MUST have `promoteId: "TNAME"` (D-02 seam, PATTERNS.md Concern 7)
    - Both PROD and LOCALHOST branches must add the source — replicate `mapStore.js` lines 229-238 (vector) and 244-267 (geojson) within the view's local map instance
    - DO NOT import ViewToggle / RampLegend yet (Plan 02-05's job — keeps THIS plan green if Plan 02-05 has not landed)
    - Layer ordering: greyed fill layer added FIRST (renders below), active fill layer added SECOND (renders on top), so when the layers overlap at edges the active layer wins. Greyed line layer added LAST for the muted border.
    - Use `map.once("idle", probe)` for the runtime TNAME assertion (D-13). Wrap probe in try/catch — never throw on a sanity check.
    - Watch `store.scoreByDistrict` and `store.rampDomain` together (`watch([scoreByDistrict, rampDomain], ...)`) — when either changes, re-apply paint via `map.setPaintProperty(layerId, "fill-color", paint['fill-color'])` etc.
    - Watch `store.enabledDistrictNames` to re-apply `setFilter` on both layers when viewMode changes (Plan 02-05 will trigger this through `store.setViewMode`)
    - `onBeforeUnmount` calls `map?.remove()` (D-04 lifecycle ownership)

    Paste this full content verbatim. AFTER writing, verify hard tabs and that critical strings are present (verification commands below).

    ```vue
    <!-- Developed By Taipei Urban Intelligence Center 2023-2024 -->
    <!--
    Lead Developer:  Igor Ho (Full Stack Engineer)
    Data Pipelines:  Iima Yu (Data Scientist)
    Design and UX: Roy Lin (Fmr. Consultant), Chu Chen (Researcher)
    Systems: Ann Shih (Systems Engineer)
    Testing: Jack Huang (Data Scientist), Ian Huang (Data Analysis Intern)
    -->
    <!-- Department of Information Technology, Taipei City Government -->

    <!-- 跨區比較頁：地圖底圖 + 各區分數渲染 (Phase 2 Plan 04 — fill layers) -->

    <script setup>
    import { onMounted, onBeforeUnmount, watch } from "vue";
    import mapboxGl from "mapbox-gl";
    import "mapbox-gl/dist/mapbox-gl.css";

    import { useCrossCompareStore } from "../store/crossCompareStore";
    import mapStyle from "../assets/configs/mapbox/mapStyle.js";
    import {
        CROSSCOMPARE_HAS_SOURCE_LAYER,
        CROSSCOMPARE_SOURCE_ID,
        CROSSCOMPARE_SOURCE_LAYER,
        CROSSCOMPARE_JOIN_KEY,
        CROSSCOMPARE_FILL_LAYER_ID,
        CROSSCOMPARE_GREY_LAYER_ID,
        CROSSCOMPARE_GREY_LINE_LAYER_ID,
        buildFillPaint,
        buildGreyPaint,
        buildLinePaint,
    } from "../assets/configs/crossCompareConfig";

    const store = useCrossCompareStore();

    // 地圖實例由本 view 持有（D-04）— 不寫進 ref，避免 Vue reactive proxy 干擾 Mapbox 內部狀態
    let map = null;
    let styleLoaded = false;

    // Mapbox setFilter helper — 啟用區用 in 過濾，停用區用反向
    function applyEnabledFilter() {
        if (!map || !styleLoaded) return;
        const names = store.enabledDistrictNames;
        const inExpr = ["in", ["get", CROSSCOMPARE_JOIN_KEY], ["literal", names]];
        // active layer 只畫啟用區
        if (map.getLayer(CROSSCOMPARE_FILL_LAYER_ID)) {
            map.setFilter(CROSSCOMPARE_FILL_LAYER_ID, inExpr);
        }
        // greyed layer 畫補集（'metrotaipei' 模式下 names 涵蓋所有 41 區，補集為空 → 圖層空）
        const notExpr = ["!", ["in", ["get", CROSSCOMPARE_JOIN_KEY], ["literal", names]]];
        if (map.getLayer(CROSSCOMPARE_GREY_LAYER_ID)) {
            map.setFilter(CROSSCOMPARE_GREY_LAYER_ID, notExpr);
        }
        if (map.getLayer(CROSSCOMPARE_GREY_LINE_LAYER_ID)) {
            map.setFilter(CROSSCOMPARE_GREY_LINE_LAYER_ID, notExpr);
        }
    }

    // 重新計算啟用區色階 (D-10) — 在 scores 載入或 viewMode 切換時呼叫
    function applyActivePaint() {
        if (!map || !styleLoaded) return;
        const paint = buildFillPaint(store.rampDomain, store.scoreByDistrict);
        if (map.getLayer(CROSSCOMPARE_FILL_LAYER_ID)) {
            // setPaintProperty 一次套一個 key — fill-color + fill-opacity
            map.setPaintProperty(CROSSCOMPARE_FILL_LAYER_ID, "fill-color", paint["fill-color"]);
            map.setPaintProperty(CROSSCOMPARE_FILL_LAYER_ID, "fill-opacity", paint["fill-opacity"]);
        }
    }

    // 加入 source（PROD vector tile 或 LOCALHOST geojson 雙分支）— D-02 seam: promoteId 給 Phase 3 hover 用
    function addCrossCompareSource() {
        if (!map) return;

        if (CROSSCOMPARE_HAS_SOURCE_LAYER) {
            // production：vector tile via geo_server TMS（mirror mapStore.js lines 229-238）
            map.addSource(CROSSCOMPARE_SOURCE_ID, {
                type: "vector",
                scheme: "tms",
                tolerance: 0,
                promoteId: CROSSCOMPARE_JOIN_KEY,  // D-02 — Phase 3 setFeatureState 用穩定 id
                tiles: [
                    `${location.origin}/geo_server/gwc/service/tms/1.0.0/taipei_vioc:metrotaipei_town@EPSG:900913@pbf/{z}/{x}/{y}.pbf`,
                ],
            });
        } else {
            // localhost：geojson fallback（mirror mapStore.js lines 244-248）
            map.addSource(CROSSCOMPARE_SOURCE_ID, {
                type: "geojson",
                data: "/mapData/metrotaipei_town.geojson",
                promoteId: CROSSCOMPARE_JOIN_KEY,
            });
        }
    }

    // 加入兩層 fill + 一層 line — 順序：greyed 先 (在下)、active 後 (在上)、greyed-line 最後 (邊框)
    function addCrossCompareLayers() {
        if (!map) return;

        const baseLayer = {
            source: CROSSCOMPARE_SOURCE_ID,
            // vector-tile 模式才有 source-layer，geojson 模式必須省略
            ...(CROSSCOMPARE_SOURCE_LAYER ? { "source-layer": CROSSCOMPARE_SOURCE_LAYER } : {}),
        };

        // 1. greyed fill (下層)
        map.addLayer({
            ...baseLayer,
            id: CROSSCOMPARE_GREY_LAYER_ID,
            type: "fill",
            paint: buildGreyPaint(),
        });

        // 2. active fill (上層) — paint 先給保底色，等 watcher fire 再 setPaintProperty
        const initialPaint = buildFillPaint(store.rampDomain, store.scoreByDistrict);
        map.addLayer({
            ...baseLayer,
            id: CROSSCOMPARE_FILL_LAYER_ID,
            type: "fill",
            paint: initialPaint,
        });

        // 3. greyed line (邊框)
        map.addLayer({
            ...baseLayer,
            id: CROSSCOMPARE_GREY_LINE_LAYER_ID,
            type: "line",
            paint: buildLinePaint(),
        });
    }

    // Runtime probe — D-13：印第一筆 feature 的 properties，確認 TNAME 欄位真的存在
    function probeJoinKey() {
        if (!map) return;
        try {
            const feats = map.querySourceFeatures(CROSSCOMPARE_SOURCE_ID, {
                sourceLayer: CROSSCOMPARE_SOURCE_LAYER,
            });
            const sample = feats?.[0];
            if (!sample) return;
            if (!Object.prototype.hasOwnProperty.call(sample.properties || {}, CROSSCOMPARE_JOIN_KEY)) {
                // eslint-disable-next-line no-console
                console.warn(
                    `[crosscompare] vector tile feature缺少 ${CROSSCOMPARE_JOIN_KEY} 欄位；可用 keys=`,
                    Object.keys(sample.properties || {}),
                );
            }
        } catch (err) {
            // eslint-disable-next-line no-console
            console.warn("[crosscompare] probeJoinKey failed:", err);
        }
    }

    onMounted(async () => {
        // 1. 從 localStorage 還原 viewMode（白名單驗證在 store 裡）
        store.initFromStorage();

        // 2. 啟動 Mapbox（D-04：本 view 持有實例）
        mapboxGl.accessToken = import.meta.env.VITE_MAPBOXTOKEN;
        map = new mapboxGl.Map({
            container: "crosscompareMapBox",
            style: mapStyle,
            center: [121.55, 25.07],
            zoom: 9.5,
            minZoom: 8,
            maxZoom: 18,
            antialias: true,
        });
        map.addControl(new mapboxGl.NavigationControl());
        map.doubleClickZoom.disable();

        // 3. style.load 之後才能 addSource/addLayer
        map.on("load", () => {
            if (!map) return;
            addCrossCompareSource();
            addCrossCompareLayers();
            styleLoaded = true;

            // 第一次掛圖層後立刻把 store 當下的 enabled set / domain 套上去
            applyEnabledFilter();
            applyActivePaint();

            // 一次性 runtime probe 確認 TNAME（D-13）
            map.once("idle", probeJoinKey);
        });

        // 4. 同時拉資料（不等地圖 load — 讓兩條軌道並行）
        await store.fetchScores();
        // fetchScores 完之後 watcher 會被 store 變化喚醒；此處不必再呼叫
    });

    onBeforeUnmount(() => {
        // D-04：view 持有 map 實例 → 必須親手清掉，避免 Mapbox WebGL context 漏（Phase 3 hover 處理也仰賴此）
        if (map) {
            try {
                map.remove();
            } catch (err) {
                // 已被外部 remove 過（譬如 HMR）
            }
            map = null;
        }
        styleLoaded = false;
    });

    // scores 或 ramp domain 變動 → 重新計算 active 層的 fill paint
    watch(
        () => [store.scoreByDistrict, store.rampDomain],
        () => {
            applyActivePaint();
            applyEnabledFilter();
        },
        { deep: false },
    );

    // viewMode 切換（Plan 02-05 的 ViewToggle 觸發 store.setViewMode → enabledDistrictNames 改變）→ 立即 setFilter（D-12 INSTANT，無動畫）
    watch(
        () => store.viewMode,
        () => {
            applyEnabledFilter();
        },
    );
    </script>

    <template>
        <div class="crosscompare">
            <!-- #crosscompareMapBox needs to be empty to ensure Mapbox performance -->
            <div id="crosscompareMapBox" />
            <!-- ViewToggle (top-left) 與 RampLegend (bottom-right) 由 Plan 02-05 補上 -->
        </div>
    </template>

    <style scoped lang="scss">
    .crosscompare {
        height: calc(100vh - 60px);
        height: calc(var(--vh) * 100 - 60px);
        position: relative;

        #crosscompareMapBox {
            width: 100%;
            height: 100%;
            border-radius: 0;
        }
    }
    </style>
    ```

    **Sanity checks:**
    - `grep -P '^\t' Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue | head -1` returns a real line
    - The file imports from `../store/crossCompareStore` (Plan 02-02 ships this module — must exist before this plan runs)
    - The file imports from `../assets/configs/crossCompareConfig` (Plan 02-03 ships this module — must exist before this plan runs)
    - The file imports from `../assets/configs/mapbox/mapStyle.js` (existing file, present in repo)
    - File contains `promoteId: CROSSCOMPARE_JOIN_KEY` (D-02 seam)
    - `onBeforeUnmount` exists and calls `map.remove()` (D-04 lifecycle)
    - Two fill layers + one line layer added (3 calls to `map.addLayer` in `addCrossCompareLayers`)
    - No imports of `ViewToggle.vue` or `RampLegend.vue` — Plan 02-05 owns those imports
  </action>
  <verify>
    <automated>grep -q 'new mapboxGl\.Map' Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue &amp;&amp; grep -q 'promoteId: CROSSCOMPARE_JOIN_KEY' Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue &amp;&amp; grep -q 'useCrossCompareStore' Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue &amp;&amp; grep -q 'buildFillPaint' Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue &amp;&amp; grep -q 'CROSSCOMPARE_HAS_SOURCE_LAYER' Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue &amp;&amp; grep -q 'onBeforeUnmount' Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue &amp;&amp; grep -q 'map\.remove()' Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue &amp;&amp; grep -q 'mapStyle' Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue &amp;&amp; ! grep -q 'ViewToggle' Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue &amp;&amp; grep -P '^\t' Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue | head -1 | grep -q .</automated>
  </verify>
  <acceptance_criteria>
    - File contains `new mapboxGl.Map({ container: "crosscompareMapBox", ... })`
    - File contains `promoteId: CROSSCOMPARE_JOIN_KEY` inside an `addSource` block (D-02 seam — Phase 3's only requirement from this plan)
    - Imports `useCrossCompareStore`, all paint builders, all CROSSCOMPARE_* constants from the two Wave-1 modules
    - Imports `mapStyle` from `"../assets/configs/mapbox/mapStyle.js"` (D-06; PATTERNS.md Concern 1)
    - Has `map.on("load", ...)` handler that calls `addCrossCompareSource()` then `addCrossCompareLayers()`
    - Has `onBeforeUnmount(() => map?.remove())` (D-04)
    - Branches PROD vector-tile vs LOCALHOST geojson via `CROSSCOMPARE_HAS_SOURCE_LAYER` (PATTERNS.md Concern 3)
    - Has TWO `watch` calls — one for `[scoreByDistrict, rampDomain]`, one for `viewMode` (D-12 INSTANT toggle)
    - Has `map.once("idle", probeJoinKey)` runtime assertion (D-13)
    - Does NOT import `ViewToggle.vue` or `RampLegend.vue` — Plan 02-05 will add those
    - Hard tabs throughout
  </acceptance_criteria>
  <done>
    The view mounts a working Mapbox map with the `metrotaipei_town` source loaded and three layers (greyed fill, active fill, greyed line) added. After `store.fetchScores()` resolves, `applyActivePaint()` repaints the active layer using the interpolate-hcl paint expression. On localhost, `/mapData/metrotaipei_town.geojson` is fetched as the source.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Smoke verify choropleth renders with all 41 districts coloured by score</name>
  <what-built>
    A fully wired CrossCompareView that mounts Mapbox, fetches scores from the BE, and paints all 41 雙北 districts with colours interpolated from `total_score`. ViewToggle / RampLegend chrome are NOT yet in the template (Plan 02-05).
  </what-built>
  <how-to-verify>
    1. From `Taipei-City-Dashboard-FE/`, run `npm run dev` (Vite on :8080).
    2. Open `http://localhost:8080/crosscompare`.
    3. Expected within 5 seconds:
       - Mapbox dark base map renders, centred on 雙北 (roughly [121.55, 25.07]).
       - NavigationControl visible top-right.
       - All 41 districts (12 臺北 + 29 新北) are filled with colours on the dark teal → bright cyan ramp.
       - 中正區 (top-right of 臺北市 — the highest scorer at 63.88) renders the BRIGHTEST band.
       - 萬華區 (bottom-left of 臺北市 — the lowest at 10.62) renders the DIMMEST band.
       - 烏來區 (south-east mountainous 新北 area, rank 2 at 60.0) and 五股區 (rank 3 at 59.78) are also brightly coloured.
    4. Open DevTools Network tab — confirm exactly ONE `GET /api/v1/crosscompare/scores?view=metrotaipei` request.
       - Status 200, response body has `data` array with 41 rows.
    5. Open DevTools Console — confirm:
       - NO red errors.
       - The runtime probe should NOT log a warning about missing `TNAME` (it would log only if the assumption is wrong; absence of the warning is the success signal).
    6. Type `localStorage.getItem("crossCompare.viewMode")` in the console:
       - First-time visitors: returns `null` (default 'metrotaipei' is in store but not yet persisted; Plan 02-05's toggle is what writes it).
    7. Manually pollute localStorage to test threat T-02-02-01 mitigation:
       - Run `localStorage.setItem("crossCompare.viewMode", "<script>alert(1)</script>")` then refresh.
       - The page should still load with viewMode='metrotaipei' (whitelist rejected the bogus value).
       - DevTools Console should NOT show an alert.
    8. Close the tab. Reopen. Re-navigate to /crosscompare. The map should remount cleanly (no console errors about leaked WebGL context — `onBeforeUnmount` did its job).
  </how-to-verify>
    <action>
    Stop here and wait for the user to perform the verification listed in <how-to-verify>. The user starts `npm run dev` from `Taipei-City-Dashboard-FE/`, visits `/crosscompare`, and confirms the choropleth, network behaviour, console state, and threat-mitigation checks. Do NOT auto-resume.
  </action>
  <verify>User types 'approved' in response to the resume-signal prompt; failures are described in plain English.</verify>
  <done>All 8 verification steps pass; D-02 promoteId seam confirmed; D-04 lifecycle (no leaked WebGL context) confirmed; T-02-02-01 mitigation observed working.</done>
  <resume-signal>
    Type "approved" if all 8 checks pass. If 中正區 is not the brightest or 萬華區 is not the dimmest, that's a paint-expression bug — describe what you see.
  </resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Mapbox source data → fill paint | `metrotaipei_town` vector tile / geojson features have a `TNAME` property that ends up in the `match` arm. The vector-tile data is hosted by city government infrastructure (`geo_server`) — same trust level as the SPA itself. The geojson fallback (`/mapData/metrotaipei_town.geojson`) is shipped with the SPA, also same trust boundary. |
| `import.meta.env.VITE_MAPBOXTOKEN` → mapboxGl.accessToken | The token is a public-key Mapbox access token, intentionally bundled into the SPA. Restricted by URL allowlist in Mapbox dashboard. |
| store state → setFilter | `enabledDistrictNames` is built from BE response strings. We use them as plain match keys in a Mapbox expression — no eval / innerHTML risk. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-04-01 | Tampering | malformed BE response leads to NaN domain → Mapbox throw | mitigate | `buildFillPaint` early-returns flat colour for degenerate domain; store `rampDomain` getter early-returns `[0, 100]` for empty scores. |
| T-02-04-02 | Information disclosure | DevTools Console shows district properties via `probeJoinKey` | accept | `console.warn` only fires if TNAME is missing — surfaces an actionable engineering signal, not user data. ESLint `no-console` rule explicitly permits warn/error. |
| T-02-04-03 | Denial of service | leaked Mapbox WebGL context (no map.remove) on route change | mitigate | `onBeforeUnmount` calls `map.remove()` inside try/catch; sets local `map = null`. Also covers Vite HMR re-mount path. |
| T-02-04-04 | Spoofing | malicious vector tile injection (man-in-the-middle on geo_server) | accept | Production geo_server is over HTTPS (same origin via `${location.origin}/geo_server`). Same trust boundary as the SPA itself; no additional mitigation possible at the FE layer. |
| T-02-04-05 | Elevation of privilege | exploit promoteId to overwrite arbitrary feature ids | accept | Mapbox `promoteId` is a documented Mapbox API; it sets feature `id` from a property key. Not a vulnerability — it's the intended seam for Phase 3's `setFeatureState` (D-02). |
| T-02-04-06 | Tampering | localStorage viewMode pollution (e.g. user pastes `<script>` in DevTools) | mitigate | Already mitigated in Plan 02-02's `crossCompareStore.setViewMode` whitelist. This view calls `store.initFromStorage()` which internally validates. Verified in Task 2 step 7. |
</threat_model>

<verification>
- File-level: all grep gates above pass
- Runtime smoke: 41 districts painted; 中正區 brightest; 萬華區 dimmest
- Network: exactly 1 fetch; no refetch on viewMode toggle (verified in Plan 02-05)
- Console: no errors, no missing-TNAME warning
- Lifecycle: map.remove() called on unmount (no leaked WebGL context warning across navigation)
- Threat T-02-02-01 verified in Task 2 step 7
</verification>

<success_criteria>
- ROADMAP success criteria #1 (visiting /crosscompare resolves a new view) — confirmed
- ROADMAP success criteria #4 (sequential colour ramp on total_score; coverage matches BE payload of 41 districts) — confirmed
- D-02 seam in place (`promoteId: TNAME`) — Phase 3 hover work unblocked
- D-04 lifecycle ownership in place (own map instance, own teardown)
- D-19 single-source-layer architecture in place
- Requirement CC-03 implemented
</success_criteria>

<output>
After completion, create `.planning/phases/02-fe-cross-compare-page/02-04-SUMMARY.md` documenting:
- Final view file size + tab-count check
- The actual probed properties (paste the runtime warning if it fired, or note "TNAME confirmed" if it did not)
- Visual confirmation of brightest/dimmest districts (one-line)
- Any deviations from PATTERNS.md (should be none)
</output>
