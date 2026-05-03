// Developed by Taipei Urban Intelligence Center 2023-2024

/* crossCompareConfig.js
 * 跨區比較頁的色階、source id、join key、normalize 與 paint 表達式建構器。
 * 這個檔案存在的理由：
 *   - 集中管理 Phase 2 的視覺常數，讓 view 與 toggle/legend 透過 named import 取用
 *   - D-16：禁止修改 mapConfig.js — 所有 fill layer 描述必須住這裡
 *   - D-19：兩個 view mode 共用 metrotaipei_town 一個 source layer
 */

// ----------------------------------------------------------------------
// Environment branch (production geo_server vs localhost geojson)
// 與 mapConfig.js / mapStore.js 同邏輯：白名單 hostname 走 vector-tile，否則走 geojson
// ----------------------------------------------------------------------
const allowedDomains = ["citydashboard.taipei", "test-citydashboard.taipei"];
export const CROSSCOMPARE_HAS_SOURCE_LAYER =
	typeof window !== "undefined" &&
	allowedDomains.includes(window.location.hostname);

// ----------------------------------------------------------------------
// Source / layer ids (D-19: single source layer for both modes)
// ----------------------------------------------------------------------
// 唯一的 vector source id；mapStore.js 也用同樣的 id（不衝突，因為 CrossCompareView 用獨立的 mapboxgl.Map 實例）
export const CROSSCOMPARE_SOURCE_ID = "metrotaipei_town";
// 只有在 vector-tile (production) 模式才需要 source-layer；geojson 模式下 Mapbox 不接受
export const CROSSCOMPARE_SOURCE_LAYER = CROSSCOMPARE_HAS_SOURCE_LAYER
	? "metrotaipei_town"
	: undefined;
// CrossCompareView 加入 fill layer 時用的 layer id（避免與 mapConfig.js 既有的 line layer id 衝突）
export const CROSSCOMPARE_FILL_LAYER_ID = "crosscompare_fill_active";
export const CROSSCOMPARE_GREY_LAYER_ID = "crosscompare_fill_greyed";
export const CROSSCOMPARE_GREY_LINE_LAYER_ID = "crosscompare_line_greyed";

// ----------------------------------------------------------------------
// Extrusion layer (Phase 3 / CC-04 — hover-driven levitate)
// ----------------------------------------------------------------------
// 與 active fill 同層（同一個 source / source-layer）但 type:"fill-extrusion"，
// 由 feature-state.hover 驅動 fill-extrusion-height 在 0 ↔ EXTRUSION_HEIGHT_HOVER 之間切換。
// EXTRUSION_TRANSITION_MS < 200 滿足 CC-04 acceptance #1（150ms + 50ms 餘裕）。
export const CROSSCOMPARE_EXTRUSION_LAYER_ID = "crosscompare_extrusion_active";
export const EXTRUSION_HEIGHT_HOVER = 4000;     // 公尺（hover 時的 levitate 高度）
export const EXTRUSION_TRANSITION_MS = 150;     // < 200ms（D-04 + 預留餘裕）

// ----------------------------------------------------------------------
// Join key on vector tile features (D-13)
// 強烈假設為 TNAME — mapConfig.js lines 55 + 89 的 label layer 也用 ["get", "TNAME"]
// CrossCompareView load handler 還是會跑一次 runtime probe 確認，但 paint 表達式直接寫死 TNAME
// ----------------------------------------------------------------------
export const CROSSCOMPARE_JOIN_KEY = "TNAME";

// ----------------------------------------------------------------------
// Scoring dimensions (BE: app/services/foodsafety/data.go NORM_BASE)
// 4 base types — UI lets the user pick a non-empty subset (1-4) and the
// backend resolves to one of 15 type-combinations stored in
// district_combined_scores.json. Order is the canonical one used in the
// JSON file's combinations[] entries (sort by Chinese codepoint).
// ----------------------------------------------------------------------
export const CROSSCOMPARE_BASE_TYPES = [
	{ value: "課程", label: "課程", desc: "HACCP + 衛生講習課程數" },
	{ value: "檢驗", label: "檢驗", desc: "食品業者檢驗完成率" },
	{ value: "癌症篩檢", label: "癌症篩檢", desc: "六項癌症篩檢院所數總和" },
	{ value: "優良評核", label: "優良評核", desc: "衛生優良評核業者家數" },
];
export const CROSSCOMPARE_BASE_TYPE_VALUES = CROSSCOMPARE_BASE_TYPES.map(
	(t) => t.value,
);

// ----------------------------------------------------------------------
// Colour ramp (D-10) + greyed-out (D-11)
// ----------------------------------------------------------------------
export const CROSSCOMPARE_RAMP = {
	low: "#1a3a3f",       // 低分（深灰青）
	high: "#5dffe6",      // 高分（亮青）
	greyFill: "#3a3a3a",  // 停用區填色
	greyOpacity: 0.35,    // 停用區透明度
	greyLine: "#555555",  // 停用區邊線
	activeFillOpacity: 0.75,
};

// ----------------------------------------------------------------------
// Normalize 臺/台 + 空白（D-14） — 雙邊正規化以對齊 BE 與 vector tile
// ----------------------------------------------------------------------
export function normalizeDistrictKey(city, name) {
	if (!city || !name) return "";
	const c = String(city).replace(/臺/g, "台").trim();
	const n = String(name).replace(/臺/g, "台").trim();
	return `${c}|${n}`;
}

// ----------------------------------------------------------------------
// Paint-expression builders
// ----------------------------------------------------------------------

/**
 * 啟用區的 fill paint：
 *   1. ['match', ['get', 'TNAME'], 'X', scoreOfX, 'Y', scoreOfY, ..., -1]  → 每區查到 total_score（找不到回 -1）
 *   2. ['interpolate-hcl', ['linear'], <step1>, min, low, max, high]       → 將分數插值成顏色
 *
 * @param {[number, number]} domain  [min, max] of total_score
 * @param {Map<string, {city,district,total_score}>} scoreByDistrict
 *        normalizedKey -> row map (from store getter)
 * @returns Mapbox paint object
 */
export function buildFillPaint(domain, scoreByDistrict) {
	const [minVal, maxVal] = domain;
	// 防呆：domain 不合法時回退單色（避免 Mapbox 表達式 throw）
	if (
		!Number.isFinite(minVal) ||
		!Number.isFinite(maxVal) ||
		minVal === maxVal
	) {
		return {
			"fill-color": CROSSCOMPARE_RAMP.low,
			"fill-opacity": CROSSCOMPARE_RAMP.activeFillOpacity,
		};
	}

	// 用 district 名稱（TNAME）匹配 — vector tile 的 TNAME 不帶 city，所以
	// 兩個 city 同名區（"中正區" 同時存在於 臺北市/新北市? 沒有，但保險起見以 normalize 後的 district 名稱拼成 match arms）
	const matchArms = [];
	for (const [, row] of scoreByDistrict) {
		const districtName = String(row.district || "")
			.replace(/臺/g, "台")
			.trim();
		const score = Number(row.total_score);
		if (!districtName || !Number.isFinite(score)) continue;
		// Mapbox match: ["get", "TNAME"] 從 vector tile 拿原始字串（可能含臺）— 兩個變體都加進去
		matchArms.push(districtName, score);
		const traditional = districtName.replace(/台/g, "臺");
		if (traditional !== districtName) {
			matchArms.push(traditional, score);
		}
	}

	if (matchArms.length === 0) {
		return {
			"fill-color": CROSSCOMPARE_RAMP.low,
			"fill-opacity": CROSSCOMPARE_RAMP.activeFillOpacity,
		};
	}

	const scoreLookup = [
		"match",
		["get", CROSSCOMPARE_JOIN_KEY],
		...matchArms,
		-1,  // fallback：沒對到的 feature 回 -1（不會落在 [minVal, maxVal] 區間內，會被 interpolate clamp 到低端）
	];

	const colorExpression = [
		"interpolate-hcl",
		["linear"],
		scoreLookup,
		minVal,
		CROSSCOMPARE_RAMP.low,
		maxVal,
		CROSSCOMPARE_RAMP.high,
	];

	return {
		"fill-color": colorExpression,
		"fill-opacity": CROSSCOMPARE_RAMP.activeFillOpacity,
	};
}

/**
 * 停用區的 fill paint：純色 + 半透明（D-11）
 */
export function buildGreyPaint() {
	return {
		"fill-color": CROSSCOMPARE_RAMP.greyFill,
		"fill-opacity": CROSSCOMPARE_RAMP.greyOpacity,
	};
}

/**
 * 停用區的 line paint：細灰邊線（D-11）
 */
export function buildLinePaint() {
	return {
		"line-color": CROSSCOMPARE_RAMP.greyLine,
		"line-width": 0.6,
		"line-opacity": 0.6,
	};
}

/**
 * 啟用區的 fill-extrusion paint（CC-04）：
 *   - color  與 buildFillPaint() 一致（lifted top + sides 維持分數色，D-05）
 *   - height case-on-feature-state — hover ? EXTRUSION_HEIGHT_HOVER : 0（D-03）
 *   - transition 設在 paint property 上，由 Mapbox 內建 cubic 緩動（D-04）
 *
 * 注意（PATTERNS Concern 2）：fill-extrusion-height 必須是 case + feature-state；
 *   試圖靠 setPaintProperty(..., "fill-extrusion-height", 4000) 不會動畫。
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
