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
	CROSSCOMPARE_EXTRUSION_LAYER_ID,
	buildFillPaint,
	buildGreyPaint,
	buildLinePaint,
	buildExtrusionPaint,
} from "../assets/configs/crossCompareConfig";
import ViewToggle from "../components/crosscompare/ViewToggle.vue";
import RampLegend from "../components/crosscompare/RampLegend.vue";

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
</script>

<template>
  <div class="crosscompare">
    <!-- #crosscompareMapBox needs to be empty to ensure Mapbox performance -->
    <div id="crosscompareMapBox" />
    <ViewToggle class="crosscompare__toggle" />
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

	&__legend {
		position: absolute;
		bottom: var(--font-m);
		right: var(--font-m);
		z-index: 2;
	}
}
</style>
