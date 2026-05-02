# Phase 2: FE Cross-Compare Page - Pattern Map

**Mapped:** 2026-05-03
**Files analyzed:** 5 new + 2 edited = 7
**Analogs found:** 7 / 7 (every file has a strong in-tree analog)

---

## File Classification

| New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/views/CrossCompareView.vue` (NEW) | view (route page) | request-response + map render | `src/views/MapView.vue` (chrome) + `src/components/map/MapContainer.vue` (`onMounted` + `mapboxgl.Map`) + `src/store/mapStore.js` lines 99-172 (Mapbox lifecycle) | exact (split across 3 — view holds its own map, so it merges MapContainer's `onMounted` with the store's init body) |
| `src/store/crossCompareStore.js` (NEW) | Pinia store | request-response (single fetch), derived getters | `src/store/authStore.js` (cleanest options-API store, no map coupling) + `src/store/contentStore.js` lines 134-167 (axios fetch action) | exact (role + data flow) |
| `src/components/crosscompare/ViewToggle.vue` (NEW) | small floating UI control | event-driven (click → store action) | `src/components/utilities/miscellaneous/SideBarTab.vue` (small focused control with active-state class) + NavBar `&-tabs` SCSS block (the actual visual pill/tabs treatment) | role-match |
| `src/components/crosscompare/RampLegend.vue` (NEW) | small floating UI control (legend) | data-driven (props in, no events) | `src/dashboardComponent/components/MapLegend.vue` (purpose-named `*Legend.vue`, props-in, render swatches) | exact (same role: legend) |
| `src/assets/configs/crossCompareConfig.js` (NEW) | config module (named exports) | static data + helpers | `src/assets/configs/mapbox/mapConfig.js` (named exports, no default; runtime-detected `hasSourceLayer` flag pattern) | exact |
| `src/router/index.js` (EDIT) | route registration | n/a | existing `/dashboard` and `/mapview` entries lines 33-41 | exact (parallel insertion) |
| `src/components/utilities/bars/NavBar.vue` (EDIT) | nav UI | n/a | existing `<router-link to="/dashboard">` / `to="/mapview">` block lines 69-82 | exact (parallel insertion) |

---

## Pattern Assignments

### `src/views/CrossCompareView.vue` (view, request-response + map render)

**Primary analog (chrome / banner):** `Taipei-City-Dashboard-FE/src/views/MapView.vue` lines 1-31
**Secondary analog (Mapbox `onMounted` lifecycle inside a view-level component):** `Taipei-City-Dashboard-FE/src/components/map/MapContainer.vue` lines 1-22, 76-83
**Tertiary analog (the actual `new mapboxGl.Map(...)` + `style.load`/`load` event chain — this is what `crossCompareStore` was forbidden from owning, so the VIEW must pull this body in directly):** `Taipei-City-Dashboard-FE/src/store/mapStore.js` lines 12-15, 99-172

**TUIC banner pattern** (`MapView.vue` lines 1-9 — copy verbatim, edit only the file-purpose comment if you want):

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
```

**Imports pattern** (`MapView.vue` lines 13-24 + `MapContainer.vue` lines 5-16 + `mapStore.js` lines 12-15 — note relative paths only, no `@/`):

```js
<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from "vue";
import mapboxGl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import http from "../router/axios";
import { useCrossCompareStore } from "../store/crossCompareStore";
import { useDialogStore } from "../store/dialogStore";
import {
    CROSSCOMPARE_SOURCES,
    CROSSCOMPARE_RAMP,
    normalizeDistrictKey,
} from "../assets/configs/crossCompareConfig";
import mapStyle from "../assets/configs/mapbox/mapStyle.js";  // NOTE: mapStyle.js, not dark_map_style.json (see Concerns)
import ViewToggle from "../components/crosscompare/ViewToggle.vue";
import RampLegend from "../components/crosscompare/RampLegend.vue";
</script>
```

**Mapbox instantiation pattern** (`mapStore.js` lines 102-122 — view will replicate this WITHOUT going through the store; key is `accessToken`, the `new mapboxGl.Map({...})` call, and the `.on("load")` chain):

```js
// inside onMounted:
mapboxGl.accessToken = import.meta.env.VITE_MAPBOXTOKEN;
const map = new mapboxGl.Map({
    container: "crosscompareMapBox",  // unique container id, NOT "mapboxBox"
    style: mapStyle,
    center: [121.55, 25.07],
    zoom: 9.5,
    minZoom: 8,
    maxZoom: 18,
    antialias: true,
});
map.addControl(new mapboxGl.NavigationControl());
map.doubleClickZoom.disable();
```

**`style.load` / `load` handler pattern** (`mapStore.js` lines 124-160, 175-238 — note the chained `.on("load", ...)` form with `if (!this.map) return` guard; the `addSource` + `addLayer` pair is the template for fill layers):

```js
map.on("load", () => {
    // 1. RUNTIME PROBE for join key (CONTEXT D-13) — log a sample feature's properties
    map.once("idle", () => {
        const sample = map.querySourceFeatures("metrotaipei_town", { sourceLayer: "metrotaipei_town" })[0];
        if (sample) {
            // dev-mode — confirm hypothesis (TNAME) — see Concerns
            // eslint-disable-next-line no-console
            console.warn("[crosscompare] sample feature.properties =", sample.properties);
        }
    });

    // 2. Add fill source/layers — REUSE the same source ids the dashboard already loads.
    //    Reference vector tile setup: mapStore.js lines 219-238 (production hasSourceLayer branch)
    //    and lines 245-296 (local-dev geojson fallback branch).
    //
    //    For Phase 2 we re-declare sources locally (new map instance has its own style),
    //    mirroring lines 219-238:
    map.addSource("tp_district", { /* same shape as mapStore.js line 219+ */ });
    map.addLayer({ /* type:"fill", paint: match-expression keyed by total_score */ });
});
```

**Vector tile source declaration to copy** (`mapStore.js` lines 219-238 — note `scheme: "tms"`, `tolerance: 0`, `${location.origin}/geo_server/...` URL template, and the `hasSourceLayer` branching that mapConfig.js exports):

```js
this.map
    .addSource(`metrotaipei_town`, {
        type: "vector",
        scheme: "tms",
        tolerance: 0,
        tiles: [
            `${location.origin}/geo_server/gwc/service/tms/1.0.0/taipei_vioc:metrotaipei_town@EPSG:900913@pbf/{z}/{x}/{y}.pbf`,
        ],
    })
    .addLayer(metroTpDistrict);
```

**Local-dev fallback for vector tile source** (`mapStore.js` lines 240-297 — when `hasSourceLayer === false`, source is loaded as geojson from `/mapData/metrotaipei_town.geojson`. Phase 2 must replicate this branch or it will break on `localhost`):

```js
} else {
    this.loadingLayers.push("metrotaipei_town");
    this.map.addSource("metrotaipei_town", {
        type: "geojson",
        data: "/mapData/metrotaipei_town.geojson",
    });
    this.map.addLayer({ ...metroTpDistrict, id: "metrotaipei_town", source: "metrotaipei_town" });
    this.map.on("sourcedata", (e) => {
        if (e.sourceId === "metrotaipei_town" && e.isSourceLoaded && this.loadingLayers.includes("metrotaipei_town")) {
            this.loadingLayers = this.loadingLayers.filter((el) => el !== "metrotaipei_town");
        }
    });
}
```

**Lifecycle teardown pattern** (no analog — neither `MapView.vue` nor `MapContainer.vue` calls `map.remove()` in `onBeforeUnmount`; mapStore's reset is `clearEntireMap()` triggered from the router guard at `src/router/index.js` lines 187-189). Phase 2 should ADD `onBeforeUnmount(() => { map?.remove(); })` since this view owns the instance — that is the seam Phase 3 will reuse.

**Template chrome pattern** (`MapView.vue` lines 144-150 + `MapContainer.vue` lines 86-89 — the `id="mapboxBox"` empty `div` that Mapbox attaches to; copy the empty-div rule but use a different id):

```vue
<template>
    <div class="crosscompare">
        <!-- #crosscompareMapBox needs to be empty to ensure Mapbox performance -->
        <div id="crosscompareMapBox" />
        <ViewToggle class="crosscompare-toggle" />
        <RampLegend class="crosscompare-legend" :domain="store.rampDomain" />
    </div>
</template>
```

**SCSS pattern** (`MapContainer.vue` lines 365-369 — full-bleed map div):

```scss
#crosscompareMapBox {
    width: 100%;
    height: 100%;
    border-radius: 0;  /* full-bleed, no rounded corners (D-07) */
}
.crosscompare {
    height: calc(100vh - 60px);  /* under NavBar (60px from NavBar.vue line 177) */
    height: calc(var(--vh) * 100 - 60px);
    position: relative;
    &-toggle {
        position: absolute;
        top: var(--font-m);
        left: var(--font-m);
        z-index: 2;
    }
    &-legend {
        position: absolute;
        bottom: var(--font-m);
        right: var(--font-m);
        z-index: 2;
    }
}
```

---

### `src/store/crossCompareStore.js` (Pinia store, request-response + derived getters)

**Primary analog:** `Taipei-City-Dashboard-FE/src/store/authStore.js` lines 1-15 (cleanest options-API store with NO map coupling — exactly what we want)
**Secondary analog (axios fetch inside a store action):** `Taipei-City-Dashboard-FE/src/store/contentStore.js` lines 134-167

**Imports + defineStore skeleton** (`authStore.js` lines 1-15 — notice TUIC-style header comment, default-export-free named store, options API):

```js
// Developed by Taipei Urban Intelligence Center 2023-2024

/* crossCompareStore */
/*
The crossCompareStore fetches district scores from the BE and exposes
derived enabled/disabled district sets keyed by (city, district).
The store does NOT touch Mapbox — CrossCompareView.vue owns the map.
*/

import { defineStore } from "pinia";
import http from "../router/axios";
import { normalizeDistrictKey } from "../assets/configs/crossCompareConfig";

export const useCrossCompareStore = defineStore("crossCompare", {
    state: () => ({
        scores: [],                  // raw rows from BE (snake_case fields)
        viewMode: "metrotaipei",     // 'taipei' | 'metrotaipei' (D-09 — restore from localStorage on init)
        loading: false,
        error: false,
    }),
    getters: {
        rampDomain(state) { /* derived [min, max] of total_score across scores */ },
        enabledDistricts(state) { /* Set of normalized "city|district" strings */ },
        disabledDistricts(state) { /* complement Set */ },
        scoreByDistrict(state) { /* Map<normalizedKey, row> for quick lookup */ },
    },
    actions: {
        async fetchScores() { /* see contentStore.setDashboards pattern below */ },
        setViewMode(mode) { /* update + persist to localStorage (D-09) */ },
    },
});
```

**Axios fetch inside an action pattern** (`contentStore.js` lines 134-167 — async/await; uses the singleton `http` (not raw axios); response shape is `{status, data}`; assignment to state is direct, no `commit` ceremony):

```js
async setDashboards(onlyDashboard = false) {
    const response = await http.get(`/dashboard/`);
    const data = response.data.data || {};
    this.dashboards.clear();
    // ... populate state ...
}
```

For Phase 2 the call is `await http.get("/crosscompare/scores", { params: { view: "metrotaipei" } });`. NOTE the BE is mounted at `/api/v1/...` and `http`'s `baseURL` is `VITE_API_URL` (`router/axios.js` line 12) — so the action only writes the path tail, not the host or `/api/v1` prefix. Verify by looking at how `contentStore.js` line 135 writes `/dashboard/` (no host, no `/api/v1`).

**Cross-store call pattern (lazy useXStore inside actions, never at module top)** (`authStore.js` lines 41, 91-93, 110-112):

```js
async fetchScores() {
    const dialogStore = useDialogStore();  // lazy import inside action — avoids module-init cycles
    try {
        this.loading = true;
        const response = await http.get("/crosscompare/scores", { params: { view: "metrotaipei" } });
        this.scores = response.data.data ?? [];
    } catch (err) {
        this.error = true;
        // axios interceptor at router/axios.js lines 35-97 already shows the toast — no need to call dialogStore here
    } finally {
        this.loading = false;
    }
},
```

**Inline-comment language** — Traditional Chinese for state field comments (cf. `mapStore.js` line 87 "3D Mrt Map 相關參數", line 95 "儲存圖層更新時間"; `contentStore.js` lines 22-77 mostly TC). Match in new file.

---

### `src/components/crosscompare/ViewToggle.vue` (small floating control, event-driven)

**Primary analog (component shape — small `<script setup>`, props/computed, scoped scss):** `Taipei-City-Dashboard-FE/src/components/utilities/miscellaneous/SideBarTab.vue` lines 1-67
**Secondary analog (the visual: a horizontal pill-row of 2 mutually exclusive options with active highlight):** `Taipei-City-Dashboard-FE/src/components/utilities/bars/NavBar.vue` lines 53-83 (markup) + 218-249 (`&-tabs` SCSS block)

**Component skeleton** (`SideBarTab.vue` lines 1-19 — banner + `<script setup>` + `defineProps`):

```vue
<!-- Developed by Taipei Urban Intelligence Center 2023-2024-->

<script setup>
import { useCrossCompareStore } from "../../store/crossCompareStore";

const store = useCrossCompareStore();

const options = [
    { value: "taipei", label: "台北" },
    { value: "metrotaipei", label: "雙北" },
];
</script>
```

**Pill-row markup** (adapted from `NavBar.vue` lines 53-83 — group with `router-link-active`-style class binding; the convention is `'router-link-active'` for the highlighted member but for a non-route toggle use a parallel `'viewtoggle-active'` class):

```vue
<template>
    <div class="viewtoggle">
        <button
            v-for="opt in options"
            :key="opt.value"
            :class="{ viewtoggle__btn: true, 'viewtoggle__btn--active': store.viewMode === opt.value }"
            @click="store.setViewMode(opt.value)"
        >
            {{ opt.label }}
        </button>
    </div>
</template>
```

**Active-state SCSS pattern** (`NavBar.vue` lines 218-241 — note the `var(--color-highlight)` for the active variant, `transition: opacity 0.2s, border-bottom 0.2s` cadence):

```scss
.viewtoggle {
    display: flex;
    background-color: var(--color-component-background);
    border-radius: 999px;  /* pill */
    padding: 4px;

    &__btn {
        padding: 6px 16px;
        border-radius: 999px;
        color: var(--color-complement-text);
        transition: background-color 0.2s, color 0.2s;
        cursor: pointer;

        &:hover { opacity: 0.85; }

        &--active {
            background-color: var(--color-highlight);
            color: var(--color-component-background);
        }
    }
}
```

---

### `src/components/crosscompare/RampLegend.vue` (small floating control, data-driven)

**Primary analog:** `Taipei-City-Dashboard-FE/src/dashboardComponent/components/MapLegend.vue` lines 1-92, 134-207

**Component skeleton + props pattern** (`MapLegend.vue` lines 1-23, 92-132 — TUIC banner, `<script setup>`, `defineProps` with shorthand array, swatch + label markup):

```vue
<!-- Developed by Taipei Urban Intelligence Center 2023-2024-->

<script setup>
const props = defineProps({
    domain: { type: Array, default: () => [0, 100] },        // [min, max] of total_score
    label: { type: String, default: "total_score" },
});
</script>

<template>
    <div class="ramplegend">
        <span class="ramplegend__min">{{ props.domain[0]?.toFixed(1) }}</span>
        <div class="ramplegend__bar" />
        <span class="ramplegend__max">{{ props.domain[1]?.toFixed(1) }}</span>
        <p class="ramplegend__axis">{{ props.label }}</p>
    </div>
</template>
```

**SCSS pattern** (`MapLegend.vue` lines 134-207 — note `var(--color-complement-text)` / `var(--color-normal-text)` for text, `var(--font-ms)` for the swatch sizing token, all using hard tabs):

```scss
.ramplegend {
    display: flex;
    align-items: center;
    gap: var(--font-s);
    padding: var(--font-s) var(--font-m);
    background-color: var(--color-component-background);
    border-radius: 5px;

    &__bar {
        width: 160px;
        height: 12px;
        border-radius: 6px;
        background: linear-gradient(to right, #1a3a3f, #5dffe6);  /* CrossCompareConfig D-10 */
    }

    &__min, &__max {
        color: var(--color-complement-text);
        font-size: var(--font-ms);
    }

    &__axis {
        color: var(--color-normal-text);
        font-size: var(--font-s);
        margin-left: var(--font-s);
    }
}
```

---

### `src/assets/configs/crossCompareConfig.js` (config module, named exports)

**Primary analog:** `Taipei-City-Dashboard-FE/src/assets/configs/mapbox/mapConfig.js` lines 1-18, 191-251

**Header pattern** (`mapConfig.js` lines 1-4 — the runtime `hasSourceLayer` flag is the closest existing pattern for "value detected from environment", which we'll reuse for a Phase-3-friendly join-key constant):

```js
// Initial Position and Settings — Cross-Compare
const allowedDomains = ["citydashboard.taipei", "test-citydashboard.taipei"];
const hasSourceLayer = allowedDomains.includes(window.location.hostname);
```

**Named exports pattern** (`mapConfig.js` lines 6, 21, 191, 219 — every config value is an individual `export const`; no default export; a sibling layer-config object for both `tp_district` and `metrotaipei_town`):

```js
// Vector source ids (these MUST match what mapStore.js declares — see mapStore.js lines 219-238 / 245-296)
export const CROSSCOMPARE_SOURCES = {
    taipei: { sourceId: "tp_district", sourceLayer: hasSourceLayer ? "tp_district" : undefined },
    metrotaipei: { sourceId: "metrotaipei_town", sourceLayer: hasSourceLayer ? "metrotaipei_town" : undefined },
};

// Colour ramp (D-10) — domain is runtime-computed from store.rampDomain;
// these are just the visual stops.
export const CROSSCOMPARE_RAMP = {
    low: "#1a3a3f",
    high: "#5dffe6",
    greyFill: "#3a3a3a",
    greyOpacity: 0.35,
    greyLine: "#555555",
};

// Join-key property name on vector tiles. STRONG HYPOTHESIS: "TNAME"
// (cf. mapConfig.js lines 55, 89 — both metrotaipei_town and tp_district label layers
// use ["get", "TNAME"]). MUST be confirmed at runtime via map.querySourceFeatures(...)
// inside CrossCompareView's "load" / "idle" handler before Phase 2 plan task 2.
export const CROSSCOMPARE_JOIN_KEY = "TNAME";

// 臺 ↔ 台 normalization (D-14) — apply on BOTH sides of the join.
// Fixture uses 臺北市/新北市 (full form). Vector tiles MAY use 台 — defend.
export function normalizeDistrictKey(city, name) {
    if (!city || !name) return "";
    const c = String(city).replace(/臺/g, "台").trim();
    const n = String(name).replace(/臺/g, "台").trim();
    return `${c}|${n}`;
}
```

**Existing layer-config shape to mirror** for the new fill layer descriptors (`mapConfig.js` lines 191-235 — note `id`, `source`, conditional `source-layer`, `type`, `paint`, `layout`):

```js
// in mapConfig.js — DO NOT EDIT, just reference the shape:
export const TpDistrict = {
    id: "tp_district",
    source: "tp_district",
    "source-layer": "tp_district",
    type: "line",
    paint: { "line-color": "white", "line-dasharray": [2, 3], "line-width": 3 },
    layout: { visibility: "none" },
};
export const metroTpDistrict = {
    id: "metrotaipei_town",
    source: "metrotaipei_town",
    ...(hasSourceLayer && { "source-layer": "metrotaipei_town" }),
    type: "line",
    /* … */
};
```

The new fill descriptors live INSIDE `crossCompareConfig.js` (NOT in `mapConfig.js` — D-16 forbids touching `mapConfig.js`). Use unique ids like `"crosscompare_fill_taipei"` / `"crosscompare_fill_metrotaipei"` so they don't collide with the existing line layers above.

---

### `src/router/index.js` (EDIT — route registration)

**Existing pattern to copy** (`index.js` lines 33-41 — `/dashboard` and `/mapview` use **eager** import (top-of-file `import DashboardView from "../views/DashboardView.vue"`) rather than lazy `() => import(...)`. Phase 2 should match that style for `/crosscompare` since it's also a primary route):

```js
// lines 17 area — add eager import:
import CrossCompareView from "../views/CrossCompareView.vue";

// lines 33-41 area — add new entry between /dashboard and /mapview:
{
    path: "/dashboard",
    name: "dashboard",
    component: DashboardView,
},
{
    path: "/crosscompare",
    name: "crosscompare",
    component: CrossCompareView,
},
{
    path: "/mapview",
    name: "mapview",
    component: MapView,
},
```

**Mobile guard** (`index.js` lines 119-129) — the whitelist `["dashboard", "component-info", "callback", "embed", "mapview"]` does NOT include `"crosscompare"`. Per ROADMAP Phase 2 success criteria #2 ("NavBar shows a new entry that navigates to /crosscompare"), the planner's call: leave it OUT of the mobile whitelist (mobile responsive is explicitly deferred per CONTEXT `<deferred>`), so on narrow devices `/crosscompare` will redirect to `/dashboard` — that's intentional.

**No content-store side-effect** (`index.js` lines 164-194) — the `router.beforeEach` that handles `/dashboard` / `/mapview` content-loading must NOT be extended for `/crosscompare`. The new view does its own fetching via `crossCompareStore.fetchScores()` in `onMounted`. The existing `mapStore.clearEntireMap()` call on line 188 will ALSO fire when leaving `/crosscompare` — that's fine (it's a no-op since `/crosscompare` never touched the singleton mapStore).

---

### `src/components/utilities/bars/NavBar.vue` (EDIT — `<router-link>` insertion)

**Existing pattern to copy** (lines 69-82 — note the `linkQuery` interpolation for query-string passthrough; the new entry SHOULD use the same `linkQuery` guard for consistency, even though `/crosscompare` doesn't currently consume `?index` / `?city`):

```vue
<router-link
    :to="`/dashboard${
        linkQuery.includes('undefined') ? '' : linkQuery
    }`"
>
    儀表板總覽
</router-link>
<router-link
    :to="`/crosscompare${
        linkQuery.includes('undefined') ? '' : linkQuery
    }`"
>
    跨區比較
</router-link>
<router-link
    :to="`/mapview${
        linkQuery.includes('undefined') ? '' : linkQuery
    }`"
>
    地圖交叉比對
</router-link>
```

**Label**: `跨區比較` parallels `儀表板總覽` (4 chars) and `地圖交叉比對` (6 chars) — final wording is a 1-line plan-phase decision per CONTEXT `<code_context>`.

**Auth gate** — the existing `組件瀏覽平台` link (lines 59-68) is wrapped in `v-if="authStore.token"`. The new `/crosscompare` link is PUBLIC (D-17) so do NOT add such a guard. Mirror `/dashboard` and `/mapview` which have no `v-if`.

**SCSS** — no new SCSS needed; the new `<router-link>` inherits `&-tabs a` styling at lines 218-241.

---

## Shared Patterns

### File header banner (TUIC)
**Source:** `MapView.vue` lines 1-9, `mapStore.js` line 1, `authStore.js` line 1
**Apply to:** ALL new files. Long-lived `views/*.vue` get the full block (Lead Developer / Data Pipelines / Design / Systems / Testing). Stores and components get the one-line `<!-- Developed by Taipei Urban Intelligence Center 2023-2024 -->` comment. Skipping the banner is acceptable for sandbox files (per `MakeNewThingHerePanel.vue`) but Phase 2 files are NOT sandbox — include the banner.

### HTTP — singleton + interceptor toasts
**Source:** `Taipei-City-Dashboard-FE/src/router/axios.js` lines 11-16, 34-97
**Apply to:** `crossCompareStore.fetchScores`. The interceptor already maps 401/403/429/500 to Traditional Chinese toasts via `dialogStore.showNotification("fail", ...)`. Do NOT add a parallel try/catch with manual toasts — the interceptor handles it. Re-throw via `Promise.reject` is automatic.

```js
import http from "../router/axios";
// http.baseURL is VITE_API_URL — your action only writes "/crosscompare/scores"
const response = await http.get("/crosscompare/scores", { params: { view } });
const rows = response.data?.data ?? [];
```

### Indentation — hard tabs
**Source:** `Taipei-City-Dashboard-FE/eslint.config.js` (per `.planning/codebase/CONVENTIONS.md` line 14: `indent: ["error", "tab"]`)
**Apply to:** every new `.js` and `.vue` file. ESLint runs on `npm run build`. Space-indented files WILL fail the build. All examples in this PATTERNS.md document use tabs in the source despite rendering with mixed whitespace in markdown.

### Imports — relative only
**Source:** every existing file (e.g. `mapStore.js` lines 26-59 — all `./` or `../`)
**Apply to:** every new file. There is no `@/` alias. `tsconfig.json` is not checked in. Use `"../store/crossCompareStore"`, `"../assets/configs/crossCompareConfig"`, etc.

### Snake_case JSON
**Source:** BE Phase 1 `crosscompareDistrictScore.go` returns `total_score`, `course_score`, `inspection_score`, `inspection_rate`, `food_businesses`, `not_inspected`, etc.
**Apply to:** `crossCompareStore.scores` rows AND any template binding (`{{ row.total_score }}`, NOT `row.totalScore`). The BE struct's JSON tags drive this; no FE-side transformation.

### Inline comments — Traditional Chinese in newer files
**Source:** `mapStore.js` lines 51, 87, 95; `vite.config.js` line 5
**Apply to:** new files. Examples: `// 儲存從 BE 取得的分數`, `// 切換 view mode 時不重新打 API（D-18）`. English is acceptable but TC matches the surrounding-file convention.

### `<script setup>` Composition API for components, options-API for stores
**Source:** `MapContainer.vue` line 3, `SideBarTab.vue` line 5 (components use `<script setup>`); `authStore.js` line 15, `contentStore.js` line 20, `mapStore.js` line 61 (stores use options API: `defineStore("name", { state, getters, actions })`)
**Apply to:** `CrossCompareView.vue`/`ViewToggle.vue`/`RampLegend.vue` use `<script setup>`. `crossCompareStore.js` uses options API.

---

## No Analog Found

| File | Role | Reason |
|---|---|---|
| (none) | — | All 7 files have at least a role-match analog in-tree. |

---

## Concerns Surfaced for Downstream Agents

These are real findings from reading the codebase that the planner / executor MUST handle, not theoretical risks:

1. **`dark_map_style.json` does not exist.** CONTEXT.md D-06 references `Taipei-City-Dashboard-FE/src/assets/configs/mapbox/dark_map_style.json` but the actual files are `mapStyle.js` (default-export of the dark-style object — what `mapStore.js` line 44 imports) and `mapStyle.json` (raw JSON, currently not imported anywhere). **Use `import mapStyle from "../assets/configs/mapbox/mapStyle.js";` and pass it as `style: mapStyle` — this is the proven path used by `mapStore.js` line 110.** The planner should patch CONTEXT or just silently accept this discrepancy.

2. **Strong hypothesis the join key is `TNAME`, not `district_name`.** `mapConfig.js` line 55 (`TaipeiTown`) and line 89 (`metroTaipeiTown`) both render district labels via `["text-field": ["to-string", ["get", "TNAME"]]]`. Both source layers (`tp_district` and `metrotaipei_town`) clearly expose a `TNAME` property. CONTEXT D-13 still mandates a runtime probe — DO NOT skip it — but the probe is confirming a hypothesis, not a blind search. Set `CROSSCOMPARE_JOIN_KEY = "TNAME"` initially and assert at runtime.

3. **Local-dev vs production source loading is BRANCHED.** `mapStore.js` lines 175-184 (`hasSourceLayer = allowedDomains.includes(window.location.hostname)`) and lines 218-297 — production loads `tp_district` / `metrotaipei_town` as **vector tiles** from `${location.origin}/geo_server/...`, but on `localhost` they're loaded as **GeoJSON** from `/mapData/metrotaipei_town.geojson`. Phase 2's `CrossCompareView` instantiates its OWN map and therefore must replicate BOTH branches or the page will be blank in `localhost` dev. Re-export `hasSourceLayer` from `crossCompareConfig.js` and switch on it inside the view's `load` handler. (Note: in the GeoJSON branch, `source-layer` must be omitted — see `mapConfig.js` lines 219-235 which conditionally spreads `...(hasSourceLayer && { "source-layer": ... })`.)

4. **`tp_district` only has the production vector-tile source.** Reading `mapStore.js` lines 218-297, only `metrotaipei_town` and `metrotaipei_village` get the local-dev geojson fallback. `tp_district` appears in `mapConfig.js` (line 191) as a layer descriptor but `mapStore.js` does NOT addSource for it in either branch — meaning `tp_district` is only available in production behind the `geo_server` proxy. **Implication:** in `localhost` dev, the "台北" view (which would join scores against `tp_district`) WILL fail until either (a) `metrotaipei_town` is reused for both views (filtering down to `city === "臺北市"`), or (b) a `/mapData/tp_district.geojson` is added. CONTEXT D-18 already implies (a): the toggle is a CLIENT-SIDE filter on `enabledDistricts` over the SAME source — the planner should explicitly use `metrotaipei_town` as the only fill source and apply `setFilter` for the 台北 view, NOT swap to `tp_district`. This collapses both views to one source layer.

5. **Hard-tab ESLint rule will reject space-indented files at build.** `eslint.config.js` rule `indent: ["error", "tab"]`. `npm run build` runs `eslint . --fix && vite build`. The `--fix` will auto-correct most cases, but mixed-indent or YAML-style files may not be repairable. Plan a final `npm run build` (not just `npm run lint`) verification step.

6. **No `*.test.js` framework configured.** Per `.planning/codebase/CONVENTIONS.md` line 25 and `CLAUDE.md` "There is **no `npm test`**". Phase 2 verification is "build passes + manual browser smoke test", not unit tests. Don't ask the planner to write Vue test files.

7. **`promoteId` for Phase 3 hover seam.** D-02 calls for `promoteId` on the source descriptor so Phase 3 can call `setFeatureState`. None of the existing `mapStore.js` `addSource` calls (lines 191-296) use `promoteId`. Phase 2 should ADD `promoteId: CROSSCOMPARE_JOIN_KEY` (i.e. `"TNAME"`) to the source declaration — this is a NEW pattern in this codebase. Document it as the seam.

8. **`localStorage` viewMode key (D-09).** No existing `localStorage.setItem("crossCompare.*", …)` pattern in the codebase; closest analog is `authStore.js` lines 47-50, 95-99, 114, 133 which use plain keys (`"token"`, `"isso_token"`). Mimic that minimal style — `localStorage.setItem("crossCompare.viewMode", mode);` and `localStorage.getItem("crossCompare.viewMode")` inside the store's `setViewMode` and a one-time-on-init read.

---

## Metadata

**Analog search scope:** `Taipei-City-Dashboard-FE/src/{views,components,store,router,assets/configs}/`
**Files scanned (full or grep+targeted-read):** 12
- `views/MapView.vue` (full)
- `views/DashboardView.vue` (head)
- `components/map/MapContainer.vue` (full)
- `components/utilities/bars/NavBar.vue` (full)
- `components/utilities/miscellaneous/SideBarTab.vue` (full)
- `components/utilities/miscellaneous/MobileLayerTab.vue` (full)
- `dashboardComponent/components/MapLegend.vue` (full)
- `make-new-thing-here/MakeNewThingHerePanel.vue` (full — confirmed too thin to be the analog)
- `store/authStore.js` (full)
- `store/contentStore.js` (head + grepped fetch sections)
- `store/mapStore.js` (lines 1-340)
- `assets/configs/mapbox/mapConfig.js` (lines 1-90, 180-260)
- `router/index.js` (full)
- `router/axios.js` (full)

**Pattern extraction date:** 2026-05-03

---

## PATTERN MAPPING COMPLETE

**Phase:** 2 — FE Cross-Compare Page
**Files classified:** 7 (5 NEW + 2 EDIT)
**Analogs found:** 7 / 7

### Coverage
- Files with exact analog: 6 (`crossCompareStore.js`, `RampLegend.vue`, `crossCompareConfig.js`, `router/index.js` edit, `NavBar.vue` edit, `CrossCompareView.vue` (split across MapView+MapContainer+mapStore))
- Files with role-match analog: 1 (`ViewToggle.vue` — borrows shape from `SideBarTab.vue`, visual from `NavBar.vue` `&-tabs`)
- Files with no analog: 0

### Key Patterns Identified
- **Map mounting:** `onMounted(() => { new mapboxGl.Map({ container, style: mapStyle, ... }); map.on("load", ...) })` inside the view itself (not a store), mirroring `mapStore.initializeMapBox()` body verbatim. Add `onBeforeUnmount(() => map?.remove())` since the view owns the instance — this is a Phase-2-introduced lifecycle that Phase 3 hover code reuses.
- **Vector source loading is environment-branched:** production vector tiles via `geo_server` TMS, local-dev GeoJSON fallback. Both branches must be replicated in `CrossCompareView` and the planner must collapse Taipei + 雙北 to a single `metrotaipei_town` source (because `tp_district` has no local-dev fallback).
- **Pinia options API + lazy cross-store calls:** `defineStore("crossCompare", { state, getters, actions })` exactly like `authStore.js`. `useDialogStore()` etc. only inside actions, never at module top.
- **HTTP via singleton:** `import http from "../router/axios"` — interceptor handles toasts; store actions just `await http.get(...)`. Path is bare `"/crosscompare/scores"` — `baseURL` is set to `VITE_API_URL` in axios.js.
- **Snake_case JSON end-to-end:** `total_score`, `course_score`, `city`, `district` in store + templates.
- **Hard tabs everywhere; relative imports only; TUIC banner on long-lived files.**
- **Phase 3 seam:** `promoteId: "TNAME"` on the source descriptor (NEW pattern, not yet in codebase) so `map.setFeatureState({ source, sourceLayer, id }, { hover: true })` works in Phase 3 without resource ids.

### File Created
`/home/yumekuii/works/taipei-city-dashboard/.planning/phases/02-fe-cross-compare-page/02-PATTERNS.md`

### Ready for Planning
Pattern mapping complete. Planner can reference exact analog file paths + line numbers in PLAN.md actions. Eight concerns surfaced for explicit handling — most importantly the `dark_map_style.json → mapStyle.js` correction, the `TNAME` join-key hypothesis (still requires runtime confirmation per D-13), the local-dev vs production source-loading branch, and collapsing 台北/雙北 onto a single `metrotaipei_town` source because `tp_district` has no local-dev geojson fallback.
