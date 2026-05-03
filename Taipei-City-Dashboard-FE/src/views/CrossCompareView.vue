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
import { onMounted, onBeforeUnmount, watch, createApp, nextTick } from "vue";
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
	CROSSCOMPARE_EXTRUSION_LAYER_ID,
	buildFillPaint,
	buildGreyPaint,
	buildLinePaint,
	buildExtrusionPaint,
} from "../assets/configs/crossCompareConfig";
import ViewToggle from "../components/crosscompare/ViewToggle.vue";
import RampLegend from "../components/crosscompare/RampLegend.vue";
import TypeSelector from "../components/crosscompare/TypeSelector.vue";
import DistrictPopup from "../components/crosscompare/DistrictPopup.vue";

const store = useCrossCompareStore();

// 地圖實例由本 view 持有（D-04）— 不寫進 ref，避免 Vue reactive proxy 干擾 Mapbox 內部狀態
let map = null;
let styleLoaded = false;

// CC-04 hover state — top-level let bindings (D-22 — managed in onBeforeUnmount cleanup)
let hoveredFeatureId = null;       // 當前 hover 中的 district 名稱（promoteId: TNAME → feature.id）
let popup = null;                   // Mapbox Popup instance — null when not hovering
let popupApp = null;                // Vue 3 app instance — null when not hovering

// Mapbox setFilter helper — 啟用區用 in 過濾，停用區用反向
function applyEnabledFilter() {
	if (!map || !styleLoaded) return;
	const names = store.enabledDistrictNames;
	const inExpr = ["in", ["get", CROSSCOMPARE_JOIN_KEY], ["literal", names]];
	// active layer 只畫啟用區
	if (map.getLayer(CROSSCOMPARE_FILL_LAYER_ID)) {
		map.setFilter(CROSSCOMPARE_FILL_LAYER_ID, inExpr);
	}
	// extrusion layer 也只畫啟用區（否則 height=0 的彩色頂面會蓋過 greyed fill；
	//   bug：選台北時新北仍會看到色彩 — 修正為和 active fill 同樣的 in-filter）
	if (map.getLayer(CROSSCOMPARE_EXTRUSION_LAYER_ID)) {
		map.setFilter(CROSSCOMPARE_EXTRUSION_LAYER_ID, inExpr);
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

// 隱藏 base style 中除了 background 以外的所有圖層 — 跨區比較只想要看到行政區，
// 不要看到山脈 / 河川 / 道路 / 建物等基礎圖資。在 style.load 之後、addLayer 之前呼叫。
function hideBaseLayers() {
	if (!map) return;
	const layers = map.getStyle()?.layers || [];
	for (const layer of layers) {
		if (layer.id === "background") continue;
		// 只動 base style 的圖層，跳過任何 crosscompare_* 圖層（保險：執行順序保證它們此時還沒加進來）
		if (layer.id.startsWith("crosscompare_")) continue;
		try {
			map.setLayoutProperty(layer.id, "visibility", "none");
		} catch {
			// 某些圖層可能沒有 layout — 忽略
		}
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

	// 4. extrusion layer (上層) — D-02：與 active fill 共生，由 feature-state.hover 驅動
	//    paint 表達式 + transition 一併設定；JS 端只透過 setFeatureState 改 hover 狀態（Plan 03-04）
	//    rest 時 fill-extrusion-height = 0 → 視覺上與 Phase 2 平面 fill 完全一致
	map.addLayer({
		...baseLayer,
		id: CROSSCOMPARE_EXTRUSION_LAYER_ID,
		type: "fill-extrusion",
		paint: buildExtrusionPaint(store.rampDomain, store.scoreByDistrict),
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
			console.warn(
				`[crosscompare] vector tile feature缺少 ${CROSSCOMPARE_JOIN_KEY} 欄位；可用 keys=`,
				Object.keys(sample.properties || {}),
			);
		}
	} catch (err) {
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
		// 先把 base style 圖層通通藏起來（user 不想看到 山脈 / 河川 / 道路 / 建物 等基礎圖資）
		hideBaseLayers();
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

	// 4. 同時拉資料（不等地圖 load — 讓兩條軌道並行）
	await store.fetchScores();
	// fetchScores 完之後 watcher 會被 store 變化喚醒；此處不必再呼叫
});

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

// selectedTypes 改變 → 重新跟 BE 拿分數（會跑 TWCC，失敗則回 JSON fallback）
// scores 更新後 watcher 會自動 fire 上面的 applyActivePaint + applyEnabledFilter
watch(
	() => store.selectedTypes,
	(next, prev) => {
		// Pinia 會 emit 即使 reference 改變但內容相同 — 用字串比對 short-circuit
		if (
			prev &&
			next.length === prev.length &&
			next.every((t, i) => t === prev[i])
		) {
			return;
		}
		store.fetchScores();
	},
	{ deep: true },
);

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
// 但 hover 端不知 city，故線性掃 + inline 臺→台 normalisation（PATTERNS line 280-292）
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
</script>

<template>
  <div class="crosscompare">
    <!-- #crosscompareMapBox needs to be empty to ensure Mapbox performance -->
    <div id="crosscompareMapBox" />
    <ViewToggle class="crosscompare__toggle" />
    <TypeSelector class="crosscompare__types" />
    <RampLegend
      class="crosscompare__legend"
      :domain="store.rampDomain"
      label="total_score"
    />
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

	&__toggle {
		position: absolute;
		top: var(--font-m);
		left: var(--font-m);
		z-index: 2;
	}

	&__types {
		position: absolute;
		top: var(--font-m);
		right: var(--font-m);
		z-index: 2;
	}

	&__legend {
		position: absolute;
		bottom: var(--font-m);
		right: var(--font-m);
		z-index: 2;
	}
}
</style>
