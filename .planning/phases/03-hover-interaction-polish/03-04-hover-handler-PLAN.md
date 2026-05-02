---
phase: 03-hover-interaction-polish
plan: 04
type: execute
wave: 2
depends_on: ["03-01", "03-02"]
files_modified:
  - Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue
autonomous: true
requirements: [CC-04]
tags: [crosscompare, hover, popup, mapbox, feature-state]

must_haves:
  truths:
    - "Hovering an enabled district triggers fill-extrusion lift via setFeatureState({source, sourceLayer?, id: districtName}, {hover: true}) (D-01, D-02, D-04)"
    - "Hover events bind ONLY to crosscompare_fill_active layer — greyed layer never fires hover (D-12 — structural enforcement of D-11 non-interactive)"
    - "Cursor changes to pointer on mouseenter, restored on mouseleave (D-13)"
    - "Popup is a Mapbox Popup instance with closeButton:false, closeOnClick:false, anchor:'bottom', offset:12, body mounted via createApp(DistrictPopup, props).mount('#crosscompare-popup-mount') in nextTick (D-06, D-07)"
    - "Popup positioned at cursor lng/lat (mousemove e.lngLat) — NOT polygon centroid (D-07)"
    - "Re-entrancy coalesce: setFeatureState only fires when hoveredFeatureId !== districtName (D-23)"
    - "Popup body receives 5 props from store.scoreByDistrict lookup: districtName, rank, totalScore, courseScore, inspectionScore (D-08, snake_case→camelCase mapping at call site)"
    - "Cleanup: onBeforeUnmount calls teardownPopup() AND map.remove() (D-14, D-22 — extends Phase 2 teardown)"
    - "teardownPopup unmounts Vue app (popupApp.unmount()) BEFORE removing Mapbox popup (popup.remove()) — fixes the latent leak Concern 3 documented"
    - "npm run build exits 0; eslint clean"
  artifacts:
    - path: "Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue"
      provides: "Hover handler + popup mount + popup teardown extension"
      contains: "setFeatureState"
      contains_2: "createApp"
      contains_3: "DistrictPopup"
      contains_4: "popup.remove()"
      contains_5: "popupApp.unmount()"
      contains_6: "mousemove"
      contains_7: "mouseenter"
      contains_8: "mouseleave"
      contains_9: "hoveredFeatureId"
  key_links:
    - from: "CrossCompareView.vue map.on('mousemove', CROSSCOMPARE_FILL_LAYER_ID, onMouseMove)"
      to: "DistrictPopup.vue (mounted via createApp)"
      via: "Mapbox layer-scoped event → setFeatureState → buildPopup → createApp(DistrictPopup, props).mount(div)"
      pattern: "createApp\\(DistrictPopup"
    - from: "onBeforeUnmount"
      to: "teardownPopup() + map.remove()"
      via: "view destruction"
      pattern: "teardownPopup\\(\\)"
---

<objective>
Wire the hover handler in `CrossCompareView.vue` — bind layer-scoped Mapbox events to `crosscompare_fill_active`, flip `feature-state.hover` via `setFeatureState`, mount `DistrictPopup` via `createApp(DistrictPopup, props).mount(div)` into a Mapbox `Popup` HTML container, position cursor-anchored, coalesce rapid mousemove, and extend the existing `onBeforeUnmount` teardown to clean up both the Mapbox popup and the Vue app instance.

Per **D-12** (PATTERNS Concern 4), events bind to `crosscompare_fill_active` ONLY — the greyed layer (`crosscompare_fill_greyed`) gets NO handlers. This is the structural enforcement of "hover-on-greyed = nothing" (D-11 from Phase 2). No Vue-level guard is required for correctness; an optional belt-and-braces `store.disabledDistricts.has(...)` check is included as a defensive secondary guard.

Per **D-22 / D-23 / Concern 3**, the popup teardown ALWAYS pairs `popupApp.unmount()` with `popup.remove()` (in that order). The existing `mapStore.js` precedent (line 2106) skips `unmount()` and is a latent memory leak — Phase 3 explicitly fixes this pattern. Cleanup runs from BOTH `onMouseLeave` AND `onBeforeUnmount`.

Purpose: deliver the user-facing surface of CC-04 acceptance #1 (lift + popup on enabled districts) AND #2 (hover on greyed = nothing) — both met by this plan.

Output: 1 file modified (~80 LOC added: 4 new imports + 3 module-scope `let` bindings + 5 functions + 3 `map.on` event bindings + extended `onBeforeUnmount`). No new packages. No new files.

This plan is **wave 2**, depends on Plans 03-01 (extrusion config + layer) and 03-02 (DistrictPopup.vue). Wave 1 ships the contracts; Wave 2 wires them together.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/03-hover-interaction-polish/03-CONTEXT.md
@.planning/phases/03-hover-interaction-polish/03-PATTERNS.md
@.planning/phases/03-hover-interaction-polish/03-01-extrusion-config-PLAN.md
@.planning/phases/03-hover-interaction-polish/03-02-district-popup-PLAN.md
@./CLAUDE.md

# File being edited (read in full — handler + teardown insert into existing structure)
@Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue

# Consumer SFC (created in Plan 03-02)
@Taipei-City-Dashboard-FE/src/components/crosscompare/DistrictPopup.vue

# Phase 2 contract: store.scoreByDistrict + store.disabledDistricts getters
@Taipei-City-Dashboard-FE/src/store/crossCompareStore.js

<interfaces>
<!-- crossCompareStore.js EXPORTED contracts (from Phase 2 — Plan 03-04 consumes; do NOT modify) -->
```js
// store getters
store.disabledDistricts: Set<string>           // district names that should be non-interactive
store.scoreByDistrict: Map<string, Row>         // composite key, see Note below
store.rampDomain: [number, number]              // [min total_score, max total_score]
store.enabledDistrictNames: string[]            // active districts in current viewMode

// Row shape (snake_case from BE)
type Row = {
  city: string;            // "臺北市" | "新北市"
  district: string;        // e.g. "中正區"
  rank: number;
  total_score: number;
  course_score: number;
  inspection_score: number;
  // ...other fields not used by the popup
};
```

NOTE: `store.scoreByDistrict` is keyed by `city|district` composite, NOT by district name alone (see PATTERNS line 280-292 — the linear-scan workaround). The hover handler does NOT know which city the feature belongs to (vector tile only surfaces TNAME), so it must scan rows looking for a normalised match.

<!-- Phase 3 Plan 03-01 NEW exports from crossCompareConfig.js (must already exist when Plan 03-04 runs) -->
```js
// added in Plan 03-01
export const CROSSCOMPARE_EXTRUSION_LAYER_ID = "crosscompare_extrusion_active";
export const EXTRUSION_HEIGHT_HOVER = 4000;
export const EXTRUSION_TRANSITION_MS = 150;
export function buildExtrusionPaint(domain, scoreByDistrict): Paint;
```

<!-- DistrictPopup.vue prop shape (created in Plan 03-02 — must align EXACTLY) -->
```js
// from DistrictPopup.vue defineProps:
{
  districtName: String (required),
  rank: Number (default null),
  totalScore: Number (default null),
  courseScore: Number (default null),
  inspectionScore: Number (default null),
}
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Extend imports in CrossCompareView.vue (vue + DistrictPopup + normalizeDistrictKey)</name>
  <files>Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue</files>

  <read_first>
    - .planning/phases/03-hover-interaction-polish/03-PATTERNS.md (section "src/views/CrossCompareView.vue (EDIT — extrusion layer + hover handler …)" — `nextTick` import excerpt; the recommended single-line `import { ..., createApp, nextTick } from "vue"` style matching mapStore.js line 12)
    - Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue (lines 14-33 — current imports; Plan 03-01 already added 4 entries to the crossCompareConfig import — read AFTER 03-01 lands)
  </read_first>

  <action>
**Per D-06 (createApp pattern) + Concern 3 (nextTick required).** Extend three import statements at the top of `<script setup>`. Hard tabs.

**Edit 1 — line 14**, the `from "vue"` import. Currently reads:
```js
import { onMounted, onBeforeUnmount, watch } from "vue";
```
Change to:
```js
import { onMounted, onBeforeUnmount, watch, createApp, nextTick } from "vue";
```

(Match the single-line idiom from `mapStore.js` line 12. Per CONVENTIONS.md, alphabetical import order is NOT enforced — this preserves `onMounted, onBeforeUnmount, watch` first followed by `createApp, nextTick`.)

**Edit 2 — extend the named import from `crossCompareConfig`** (after Plan 03-01 it currently reads):
```js
import {
	CROSSCOMPARE_HAS_SOURCE_LAYER,
	CROSSCOMPARE_SOURCE_ID,
	CROSSCOMPARE_SOURCE_LAYER,
	CROSSCOMPARE_JOIN_KEY,
	CROSSCOMPARE_FILL_LAYER_ID,
	CROSSCOMPARE_GREY_LAYER_ID,
	CROSSCOMPARE_GREY_LINE_LAYER_ID,
	CROSSCOMPARE_EXTRUSION_LAYER_ID,
	buildFillPaint,
	buildGreyPaint,
	buildLinePaint,
	buildExtrusionPaint,
} from "../assets/configs/crossCompareConfig";
```

Add `normalizeDistrictKey` (already exported from Phase 2 — used here for 臺/台 canonicalisation in the row lookup) — insert it alphabetically with the other helpers:

```js
import {
	CROSSCOMPARE_HAS_SOURCE_LAYER,
	CROSSCOMPARE_SOURCE_ID,
	CROSSCOMPARE_SOURCE_LAYER,
	CROSSCOMPARE_JOIN_KEY,
	CROSSCOMPARE_FILL_LAYER_ID,
	CROSSCOMPARE_GREY_LAYER_ID,
	CROSSCOMPARE_GREY_LINE_LAYER_ID,
	CROSSCOMPARE_EXTRUSION_LAYER_ID,
	normalizeDistrictKey,
	buildFillPaint,
	buildGreyPaint,
	buildLinePaint,
	buildExtrusionPaint,
} from "../assets/configs/crossCompareConfig";
```

**Edit 3 — add new SFC import below the existing `RampLegend` import (line 33).** Insert as line 34:

```js
import DistrictPopup from "../components/crosscompare/DistrictPopup.vue";
```

**Constraints:**
- Do NOT change the existing imports (`mapboxGl`, `mapboxgl/dist/mapbox-gl.css`, `useCrossCompareStore`, `mapStyle`, `ViewToggle`, `RampLegend`).
- Hard tabs.
- Verify post-edit `npm run build` passes — if `nextTick` or `createApp` aren't yet referenced (they will be after Task 2), ESLint may fire `no-unused-vars` here. Both are referenced after Task 2 — order tasks accordingly (write Task 1 + Task 2 in the same file in one editing pass; do NOT commit between them).
  </action>

  <verify>
    <automated>grep -E "^import \{[^}]*createApp[^}]*\} from \"vue\"" Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue && grep -c "DistrictPopup" Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue</automated>
    <gates>
      - `grep -c "createApp\|nextTick" Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` ≥ 2 (imports added)
      - `grep -c "DistrictPopup" Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` ≥ 1 (import line)
      - `grep -c "normalizeDistrictKey" Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` ≥ 1
    </gates>
  </verify>

  <acceptance_criteria>
    - Vue import extended with `createApp` and `nextTick`.
    - DistrictPopup import added.
    - `normalizeDistrictKey` added to crossCompareConfig import.
    - No other imports changed.
    - Build is provisional (will pass after Task 2 references the new imports).
  </acceptance_criteria>

  <done>
Imports extended. createApp, nextTick, DistrictPopup, normalizeDistrictKey are now in scope for Tasks 2-3.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Add hover handler module-scope state + helper functions in CrossCompareView.vue</name>
  <files>Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue</files>

  <read_first>
    - .planning/phases/03-hover-interaction-polish/03-CONTEXT.md (D-11 verbatim handler skeleton; D-12 / D-13 / D-14 / D-22 / D-23)
    - .planning/phases/03-hover-interaction-polish/03-PATTERNS.md (section "src/views/CrossCompareView.vue (EDIT — …)" — verbatim functions setHover / buildPopup / teardownPopup / onMouseMove / onMouseEnter / onMouseLeave with TC inline comments)
    - Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue lines 36-40 (where `let map` and `let styleLoaded` are declared — module-scope state pattern)
    - Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue lines 200-220 (where to APPEND new functions — after the existing watchers)
  </read_first>

  <action>
**Per D-11, D-12, D-13, D-14, D-22, D-23 + PATTERNS Concerns 1-4.** Append three module-scope `let` bindings and five functions to `<script setup>`. Hard tabs. Traditional Chinese inline comments to match Phase 2 style.

**Insertion point 1 — module-scope state**, append AFTER line 39 (`let styleLoaded = false;`) and BEFORE line 41 (the `applyEnabledFilter` declaration):

```js

// CC-04 hover state — top-level let bindings (D-22 — managed in onBeforeUnmount cleanup)
let hoveredFeatureId = null;       // 當前 hover 中的 district 名稱（promoteId: TNAME → feature.id）
let popup = null;                   // Mapbox Popup instance — null when not hovering
let popupApp = null;                // Vue 3 app instance — null when not hovering
```

**Insertion point 2 — helper functions**, append AFTER the second `watch(...)` at lines 214-219 (read those lines first to confirm the closing point of the existing watchers — there are two watchers in the file). Append the following block:

```js

// ---------------------------------------------------------------
// CC-04 hover：lift + popup
// 事件僅綁在 active fill layer（D-12）— greyed layer 不接 hover，結構性保證 D-11
// hoveredFeatureId 是當前在 hover 的 district 名稱（promoteId: TNAME → feature.id）
// popup / popupApp 是當前掛載的 Mapbox Popup 與 Vue app；onBeforeUnmount + onMouseLeave 都會清掉
// ---------------------------------------------------------------

// 切換指定 district 的 feature-state.hover — Mapbox 內部會跑 fill-extrusion-height-transition（D-04）
function setHover(districtName, on) {
	if (!map || !districtName) return;
	map.setFeatureState(
		{
			source: CROSSCOMPARE_SOURCE_ID,
			// vector tile (production) 才有 sourceLayer；geojson (localhost) 必須省略（PATTERNS Concern 1）
			...(CROSSCOMPARE_SOURCE_LAYER ? { sourceLayer: CROSSCOMPARE_SOURCE_LAYER } : {}),
			id: districtName,
		},
		{ hover: on },
	);
}

// 從 store.scoreByDistrict 找出對應 row — key 是 "city|district" 複合 key，
// 但 hover 端不知 city，改用 normalizeDistrictKey 線性掃（PATTERNS line 280-292）
function findRowForDistrict(districtName) {
	if (!districtName) return null;
	const target = String(districtName).replace(/臺/g, "台").trim();
	for (const [, row] of store.scoreByDistrict) {
		const candidate = String(row.district).replace(/臺/g, "台").trim();
		if (candidate === target) return row;
	}
	return null;
}

// 拆掉現有 popup（Vue app + Mapbox popup 都要清）— Concern 3：unmount 必須先於 remove
function teardownPopup() {
	if (popupApp) {
		try {
			popupApp.unmount();
		} catch {
			/* 已 unmount 或 mount 失敗 — 略過 */
		}
		popupApp = null;
	}
	if (popup) {
		try {
			popup.remove();
		} catch {
			/* 已被 Mapbox 內部移除 — 略過 */
		}
		popup = null;
	}
}

// 建立 popup（D-06 / D-07）— cursor-anchored，body 用 createApp(DistrictPopup, props).mount(div)
function buildPopup(lngLat, districtName) {
	// 1. 先把舊的清掉（換區時也走這裡）
	teardownPopup();

	// 2. store 找 row（找不到也不要爆 — DistrictPopup 內 fmt() 會顯示 "—"）
	const row = findRowForDistrict(districtName);

	// 3. spawn Mapbox Popup（D-07：anchor: 'bottom', closeButton: false, cursor-anchored）
	popup = new mapboxGl.Popup({
		closeButton: false,
		closeOnClick: false,
		anchor: "bottom",
		offset: 12,
	})
		.setLngLat(lngLat)
		.setHTML('<div id="crosscompare-popup-mount"></div>')
		.addTo(map);

	// 4. 等 DOM 真的進文件樹再 mount Vue body（D-06 + Concern 3）
	nextTick(() => {
		// 競態防呆：teardownPopup 在 nextTick 排程後但 mount 之前被呼叫（快速移開游標）
		if (!popup) return;
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

// mousemove handler — D-23：rapid mousemove coalesce
function onMouseMove(e) {
	if (!map || !e.features?.length) return;
	const feature = e.features[0];
	const districtName = feature.id;   // promoteId: TNAME → feature.id 是 district 名稱
	if (!districtName) return;

	// belt-and-braces：D-11 disabledDistricts 二次防線（事件其實已被 D-12 結構性過濾）
	if (store.disabledDistricts?.has?.(districtName)) return;

	if (hoveredFeatureId !== districtName) {
		// 換區了 — 清舊區、設新區
		setHover(hoveredFeatureId, false);   // hoveredFeatureId === null 時 setHover 內部 early-return
		setHover(districtName, true);
		hoveredFeatureId = districtName;
		buildPopup(e.lngLat, districtName);
	} else if (popup) {
		// 同一區 — 只更新 popup 跟著游標走（D-07 cursor-anchored）
		popup.setLngLat(e.lngLat);
	}
}

// mouseenter — D-13：active layer 進入時換成手指游標
function onMouseEnter() {
	if (map) map.getCanvas().style.cursor = "pointer";
}

// mouseleave — 清 hover state + 清 popup + 還原游標
function onMouseLeave() {
	if (map) map.getCanvas().style.cursor = "";
	setHover(hoveredFeatureId, false);
	hoveredFeatureId = null;
	teardownPopup();
}
```

**Constraints (do NOT violate):**
- Module-scope `let` bindings (NOT `ref(...)`) — match the existing `let map = null;` pattern at line 38. Vue's reactive proxy interferes with Mapbox internal state for `map` (Phase 2 D-04 noted); same caution applies to popup instances.
- The order matters: `popupApp.unmount()` BEFORE `popup.remove()` — unmounting after the DOM is gone is technically safe but generates a Vue dev warning (Concern 3).
- The `nextTick` race-guard (`if (!popup) return;`) inside the callback is mandatory — `teardownPopup()` may run between `setHTML(...)` and the nextTick callback if the user flicks the cursor away in the same frame.
- Do NOT call `setFeatureState` for `districtName === null` — the `setHover` early-return guard handles this.
- The defensive `store.disabledDistricts?.has?.(...)` check is belt-and-braces. D-12's layer-scoped binding means the events should NOT fire on greyed features anyway, but the guard is cheap and prevents footguns from any future addition that re-binds events to the greyed layer accidentally.
- Hard tabs.
- Do NOT touch `applyEnabledFilter`, `applyActivePaint`, `addCrossCompareSource`, `addCrossCompareLayers`, `probeJoinKey`, the `onMounted` hook, or the existing watchers — Task 3 will only touch `onBeforeUnmount` (line 190-201) and add `map.on(...)` calls inside the existing `map.on("load", ...)` callback.
  </action>

  <verify>
    <automated>cd Taipei-City-Dashboard-FE && npm run build 2>&1 | tail -20 | grep -E "built in|exit" || echo "BUILD_FAILED"</automated>
    <gates>
      - `grep -c "let hoveredFeatureId\|let popup\|let popupApp" Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` ≥ 3
      - `grep -c "setFeatureState" Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` ≥ 1
      - `grep -c "createApp(DistrictPopup" Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` ≥ 1
      - `grep -c "popupApp.unmount\|popup.remove" Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` ≥ 2
      - `grep -c "function setHover\|function buildPopup\|function teardownPopup\|function onMouseMove\|function onMouseEnter\|function onMouseLeave" Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` ≥ 6
      - `grep -c "disabledDistricts" Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` ≥ 1
      - `grep -c "nextTick" Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` ≥ 1
      - `cd Taipei-City-Dashboard-FE && npm run build` exit 0
    </gates>
  </verify>

  <acceptance_criteria>
    - Three module-scope `let` bindings declared (hoveredFeatureId, popup, popupApp).
    - Six functions defined (setHover, findRowForDistrict, teardownPopup, buildPopup, onMouseMove, onMouseEnter, onMouseLeave).
    - `popupApp.unmount()` runs BEFORE `popup.remove()` in `teardownPopup`.
    - `nextTick` race-guard (`if (!popup) return;`) is present.
    - `disabledDistricts?.has?.(...)` belt-and-braces guard is present.
    - Build passes; no eslint warnings.
    - Existing functions (`applyEnabledFilter`, `applyActivePaint`, etc.) unchanged.
  </acceptance_criteria>

  <done>
Hover handler infrastructure (state + helpers) is in scope. Functions exist but are not yet bound to map events — Task 3 wires them.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Bind layer-scoped hover events + extend onBeforeUnmount teardown in CrossCompareView.vue</name>
  <files>Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue</files>

  <read_first>
    - .planning/phases/03-hover-interaction-polish/03-CONTEXT.md (D-12 — bind to active layer ONLY; D-14 / D-22 — extend teardown)
    - .planning/phases/03-hover-interaction-polish/03-PATTERNS.md (section "Event-binding pattern" + "Teardown extension" — verbatim insertions)
    - Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue lines 171-183 (existing `map.on("load", ...)` callback — append events HERE, after `map.once("idle", probeJoinKey);` at line 182)
    - Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue lines 190-201 (existing `onBeforeUnmount` block — extend HERE)
  </read_first>

  <action>
**Per D-12 (event binding to active layer ONLY) + D-14 / D-22 (teardown extension).** Two edits.

**Edit 1 — bind events INSIDE the existing `map.on("load", () => { ... })` callback** at line 171-183. Read the closing point of that callback first (currently line 183 `});`). Insert the event-binding block AFTER `map.once("idle", probeJoinKey);` at line 182, BEFORE the closing `});` at line 183.

Verbatim insertion (tab-indented to match the surrounding callback body which is one tab deeper than the function):

```js

		// CC-04 — events bound to active layer ONLY (D-12)
		// 結構性保證：crosscompare_fill_greyed 不接 hover，所以「greyed 區域 hover 不觸發任何反應」
		// 是事件層的 invariant，不靠 Vue 端 disabledDistricts guard（後者只是 belt-and-braces）
		map.on("mousemove", CROSSCOMPARE_FILL_LAYER_ID, onMouseMove);
		map.on("mouseenter", CROSSCOMPARE_FILL_LAYER_ID, onMouseEnter);
		map.on("mouseleave", CROSSCOMPARE_FILL_LAYER_ID, onMouseLeave);
```

After this edit the `map.on("load", ...)` block looks like:

```js
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

		// CC-04 — events bound to active layer ONLY (D-12)
		// 結構性保證：crosscompare_fill_greyed 不接 hover，所以「greyed 區域 hover 不觸發任何反應」
		// 是事件層的 invariant，不靠 Vue 端 disabledDistricts guard（後者只是 belt-and-braces）
		map.on("mousemove", CROSSCOMPARE_FILL_LAYER_ID, onMouseMove);
		map.on("mouseenter", CROSSCOMPARE_FILL_LAYER_ID, onMouseEnter);
		map.on("mouseleave", CROSSCOMPARE_FILL_LAYER_ID, onMouseLeave);
	});
```

**Edit 2 — extend `onBeforeUnmount`** at lines 190-201. The current block reads:

```js
onBeforeUnmount(() => {
	// D-04：view 持有 map 實例 → 必須親手清掉，避免 Mapbox WebGL context 漏（Phase 3 hover 處理也仰賴此）
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

Insert popup teardown BEFORE the `if (map)` block (popup must be removed BEFORE map.remove() — Mapbox internally removes its popups when the map is destroyed, but doing so cleanly under our control avoids dangling `popupApp`):

Final block:

```js
onBeforeUnmount(() => {
	// CC-04 — 先清 popup（Vue app + Mapbox popup），再 remove map（D-14 / D-22 / Concern 3）
	teardownPopup();
	hoveredFeatureId = null;

	// D-04：view 持有 map 實例 → 必須親手清掉，避免 Mapbox WebGL context 漏（Phase 3 hover 處理也仰賴此）
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

**Constraints:**
- Do NOT remove the existing `try { map.remove(); } catch {}` — Phase 2 D-04 / T-02-04-03 mitigation. Preserve.
- Do NOT bind events to `CROSSCOMPARE_GREY_LAYER_ID` or `CROSSCOMPARE_GREY_LINE_LAYER_ID` or `CROSSCOMPARE_EXTRUSION_LAYER_ID` — events go ONLY on `CROSSCOMPARE_FILL_LAYER_ID` per D-12. Binding to the extrusion layer would be redundant (the extrusion layer renders OVER the fill, but Mapbox's hit-testing for `fill-extrusion` returns the extruded feature; binding to the flat fill is sufficient because at rest the extrusion has zero height and doesn't intercept; once hovered, the user is already inside `fill_active` so the events keep firing on it).
- Do NOT use `map.off(...)` in `onBeforeUnmount` — `map.remove()` tears down all listeners internally. Adding explicit `off` is redundant and risks double-cleanup races.
- Hard tabs.
- The order in `onBeforeUnmount` is critical: `teardownPopup()` BEFORE `map.remove()`. Reverse order works most of the time but produces dev-mode Vue warnings about unmounting after the DOM is gone.
  </action>

  <verify>
    <automated>cd Taipei-City-Dashboard-FE && npm run build 2>&1 | tail -20 | grep -E "built in|exit" || echo "BUILD_FAILED"</automated>
    <gates>
      - `grep -c "map.on(\"mousemove\"" Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` ≥ 1
      - `grep -c "map.on(\"mouseenter\"" Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` ≥ 1
      - `grep -c "map.on(\"mouseleave\"" Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` ≥ 1
      - `grep -c "CROSSCOMPARE_FILL_LAYER_ID" Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` ≥ 4 (1 import + 1 addLayer + 1 setFilter + 3 event bindings = 6 — gate of 4 is conservative)
      - `grep -c "CROSSCOMPARE_GREY_LAYER_ID" Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` should NOT increase (no events bound to greyed layer)
      - `grep -c "teardownPopup()" Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` ≥ 4 (called from buildPopup + onMouseLeave + onBeforeUnmount + the function declaration itself)
      - The line BEFORE `map.remove()` in `onBeforeUnmount` is `teardownPopup();` — visually verify
      - `cd Taipei-City-Dashboard-FE && npm run build` exit 0
    </gates>
  </verify>

  <acceptance_criteria>
    - Three `map.on(...)` event bindings inside the `map.on("load", ...)` callback, scoped to `CROSSCOMPARE_FILL_LAYER_ID`.
    - `onBeforeUnmount` extended: `teardownPopup()` runs first, then existing `map.remove()` block.
    - No events bound to greyed/extrusion layers.
    - Build passes.
    - Plan's full feature delivery: hovering 中正區 in 雙北 view lifts it 4000m + popup `中正區 / #1 / 63.9 / 課程 28.1 / 抽查 35.8`. Hovering 烏來區 in 台北 view does NOTHING.
  </acceptance_criteria>

  <done>
Hover handler is fully wired. `npm run build` exits 0. CC-04 acceptance #1 + #2 are CODE-EVIDENT (browser smoke deferred to Plan 03-05).
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Mapbox vector tile (`metrotaipei_town`) → `feature.id` (district name string) → `setFeatureState` ID + popup `districtName` prop | Untrusted external string flows into Mapbox API + Vue prop. Mapbox `setFeatureState` only stores the value; never executes. Vue mustache escapes by default in DistrictPopup (mitigated in Plan 03-02 / D-21). |
| `e.lngLat` from mousemove → Mapbox Popup `setLngLat` | Trusted Mapbox internal coordinate; not a user-controlled string. |
| `store.scoreByDistrict` (Map from BE) → DistrictPopup numeric props | Trusted-but-validated: Phase 2 store guards via `Number.isFinite`. Plan 03-02's `fmt()` re-guards defensively. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-04-01 (T-XSS) | Spoofing / Tampering | District name from vector tile reaches `<h3>{{ districtName }}</h3>` in popup | mitigate | Vue mustache escape (delegated to Plan 03-02 / D-21). Phase 3 plan 03-04 only flows the string through `createApp(DistrictPopup, { districtName, ... })` — no DOM concatenation, no `innerHTML`, no `v-html`. Verified by grep gate `grep -c "v-html\|innerHTML\|outerHTML" CrossCompareView.vue == 0`. |
| T-03-04-02 (T-LEAK) | DoS / Resource exhaustion | Vue app instance + Mapbox popup not unmounted on view leave → WebGL/Vue memory leak after a few /crosscompare visits | mitigate | `teardownPopup()` always pairs `popupApp.unmount()` with `popup.remove()` in that order. Called from BOTH `onMouseLeave` (per-hover cleanup) AND `onBeforeUnmount` (view-level cleanup, runs BEFORE `map.remove()`). Concern 3 explicitly fixes the latent leak in `mapStore.js` precedent. Manual smoke (deferred to Plan 03-05): navigate `/crosscompare → /dashboard → /crosscompare → /mapview` ×5 and confirm no `WebGL: too many active contexts` console warnings. |
| T-03-04-03 (T-REENT) | DoS / Race | Rapid mousemove fires `setFeatureState` → Mapbox repaint storm → frame drops; or `nextTick` callback runs after `teardownPopup()` and double-mounts | mitigate | Re-entrancy coalesce: `setFeatureState` only fires when `hoveredFeatureId !== districtName` (D-23 / Concern 1). Same-district mousemoves only update popup `setLngLat`. The `nextTick` callback guards with `if (!popup) return;` — if user flicked away between `setHTML` and the next tick, mount is skipped. |
| T-03-04-04 | Tampering / Bypass of D-11 | If a future commit accidentally also binds events to `CROSSCOMPARE_GREY_LAYER_ID`, hover-on-greyed becomes interactive (D-11 violation) | mitigate | Structural enforcement via D-12: events bound ONLY to `CROSSCOMPARE_FILL_LAYER_ID`. Defensive belt-and-braces guard via `store.disabledDistricts?.has?.(districtName)` early-return in `onMouseMove`. CI gate: `grep -c "map.on(\"mouse.*\", CROSSCOMPARE_GREY_LAYER_ID" CrossCompareView.vue == 0` (should never appear). |
| T-03-04-05 | Information Disclosure | Popup might leak fields not intended (e.g. accidentally render entire row JSON) | mitigate | Plan 03-04 passes only 5 props from row to DistrictPopup: `districtName, rank, totalScore, courseScore, inspectionScore`. The other row fields (`courses`, `food_businesses`, `inspected`, `not_inspected`, `inspection_rate`, `city`) are NOT passed (D-09). Code review + grep gate confirm. |
| T-03-04-06 | Repudiation | None | n/a | — |

**Block-on severity:** T-03-04-02 (T-LEAK) is HIGH — Concern 3 documented this as a load-bearing fix vs the existing `mapStore.js` pattern. Verification gate: `grep -c "popupApp.unmount\|popup.remove" CrossCompareView.vue` ≥ 2 must pass at every commit touching this code.
</threat_model>

<verification>
- `npm run build` exit 0
- `grep -c "setFeatureState" Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` ≥ 2 (setHover function: 1 declaration usage)
- `grep -c "createApp(DistrictPopup" Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` ≥ 1
- `grep -c "popup.remove\|popupApp.unmount" Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` ≥ 2 (T-03-04-02 mitigation)
- `grep -c "map.on(\"mouse" Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` ≥ 3 (mousemove + mouseenter + mouseleave)
- `grep -c "promoteId\|setFeatureState\|fill-extrusion-height" Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` ≥ 3 (CONTEXT-mandated multi-token gate)
- `grep -c "v-html\|innerHTML\|outerHTML" Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` == 0 (T-03-04-01 mitigation — XSS-safe)
- `grep -c "CROSSCOMPARE_GREY_LAYER_ID" Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` should equal Phase 2 baseline + 0 (no NEW occurrences for event binding — only Phase 2's `applyEnabledFilter` + `addCrossCompareLayers` references)
- `grep -c "disabledDistricts" Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` ≥ 1 (belt-and-braces guard)
- `grep -c "hoveredFeatureId !== districtName" Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` ≥ 1 (D-23 coalesce)
- `grep -c "teardownPopup\(\)" Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` ≥ 4 (declaration + 3 callsites: buildPopup, onMouseLeave, onBeforeUnmount)
- D-20 boundary: `git diff` against this plan shows ZERO changes to mapStore.js, mapConfig.js, mapStyle.js, crossCompareStore.js, ViewToggle.vue, RampLegend.vue, router/index.js, NavBar.vue
</verification>

<success_criteria>
- 1 file modified (~80 LOC added).
- All hover behavior in code: feature-state flip, layer-scoped events, popup mount with createApp, cursor toggle, re-entrancy coalesce, defensive disabledDistricts guard, paired unmount+remove cleanup.
- Build passes.
- CC-04 acceptance #1 (hover lift + popup) and #2 (hover-on-greyed = nothing) are CODE-EVIDENT — manual browser smoke is the only thing left, deferred to Plan 03-05.
- The latent leak in `mapStore.js` precedent is NOT replicated here (Concern 3 fix).
</success_criteria>

<output>
After completion, create `.planning/phases/03-hover-interaction-polish/03-04-SUMMARY.md` recording:
- file modified + final line-count delta
- 6 functions added (setHover, findRowForDistrict, teardownPopup, buildPopup, onMouseMove, onMouseEnter, onMouseLeave) — note: setHover is small enough to count as a helper alongside the 5 main hover-flow functions, total 6
- 3 module-scope `let` bindings added
- 3 `map.on` event bindings (all to `CROSSCOMPARE_FILL_LAYER_ID`)
- onBeforeUnmount extended with `teardownPopup()` BEFORE `map.remove()`
- gate evidence (grep counts above) and `npm run build` exit code
- D-IDs honoured: D-01, D-04, D-06, D-07, D-08, D-09, D-11, D-12, D-13, D-14, D-21, D-22, D-23
- threat-mitigation note: T-03-04-02 (T-LEAK) explicitly fixed via paired unmount+remove (vs mapStore.js precedent which leaks)
- explicit handoff to Plan 03-05: "Browser smoke is the only thing left for CC-04 acceptance #1 and #2 — deferred per Phase 2 STATE.md Vite cache blocker."
</output>
</content>
</invoke>