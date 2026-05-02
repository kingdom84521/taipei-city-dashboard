# Phase 3: Hover Interaction & Polish - Pattern Map

**Mapped:** 2026-05-03
**Files analyzed:** 1 NEW + 4 EDIT + 1 DELETE = 6
**Analogs found:** 6 / 6 (every file has at least a partial in-tree analog; one NEW pattern — `setFeatureState` — has no analog and is documented inline)

---

## File Classification

| New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/components/crosscompare/DistrictPopup.vue` (NEW) | popup body SFC | data-driven (props in, no events) — mounted via `createApp` into a Mapbox `Popup` HTML container | `src/components/crosscompare/RampLegend.vue` (Phase 2 sibling — styling + script-setup conventions); `src/components/map/MapPopup.vue` (existing popup-body SFC mounted by mapStore) | role-match (popup body) + style-match (Phase 2 SCSS conventions) |
| `src/views/CrossCompareView.vue` (EDIT — extrusion + hover handler + popup mount + teardown) | view (route page) | event-driven hover (mousemove/enter/leave on Mapbox layer) → setFeatureState + popup lifecycle | Self (Phase 2 output already has the `style.load` handler, source w/ `promoteId`, the active fill layer, `onBeforeUnmount` map.remove). The `createApp(...)` + Mapbox `Popup` body-mount pattern: `mapStore.js` lines 1983-2108 (existing precedent — DocStruct re-uses this verbatim) | exact (extending existing file in-place; Mapbox Popup-with-Vue-body has a precedent in `mapStore.js`) |
| `src/assets/configs/crossCompareConfig.js` (EDIT — add EXTRUSION_LAYER_ID, EXTRUSION_HEIGHT_HOVER, EXTRUSION_TRANSITION_MS, optional `buildExtrusionPaint()`) | config module (named exports) | static constants + paint-builder helpers | Self (Phase 2 output — already has `CROSSCOMPARE_FILL_LAYER_ID` + `buildFillPaint()` in the same idiom; just append the extrusion siblings) | exact (parallel insertion in same file) |
| `src/views/MapView.vue` (EDIT — REMOVE 3 sites: line 24 import, line 26 computed, lines 147-153 v-if branch + comment) | route view chrome | n/a (deletion) | Self (current state of `MapView.vue`) | exact (reading the file IS the analog — remove only) |
| `src/components/utilities/bars/SideBar.vue` (EDIT — REMOVE the `<SideBarLink to="/mapview?index=make-new-thing-here">` block lines 160-165) | nav UI | n/a (deletion) | Self (the file is its own analog — remove the link element only; the surrounding `<h1>工具</h1>` stays as a section header for any future tools) | exact |
| `src/make-new-thing-here/` (DELETE — entire directory: `MakeNewThingHerePanel.vue` + `README.md`) | sandbox feature-injection slot | n/a (deletion) | n/a — `git rm -r` the directory wholesale | exact |

> **Bonus reference cleanup:** `Taipei-City-Dashboard-FE/src/store/contentStore.js` lines 87-98 contain a `setRouteParams` short-circuit branch for `index === "make-new-thing-here"` (the comment + the early-return block). The orchestrator's CONTEXT D-15..D-18 lists 5 reference sites, but `grep -r "make-new-thing-here" Taipei-City-Dashboard-FE/src/` reveals a **6th reference** here. CC-04 acceptance #3 (D-18) says "grep returns ZERO matches" — so this `contentStore.js` block must also go. Planner should cover it. See **Concern 9** below.

---

## Pattern Assignments

### `src/components/crosscompare/DistrictPopup.vue` (NEW — popup body SFC)

**Primary analog (styling + script-setup conventions, Phase 2 sibling):** `Taipei-City-Dashboard-FE/src/components/crosscompare/RampLegend.vue` (entire file — same directory, same convention set, Phase 2 just shipped)

**Secondary analog (existing popup body mounted by `mapStore` via `createApp`):** `Taipei-City-Dashboard-FE/src/components/map/MapPopup.vue` lines 1-30 (the SFC that `mapStore.js` line 2106-2107 mounts) — confirms the pattern of "bare `<script setup>` + `<template>` for popup body, NO route-store coupling, props injected via `setup()` return"

**No prior precedent for** the popup component receiving plain props (vs. being injected via a `defineComponent({ extends: MapPopup, setup() { ... return {...} } })` wrapper). Phase 3 should use the simpler pattern: `defineProps` directly, then pass via the Vue 3 `createApp(Component, props)` second-argument.

**Banner pattern** (matches `RampLegend.vue` line 1 — single-line component banner, NOT the full TUIC block from `views/*.vue`):

```vue
<!-- Developed by Taipei Urban Intelligence Center 2023-2024 -->
```

**`<script setup>` + `defineProps` pattern** (mirrors `RampLegend.vue` lines 3-18 exactly — same style, same shape):

```vue
<script setup>
import { computed } from "vue";

const props = defineProps({
	districtName: {
		type: String,
		required: true,
	},
	rank: {
		type: Number,
		default: null,
	},
	totalScore: {
		type: Number,
		default: null,
	},
	courseScore: {
		type: Number,
		default: null,
	},
	inspectionScore: {
		type: Number,
		default: null,
	},
});

// 防呆：分數可能為 null/undefined（store 找不到該區或 BE 漏欄位）— toFixed(1) 不能對非數字呼叫
const fmt = (v) => (Number.isFinite(Number(v)) ? Number(v).toFixed(1) : "—");

const totalLabel = computed(() => fmt(props.totalScore));
const courseLabel = computed(() => fmt(props.courseScore));
const inspectionLabel = computed(() => fmt(props.inspectionScore));
const rankLabel = computed(() =>
	Number.isFinite(Number(props.rank)) ? `#${props.rank}` : "—",
);
</script>
```

**Template pattern (D-08 layout — name → rank pill → big total → 2-cell grid; Vue interpolation `{{ }}` is XSS-safe per D-21, NEVER `v-html`):**

```vue
<template>
  <div class="districtpopup">
    <h3 class="districtpopup__name">{{ districtName }}</h3>
    <span class="districtpopup__rank">{{ rankLabel }}</span>
    <div class="districtpopup__total">{{ totalLabel }}</div>
    <div class="districtpopup__breakdown">
      <div>
        <p class="districtpopup__label">課程分數</p>
        <p class="districtpopup__value">{{ courseLabel }}</p>
      </div>
      <div>
        <p class="districtpopup__label">抽查分數</p>
        <p class="districtpopup__value">{{ inspectionLabel }}</p>
      </div>
    </div>
  </div>
</template>
```

**SCSS pattern** (mirrors `RampLegend.vue` lines 51-81 — `var(--color-component-background)` background, `var(--color-normal-text)` body, `var(--color-highlight)` for the rank pill accent per D-10; `var(--font-s/ms/m)` size tokens; hard tabs in the `<style>` block):

```scss
<style scoped lang="scss">
.districtpopup {
	display: flex;
	flex-direction: column;
	gap: var(--font-s);
	padding: var(--font-s) var(--font-m);
	background-color: var(--color-component-background);
	border-radius: 5px;
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
	min-width: 160px;

	&__name {
		color: var(--color-normal-text);
		font-size: var(--font-m);
		margin: 0;
	}

	&__rank {
		align-self: flex-start;
		padding: 2px 8px;
		border-radius: 999px;
		background-color: var(--color-highlight);
		color: var(--color-component-background);
		font-size: var(--font-ms);
	}

	&__total {
		color: var(--color-normal-text);
		font-size: 1.6rem;
		font-weight: 600;
	}

	&__breakdown {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--font-s);
	}

	&__label {
		color: var(--color-complement-text);
		font-size: var(--font-s);
		margin: 0;
	}

	&__value {
		color: var(--color-normal-text);
		font-size: var(--font-ms);
		margin: 0;
	}
}
</style>
```

**Mapbox Popup CSS reset** — Mapbox's default popup wrapper (`.mapboxgl-popup-content`) has its own padding + white-ish background. To get the dark glass look from D-10, the view (NOT the SFC) should pass these constructor options when creating the `mapboxgl.Popup`:

```js
new mapboxGl.Popup({
	closeButton: false,
	closeOnClick: false,
	anchor: "bottom",        // D-07 cursor-anchored
	offset: 12,
	className: "districtpopup-shell",   // optional — gives a hook for global override
});
```

Plus an UN-scoped global override (place in `src/assets/styles/globalStyles.css` or skip and accept default — Phase 3 should pick the cheaper path: skip the global override on first iteration, see if it looks acceptable, escalate only if the white default leaks through).

---

### `src/views/CrossCompareView.vue` (EDIT — extrusion layer + hover handler + popup mount + teardown extension)

**Primary analog:** Self (`CrossCompareView.vue` from Phase 2 — read in full above). The extrusion layer slots in at the existing `addCrossCompareLayers()` function (line 97-130); the hover handler slots in after the existing watchers (line 219); the popup teardown extends the existing `onBeforeUnmount` (line 190-201).

**Secondary analog (Mapbox Popup body via `createApp` — the only existing precedent in this codebase):** `Taipei-City-Dashboard-FE/src/store/mapStore.js` lines 1983-2108

**Excerpt — `mapStore.js` lines 1983-2108 (the precedent: build a Popup with an empty `<div id="…">`, addTo map, then `createApp(Component).mount('#that-id')`):**

```js
this.popup = new mapboxGl.Popup()
	.setLngLat(popupCoords)
	.setHTML('<div id="vue-popup-content"></div>')
	.addTo(this.map);

// …

// This helps vue determine the most optimal time to mount the component
nextTick(() => {
	const app = createApp(PopupComponent);
	app.mount("#vue-popup-content");
});
```

**Phase 3 adaptation (the precedent doesn't `app.unmount()` because `mapStore.removePopup()` only calls `popup.remove()` — see line 2128-2133. That is a latent leak. Phase 3 MUST `app.unmount()` per D-14 / D-22 / D-23 / Concern 3):**

```js
// near top of <script setup>, alongside existing imports
import { createApp } from "vue";
import DistrictPopup from "../components/crosscompare/DistrictPopup.vue";
import {
	CROSSCOMPARE_EXTRUSION_LAYER_ID,
	EXTRUSION_HEIGHT_HOVER,
	EXTRUSION_TRANSITION_MS,
	buildExtrusionPaint,
} from "../assets/configs/crossCompareConfig";

// hover state — top-level let bindings (NOT ref) to mirror existing `let map = null;` pattern at line 38
let hoveredFeatureId = null;
let popup = null;
let popupApp = null;
```

**Extrusion layer addition** — slot INSIDE the existing `addCrossCompareLayers()` function (after line 130, before the closing brace), so it sits ABOVE the active fill layer:

```js
// 4. extrusion layer (上層) — D-02：與 active fill 共生，由 feature-state.hover 驅動
//    paint 表達式 + transition 一併設定；JS 端只透過 setFeatureState 改 hover 狀態
map.addLayer({
	...baseLayer,
	id: CROSSCOMPARE_EXTRUSION_LAYER_ID,
	type: "fill-extrusion",
	paint: buildExtrusionPaint(store.rampDomain, store.scoreByDistrict),
});
```

**`buildExtrusionPaint()` shape (Concerns 2 — the case-on-feature-state expression is the only way to animate via Mapbox transition):**

```js
// in crossCompareConfig.js — see config-file section below
export function buildExtrusionPaint(domain, scoreByDistrict) {
	const colorExpr = buildFillPaint(domain, scoreByDistrict)["fill-color"];
	return {
		"fill-extrusion-color": colorExpr,
		"fill-extrusion-opacity": 0.85,
		"fill-extrusion-height": [
			"case",
			["boolean", ["feature-state", "hover"], false],
			EXTRUSION_HEIGHT_HOVER,
			0,
		],
		"fill-extrusion-height-transition": {
			duration: EXTRUSION_TRANSITION_MS,
			delay: 0,
		},
	};
}
```

**Hover handler block — append at the end of `<script setup>` (after the `watch(...)` at line 214-219). This is the structural enforcement of D-12 (events bound to active layer ONLY) + D-11 / D-22 / D-23:**

```js
// ---------------------------------------------------------------
// CC-04 hover：lift + popup
// 事件僅綁在 active fill layer（D-12）— greyed layer 不接 hover，結構性保證 D-11
// hoveredFeatureId 是當前在 hover 的 district 名稱（promoteId: TNAME → feature.id）
// popup / popupApp 是當前掛載的 Mapbox Popup 與 Vue app；onBeforeUnmount + onMouseLeave 都會清掉
// ---------------------------------------------------------------

function setHover(districtName, on) {
	if (!map || !districtName) return;
	map.setFeatureState(
		{
			source: CROSSCOMPARE_SOURCE_ID,
			// vector tile (production) 才有 sourceLayer；geojson (localhost) 必須省略
			...(CROSSCOMPARE_SOURCE_LAYER ? { sourceLayer: CROSSCOMPARE_SOURCE_LAYER } : {}),
			id: districtName,
		},
		{ hover: on },
	);
}

function buildPopup(lngLat, districtName) {
	// 1. tear down any leftover popup from the previous district
	teardownPopup();

	// 2. find row for this district from the store getter
	const normalizedKey = normalizeDistrictKey("臺北市", districtName);
	// store.scoreByDistrict 的 key 是 "city|district" — 我們不知 city，改用線性掃 row
	let row = null;
	for (const [, r] of store.scoreByDistrict) {
		if (
			String(r.district).replace(/臺/g, "台") === String(districtName).replace(/臺/g, "台")
		) {
			row = r;
			break;
		}
	}

	// 3. spawn popup (anchor: 'bottom', cursor-anchored per D-07)
	popup = new mapboxGl.Popup({
		closeButton: false,
		closeOnClick: false,
		anchor: "bottom",
		offset: 12,
	})
		.setLngLat(lngLat)
		.setHTML('<div id="crosscompare-popup-mount"></div>')
		.addTo(map);

	// 4. mount Vue body (D-06)
	nextTick(() => {
		popupApp = createApp(DistrictPopup, {
			districtName,
			rank: row?.rank ?? null,
			totalScore: row?.total_score ?? null,
			courseScore: row?.course_score ?? null,
			inspectionScore: row?.inspection_score ?? null,
		});
		popupApp.mount("#crosscompare-popup-mount");
	});
}

function teardownPopup() {
	if (popupApp) {
		try { popupApp.unmount(); } catch { /* already unmounted */ }
		popupApp = null;
	}
	if (popup) {
		try { popup.remove(); } catch { /* already removed */ }
		popup = null;
	}
}

function onMouseMove(e) {
	if (!map || !e.features?.length) return;
	const feature = e.features[0];
	const districtName = feature.id;   // promoteId: TNAME → feature.id is district name
	if (!districtName) return;

	// D-23：rapid mousemove coalescing — only update state on district change
	if (hoveredFeatureId !== districtName) {
		setHover(hoveredFeatureId, false);   // clear previous (no-op if null)
		setHover(districtName, true);
		hoveredFeatureId = districtName;
		buildPopup(e.lngLat, districtName);
	} else if (popup) {
		// same district, just track cursor
		popup.setLngLat(e.lngLat);
	}
}

function onMouseEnter() {
	if (map) map.getCanvas().style.cursor = "pointer";   // D-13
}

function onMouseLeave() {
	if (map) map.getCanvas().style.cursor = "";
	setHover(hoveredFeatureId, false);
	hoveredFeatureId = null;
	teardownPopup();
}
```

**Event-binding pattern — append INSIDE the existing `map.on("load", () => { ... })` block at line 171-183 (right after `map.once("idle", probeJoinKey);` at line 182):**

```js
// CC-04 — events bound to active layer ONLY (D-12)
map.on("mousemove", CROSSCOMPARE_FILL_LAYER_ID, onMouseMove);
map.on("mouseenter", CROSSCOMPARE_FILL_LAYER_ID, onMouseEnter);
map.on("mouseleave", CROSSCOMPARE_FILL_LAYER_ID, onMouseLeave);
```

**Teardown extension — modify the existing `onBeforeUnmount` at line 190-201 to ALSO clean up the popup (D-14 / D-22):**

```js
onBeforeUnmount(() => {
	// CC-04 — clean popup before destroying map (Phase 3 addition)
	teardownPopup();
	hoveredFeatureId = null;

	// D-04：view 持有 map 實例 → 必須親手清掉，避免 Mapbox WebGL context 漏（Phase 2 既有）
	if (map) {
		try {
			map.remove();
		} catch {
			// 已被外部 remove 過（譬如 HMR）
		}
		map = null;
	}
	styleLoaded = false;
});
```

**`nextTick` import** — Phase 2's `<script setup>` imports are at lines 13-33; the existing import line 14 reads `import { onMounted, onBeforeUnmount, watch } from "vue";`. Phase 3 must EXTEND that import to add `nextTick` and `createApp`:

```js
import { onMounted, onBeforeUnmount, watch, nextTick } from "vue";
import { createApp } from "vue";   // or merge: import { onMounted, ..., createApp, nextTick } from "vue";
```

(Style note: `mapStore.js` line 12 imports them all together: `import { createApp, defineComponent, nextTick, ref, watch, markRaw } from "vue";` — match that single-line style.)

---

### `src/assets/configs/crossCompareConfig.js` (EDIT — append extrusion constants + builder)

**Primary analog:** Self (the file already exports `CROSSCOMPARE_FILL_LAYER_ID`, `CROSSCOMPARE_RAMP`, `buildFillPaint()` etc. — Phase 3 adds parallel exports following the exact same idiom)

**Where to insert (place after the layer-id block at line 32, then after `buildLinePaint()` at line 157):**

```js
// ----------------------------------------------------------------------
// Extrusion layer (Phase 3 / CC-04 — hover-driven levitate)
// ----------------------------------------------------------------------
// 與 active fill 同層（同一個 source_layer）但 type:"fill-extrusion"，
// 由 feature-state.hover 驅動 fill-extrusion-height 在 0 ↔ EXTRUSION_HEIGHT_HOVER 之間切換。
// EXTRUSION_TRANSITION_MS < 200 滿足 CC-04 acceptance #1。
export const CROSSCOMPARE_EXTRUSION_LAYER_ID = "crosscompare_extrusion_active";
export const EXTRUSION_HEIGHT_HOVER = 4000;     // 公尺（hover 時的 levitate 高度）
export const EXTRUSION_TRANSITION_MS = 150;     // < 200ms（D-04 + 預留餘裕）
```

```js
/**
 * 啟用區的 fill-extrusion paint（CC-04）：
 *   - color  與 buildFillPaint() 一致（lifted top + sides 維持分數色）
 *   - height case-on-feature-state — hover ? EXTRUSION_HEIGHT_HOVER : 0
 *   - transition 設在 paint property 上，由 Mapbox 內建 cubic 緩動
 *
 * 注意：fill-extrusion-height 必須是 case + feature-state（無法靠 setLayoutProperty 後動畫）
 *
 * @param {[number, number]} domain  [min, max] of total_score
 * @param {Map<string, {city,district,total_score}>} scoreByDistrict
 * @returns Mapbox paint object
 */
export function buildExtrusionPaint(domain, scoreByDistrict) {
	const fillPaint = buildFillPaint(domain, scoreByDistrict);
	return {
		"fill-extrusion-color": fillPaint["fill-color"],
		"fill-extrusion-opacity": 0.85,
		"fill-extrusion-height": [
			"case",
			["boolean", ["feature-state", "hover"], false],
			EXTRUSION_HEIGHT_HOVER,
			0,
		],
		"fill-extrusion-height-transition": {
			duration: EXTRUSION_TRANSITION_MS,
			delay: 0,
		},
	};
}
```

---

### `src/views/MapView.vue` (EDIT — REMOVE 3 sites + comment)

**Primary analog:** Self (file is its own analog — read full lines 13-30 + 144-160 to identify exact deletions).

**Exact deletion targets (verbatim from current file):**

**Site 1 — Line 24 (the import):**
```js
import MakeNewThingHerePanel from "../make-new-thing-here/MakeNewThingHerePanel.vue";
```
DELETE this whole line.

**Site 2 — Line 26 (the computed):**
```js
const isMakeNewThingHere = computed(() => route.query.index === "make-new-thing-here");
```
DELETE this whole line. After deletion, audit whether `computed` is still used elsewhere in the file — `parseMapLayers` at line 41 uses `computed(() => { ... })` so the import at line 15 (`import { computed, ref, watch } from "vue";`) must STAY.

Also note `route` is declared at line 31 (`const route = useRoute();`) and used by the watcher at line 53 — STAYS.

**Site 3 — Lines 147-153 (HTML comment + the entire `v-if` branch including the panel mount):**
```vue
      <!-- 0. make-new-thing-here: synthetic index, swaps the entire content area for MakeNewThingHerePanel. -->
      <div
        v-if="isMakeNewThingHere"
        class="map-charts"
      >
        <MakeNewThingHerePanel />
      </div>
```
DELETE lines 147 through 153 inclusive (the `<!-- 0. … -->` comment line + the 6-line `<div v-if=…>…</div>` block).

**Critical adjustment after deletion (Concern 5):** the next sibling element starts at line 154:
```vue
      <!-- 1. If the dashboard is map-layers -->
      <div
        v-else-if="
          contentStore.currentDashboard.index?.includes('map-layers')
        "
```
The `v-else-if` here is currently chained off the deleted `v-if="isMakeNewThingHere"`. After deletion, this `v-else-if` becomes the FIRST branch with no preceding `v-if` — Vue WILL throw a compile error (`v-else-if has no matching v-if`). **The `v-else-if` on line 156 MUST be changed to `v-if`.** Subsequent `v-else-if` / `v-else` branches on lines 263, 553, 560, 567 stay as-is (they chain off the new top `v-if`).

**Verification step for the planner:** after the edit, the surrounding `if/else-if` chain in `MapView.vue` should look like:

```vue
      <!-- 1. If the dashboard is map-layers -->
      <div
        v-if="contentStore.currentDashboard.index?.includes('map-layers')"
        class="map-charts"
      >
        <!-- … -->
      </div>
      <!-- 2. Dashboards that have components -->
      <div v-else-if="contentStore.currentDashboard.components?.length !== 0" …>
      …
```

---

### `src/components/utilities/bars/SideBar.vue` (EDIT — REMOVE the synthetic-index link)

**Primary analog:** Self.

**Exact deletion target (verbatim, lines 160-165 of current file):**
```vue
    <SideBarLink
      icon="science"
      title="Make New Thing Here"
      to="/mapview?index=make-new-thing-here"
      :expanded="isExpanded"
    />
```

DELETE these 6 lines.

**Surrounding context (lines 157-168 of current file — the deletion target sits between two `<h1>` section headers):**

```vue
    <h1>
      {{ isExpanded ? `工具` : `工具` }}
    </h1>
    <SideBarLink                              <!-- DELETE start -->
      icon="science"
      title="Make New Thing Here"
      to="/mapview?index=make-new-thing-here"
      :expanded="isExpanded"
    />                                        <!-- DELETE end -->
    <h1 @click="toggleCollapse(contentStore.cityManager.activeCities)">
      {{ isExpanded ? `公共儀表板` : `公共` }}
    </h1>
```

**Wrapper analysis (Concern 6):** the `<SideBarLink>` is NOT wrapped in any `<li>`/`<div>` — it sits directly between two `<h1>` tags. The `工具` `<h1>` (lines 157-159) becomes an empty section header with no items underneath after deletion.

**Decision needed at planning time:** does the empty `工具` section header stay or go? Two options:
- **Option A (conservative — RECOMMENDED for the polish phase):** leave the `工具` `<h1>` as a placeholder; future tools can slot in there. Single-line minimal-diff change.
- **Option B (aggressive — also valid, but expands diff):** delete the `工具` `<h1>` block (lines 157-159) too, since it has no contents anymore. Saves visual clutter.

The plan should pick A by default; B only if the user notices the empty header during smoke. The `<v-for>` dashboard list (lines 169-194) is structurally independent — DELETION does NOT affect it.

**Imports — line 11 imports `SideBarLink`:**
```js
import SideBarLink from "../miscellaneous/SideBarLink.vue";
```
After deletion, `SideBarLink` is unused in this file. **Delete that import line as well** (ESLint's `no-unused-vars` will fail the build per `eslint.config.js` rule). The component file (`SideBarLink.vue`) itself is NOT deleted — it's still a generic reusable component, just no longer consumed by `SideBar.vue`. (If the planner wants to verify reuse: `grep -rn "SideBarLink" Taipei-City-Dashboard-FE/src/`. As of now SideBar.vue is the only consumer — that's fine, leave the file in case future links use it.)

---

### `src/make-new-thing-here/` (DELETE — entire directory)

**No analog needed.** `git rm -r Taipei-City-Dashboard-FE/src/make-new-thing-here/` removes both files (`MakeNewThingHerePanel.vue` + `README.md`).

**README excerpt to preserve in deletion-commit message body** (D-15 — archaeology in `git log --follow`). Quote from `README.md` lines 1-15:

```
# Make New Thing Here Components

This directory hosts a self-contained set of components for **Make New Thing Here**,
a special section that lives **inside MapView** under the synthetic dashboard index
`make-new-thing-here`.

## How it's wired
- Entry point: a fixed `Make New Thing Here` link in `SideBar.vue` (above the public
  dashboards list) that navigates to `/mapview?index=make-new-thing-here`
- `MapView.vue` has a top-level branch
  `v-if="route.query.index === 'make-new-thing-here'"` that renders
  `MakeNewThingHerePanel.vue` from this directory, **bypassing** the normal
  `currentDashboard.components` rendering.
```

**Recommended commit message body for the deletion (mixed Chinese + Conventional Commits per CONVENTIONS.md):**

```
重新命名: 移除 make-new-thing-here synthetic-index 注入點 (CC-04 / Phase 3)

This directory hosted the temporary synthetic-dashboard-index hack that
let new map features be prototyped inside MapView via
/mapview?index=make-new-thing-here, bypassing currentDashboard.components.
That role is now filled by the real /crosscompare top-level route shipped
in Phase 2 (v2.3 milestone), so the injection slot is removed.

Removed:
- src/make-new-thing-here/MakeNewThingHerePanel.vue
- src/make-new-thing-here/README.md
- import + computed + v-if branch in src/views/MapView.vue (lines 24, 26, 147-153)
- SideBarLink to /mapview?index=make-new-thing-here in src/components/utilities/bars/SideBar.vue (lines 160-165)
- short-circuit branch in src/store/contentStore.js setRouteParams (lines 91-98)
```

(Mirrors the existing `重新命名: datalab → make-new-thing-here` style at commit `8f6082f`.)

---

## Shared Patterns

### `setFeatureState` API call shape (NEW pattern in this codebase — Concern 1)

**Source:** Mapbox GL JS docs (no in-tree analog exists)
**Apply to:** all hover-state mutations in `CrossCompareView.vue`'s hover handler

```js
// Set hover=true on a feature
map.setFeatureState(
	{
		source: CROSSCOMPARE_SOURCE_ID,
		// IMPORTANT: sourceLayer is REQUIRED for vector sources, MUST be omitted for geojson sources
		...(CROSSCOMPARE_SOURCE_LAYER ? { sourceLayer: CROSSCOMPARE_SOURCE_LAYER } : {}),
		id: districtName,   // <-- THIS is feature.id, surfaced because Phase 2 set promoteId: "TNAME"
	},
	{ hover: true },
);

// Clear hover
map.setFeatureState(
	{ source: CROSSCOMPARE_SOURCE_ID, ...(CROSSCOMPARE_SOURCE_LAYER ? { sourceLayer: CROSSCOMPARE_SOURCE_LAYER } : {}), id: districtName },
	{ hover: false },
);
```

**Why `id: districtName` works:** Phase 2 added `promoteId: CROSSCOMPARE_JOIN_KEY` (= `"TNAME"`) on the source declaration in `CrossCompareView.vue` lines 81 + 91. Mapbox uses this to surface the `TNAME` value as `feature.id` at render time. So `e.features[0].id === '中正區'` etc., and `setFeatureState({ id: '中正區', ... }, ...)` matches the same feature.

### Mapbox layer-scoped event binding (Concern 4 — structural enforcement of D-12)

**Source:** Mapbox GL JS API — `map.on(eventType, layerId, listener)` overload only fires when the cursor is over a feature on that specific layer
**Apply to:** the three hover bindings in `CrossCompareView.vue`'s `style.load` handler

```js
// CORRECT — bound only to the active layer
map.on("mousemove", CROSSCOMPARE_FILL_LAYER_ID, onMouseMove);
map.on("mouseenter", CROSSCOMPARE_FILL_LAYER_ID, onMouseEnter);
map.on("mouseleave", CROSSCOMPARE_FILL_LAYER_ID, onMouseLeave);

// FORBIDDEN — would also fire on greyed districts in 台北 mode (defeats D-11)
// map.on("mousemove", onMouseMove);  // <- no layerId arg
// map.on("mousemove", CROSSCOMPARE_GREY_LAYER_ID, onMouseMove);  // <- wrong layer
```

This is the structural enforcement that the orchestrator's CONTEXT D-12 mandates. No additional Vue-level guard against `disabledDistricts` is needed — events simply never fire on greyed features.

(Optional defensive guard, since Phase 2 D-11 also mandated `disabledDistricts` Set on the store: the handler can additionally check `if (store.disabledDistricts.has(districtKey)) return;` as belt-and-braces. The store getter exists per `crossCompareStore.js` lines 83-93. Cheap to include.)

### Vue `createApp` + `app.unmount()` lifecycle (Concern 3)

**Source:** Vue 3 docs + the precedent at `mapStore.js` line 2106 (which DOES `createApp().mount(...)` but does NOT `app.unmount()` — that's a latent leak; Phase 3 must do better)
**Apply to:** `CrossCompareView.vue`'s `buildPopup` + `teardownPopup` + `onBeforeUnmount`

```js
// Mount
popupApp = createApp(DistrictPopup, { /* props */ });
popupApp.mount("#crosscompare-popup-mount");

// Unmount — MUST happen on every popup teardown (mouseleave, district change, view unmount)
if (popupApp) {
	try { popupApp.unmount(); } catch { /* already unmounted */ }
	popupApp = null;
}
```

### Indentation — hard tabs

**Source:** `eslint.config.js` rule `indent: ["error", "tab"]` (Phase 2 PATTERNS.md Concern 5)
**Apply to:** `<script>` and `<style>` blocks in `DistrictPopup.vue` + new constants/functions in `crossCompareConfig.js` + new handler block in `CrossCompareView.vue`. Vue templates may be re-indented to 2-space by `eslint --fix` — accept that.

### Imports — relative only

**Source:** Phase 2 PATTERNS.md (every existing file uses `../...`); no `@/` alias is configured.
**Apply to:** `DistrictPopup.vue` imports `crossCompareConfig` via `"../../assets/configs/crossCompareConfig"` (two-up because it's in `components/crosscompare/`). `CrossCompareView.vue` is one-up: `"../assets/configs/crossCompareConfig"` (already correct in Phase 2 output).

### Inline comments — Traditional Chinese

**Source:** `crossCompareStore.js`, `crossCompareConfig.js`, `CrossCompareView.vue` (Phase 2 outputs all use TC for inline comments)
**Apply to:** Phase 3 additions. Examples already used above: `// 防呆：…`, `// 事件僅綁在 active fill layer（D-12）— …`.

### TUIC banner

**Source:** `RampLegend.vue` line 1 (component banner — single line); `CrossCompareView.vue` lines 1-9 (full block — already present, no change needed)
**Apply to:** `DistrictPopup.vue` — single-line banner. `CrossCompareView.vue` already has the full block from Phase 2; do NOT add or remove it.

### Snake_case JSON

**Source:** BE returns `total_score`, `course_score`, `inspection_score`, `rank` fields per `crosscompareDistrictScore.go` (Phase 1)
**Apply to:** `DistrictPopup.vue` props are accessed from `store.scoreByDistrict.get(...)` — the row keys are `total_score`, `course_score`, `inspection_score`, `rank`. The Vue prop NAMES on the SFC (`totalScore`, `courseScore`, `inspectionScore`, `rank`) are `camelCase` per Vue convention; they map FROM the snake_case row at the call site (`createApp(DistrictPopup, { totalScore: row.total_score, ... })`). Don't try to use snake_case prop names in Vue — `defineProps({ total_score: ... })` works but is awkward and `vue/prop-name-casing` is one of the rules disabled in `eslint.config.js` per CONVENTIONS.md line 21, so either form passes lint.

---

## No Analog Found

| Pattern | Reason |
|---|---|
| `setFeatureState` | NEW pattern — no prior code in the FE uses it. See Concern 1 + the API call-shape excerpt above. |
| `fill-extrusion-height` driven by `feature-state` | NEW pattern — no prior code uses fill-extrusion at all. The case-on-feature-state expression + transition is documented above. See Concern 2. |

---

## Concerns Surfaced for Downstream Agents

1. **`setFeatureState` is a NEW pattern in this codebase.** No prior code in `Taipei-City-Dashboard-FE/src/` calls `map.setFeatureState`. Phase 3 introduces it. The call shape MUST include `sourceLayer` for vector sources but OMIT it for geojson sources (`CROSSCOMPARE_SOURCE_LAYER` is `undefined` on localhost — same conditional-spread idiom Phase 2 already uses at `CrossCompareView.vue` line 103). The `id` argument is `districtName` (a string like `"中正區"`) because Phase 2 set `promoteId: "TNAME"` on the source; Mapbox surfaces TNAME as `feature.id`. See "Shared Patterns → setFeatureState API call shape" above for the verbatim shape.

2. **`fill-extrusion-height` MUST animate via `case` + `feature-state`, NOT via `setLayoutProperty` / `setPaintProperty` mutation.** The transition is configured by the companion `fill-extrusion-height-transition` paint property (see `buildExtrusionPaint()` excerpt above). Trying to swap the height value imperatively via `setPaintProperty(layer, "fill-extrusion-height", 4000)` will not animate — Mapbox only transitions paint expressions that READ from `feature-state`, not raw value swaps. This is the load-bearing detail of D-04.

3. **Vue popup mounted via `createApp` MUST call `app.unmount()` on cleanup.** The existing precedent at `mapStore.js` line 2106 (`const app = createApp(PopupComponent); app.mount("#vue-popup-content");`) is a latent memory leak — `removePopup()` at line 2128 only calls `popup.remove()` (which removes the DOM but leaves the Vue app instance alive). Phase 3 must NOT replicate that mistake. The `teardownPopup()` helper above does it correctly: `popupApp.unmount()` THEN `popup.remove()` (in that order — unmounting after the DOM is gone is technically safe but generates a Vue warning in dev).

4. **Greyed-layer hover-event isolation is structural, not Vue-level.** Phase 2 D-11 mandated `disabledDistricts` as a hover-guard contract; Phase 3 honours it primarily by binding events to `crosscompare_fill_active` ONLY (not `crosscompare_fill_greyed`). Mapbox's `map.on(eventType, layerId, handler)` overload only fires when the cursor is over a feature on that specific layer. The `disabledDistricts` Set check is a defensive belt-and-braces secondary guard — recommended but not load-bearing.

5. **`MapView.vue` `v-else-if` cascade after deletion.** After removing the `v-if="isMakeNewThingHere"` branch (lines 147-153), the `<div v-else-if="...map-layers...">` at line 154-160 becomes the FIRST branch in the chain. Its `v-else-if` MUST be changed to `v-if` or Vue will throw a compile error. The subsequent `v-else-if` / `v-else` branches at lines 263, 553, 560, 567 chain off this new top `v-if` and stay as-is. Verify by running `npm run build` after the edit — Vue compile errors surface there.

6. **`SideBar.vue` link removal does NOT break the `<v-for>` dashboards list.** The `<SideBarLink>` at lines 160-165 sits between two `<h1>` section headers (`工具` above, `公共儀表板` below). It is NOT inside any `<v-for>` — the dynamic dashboards list at lines 169-194 is structurally independent. After deletion, the `工具` `<h1>` becomes an empty section header. Recommended action: leave it as a placeholder (Option A in the deletion target section). Also DELETE the now-unused `import SideBarLink` at line 11 of `SideBar.vue` — ESLint's `no-unused-vars` will fail the build otherwise.

7. **Hard tabs in `<script>` and `<style>` blocks (ESLint enforcement).** Per `eslint.config.js` rule `indent: ["error", "tab"]` and `npm run build` running `eslint --fix && vite build`. Vue `<template>` blocks may end up 2-space-indented after `eslint --fix` (the Phase 2 output `CrossCompareView.vue` lines 222-233 show this — template is 2-space, script + style are tabs). Accept that. New SFC `DistrictPopup.vue` should write tabs in script + style; `eslint --fix` will normalise the template if needed.

8. **No test framework.** Per CLAUDE.md "There is no `npm test`" and Phase 2 PATTERNS.md Concern 6. Phase 3 verification = `grep -r "make-new-thing-here" Taipei-City-Dashboard-FE/src/` returns zero matches (D-18) + `npm run build` exits 0 + manual browser smoke test (deferred to user once they fix the Vite cache permission per Phase 2 STATE.md). Do NOT ask the planner to write Vue/JS test files.

9. **(Bonus — discovered during pattern mapping)** `Taipei-City-Dashboard-FE/src/store/contentStore.js` lines 87-98 contain a 6th reference to `make-new-thing-here` — a `setRouteParams` short-circuit branch that prevents the synthetic index from triggering BE dashboard lookup. The orchestrator's CONTEXT D-15..D-18 enumerates 5 reference sites, but the CC-04 acceptance criterion (D-18 / ROADMAP success criterion #3) is "grep returns ZERO matches". This 6th reference must be deleted too, otherwise the verification gate fails. Lines to delete:

```js
		// "make-new-thing-here" is a synthetic index handled directly by MapView; skip BE dashboard lookup
		// so the user is not auto-redirected to the first available real dashboard.
		if (index === "make-new-thing-here") {
			this.currentDashboard.city = city;
			this.currentDashboard.index = index;
			this.currentDashboard.components = [];
			return;
		}
```

The two preceding comment lines + the 6-line `if` block — all 8 lines collectively. Removing this short-circuit means `setRouteParams("...", "make-new-thing-here", ...)` will fall through to the normal dashboard-lookup logic; since `/mapview?index=make-new-thing-here` no longer exists as a route after the SideBar/MapView edits above, this code path is now unreachable and removing the branch is safe. Plan should include this as a 6th site under the "make-new-thing-here removal" task. The user prompt should be updated (or planner should silently include) — flagging here for visibility.

---

## Metadata

**Analog search scope:** `Taipei-City-Dashboard-FE/src/{views,components,store,router,assets/configs}/`
**Files scanned (full or grep+targeted-read):** 11
- `views/CrossCompareView.vue` (full — Phase 2 output, the file being edited)
- `views/MapView.vue` (full — to enumerate exact deletion line numbers + verify v-else-if chain)
- `components/crosscompare/RampLegend.vue` (full — primary analog for `DistrictPopup.vue` styling)
- `components/map/MapPopup.vue` (head — secondary analog for popup body SFC)
- `components/utilities/bars/SideBar.vue` (lines 1-50 + 140-200 — to identify the deletion target + wrapper analysis)
- `components/utilities/miscellaneous/SideBarLink.vue` (head — to confirm structural shape and reusability)
- `store/mapStore.js` (lines 12, 125-148, 1860-2150 — Mapbox Popup + createApp precedent)
- `store/contentStore.js` (lines 85-115 — to surface Concern 9, the 6th reference site)
- `store/crossCompareStore.js` (full — to wire popup props from `scoreByDistrict` getter)
- `assets/configs/crossCompareConfig.js` (full — to identify insertion points for new exports)
- `make-new-thing-here/README.md` (full — for deletion-commit body archaeology)

**Pattern extraction date:** 2026-05-03

---

## PATTERN MAPPING COMPLETE

**Phase:** 3 — Hover Interaction & Polish (CC-04)
**Files classified:** 6 (1 NEW + 4 EDIT + 1 DELETE)
**Analogs found:** 6 / 6

### Coverage
- Files with exact analog: 5 (`CrossCompareView.vue` extends self; `crossCompareConfig.js` extends self; `MapView.vue` self-deletion; `SideBar.vue` self-deletion; `make-new-thing-here/` directory wholesale delete with no analog needed)
- Files with role-match analog: 1 (`DistrictPopup.vue` — `RampLegend.vue` for style + `MapPopup.vue` for popup-body shape)
- Files with no analog: 0
- NEW patterns introduced (no prior in-tree precedent): 2 — `setFeatureState` API + `fill-extrusion-height` paint expression with `feature-state` transition

### Key Patterns Identified

- **Levitate animation = pure Mapbox paint expression + transition**, not JS state mutation. `case` + `feature-state` reads from feature state; `fill-extrusion-height-transition` configures the cubic-eased animation. Phase 3's JS-side responsibility is reduced to `setFeatureState({...}, { hover: true|false })` only — Mapbox does the rest.
- **Layer-scoped event binding (`map.on(event, layerId, handler)`) is the structural enforcement of D-12**: events bound to `crosscompare_fill_active` literally cannot fire on greyed features. No Vue-level guard against `disabledDistricts` is required; the optional belt-and-braces guard is cheap and recommended.
- **Vue popup body via `createApp(Component, props).mount(domNode)` has one in-tree precedent** (`mapStore.js` lines 2106-2107) but that precedent omits `app.unmount()` — a latent leak. Phase 3 fixes the pattern: always pair `mount()` with `unmount()` in the teardown, called from BOTH the per-hover `mouseleave` and the `onBeforeUnmount` view destructor.
- **The `promoteId: "TNAME"` seam shipped by Phase 2 is the load-bearing primitive**: it surfaces the district name as `feature.id`, which is then used as the `id` argument to `setFeatureState`. Without `promoteId`, Phase 3 hover would need to maintain its own feature-id ↔ district-name lookup table.
- **MapView.vue deletion has a hidden trap**: removing the `v-if` first branch turns the next `v-else-if` into an orphan and breaks the Vue compile. The plan must include the `v-else-if` → `v-if` rewrite at MapView.vue line 156.
- **6 reference sites for `make-new-thing-here`, not 5**: there is an extra short-circuit in `contentStore.js` lines 87-98. The CC-04 acceptance gate (`grep -r "make-new-thing-here" Taipei-City-Dashboard-FE/src/` returns zero) WILL fail unless the planner adds this 6th site. See Concern 9.
- **Hard tabs in script+style; templates may auto-format to 2-space**; relative imports only; TC inline comments; snake_case JSON in store/templates and camelCase in Vue props (mapped at the `createApp` call site).

### File Created
`/home/yumekuii/works/taipei-city-dashboard/.planning/phases/03-hover-interaction-polish/03-PATTERNS.md`

### Ready for Planning
Pattern mapping complete. Planner can reference exact analog file paths + line numbers in the per-PLAN action sections. Nine concerns surfaced for explicit handling — most importantly Concerns 1-3 (the two NEW Mapbox patterns + the createApp-unmount pairing), Concern 5 (the v-else-if trap in MapView.vue), and Concern 9 (the bonus 6th make-new-thing-here reference in contentStore.js that breaks the acceptance gate if missed).
