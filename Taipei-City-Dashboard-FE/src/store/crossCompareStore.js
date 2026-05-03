// Developed by Taipei Urban Intelligence Center 2023-2024

/* crossCompareStore */
/*
crossCompareStore 直接讀靜態 JSON (public/mapData/district_combined_scores.json)
取得各區分數，依勾選的 selectedTypes 在 15 種 combination 中查 row。
本 store 只管資料；地圖實例由 CrossCompareView.vue 持有 (D-04 / D-05)。
切換 view mode 不需要重新讀檔（已 cache 在 module 層）。
*/

import { defineStore } from "pinia";
import {
	normalizeDistrictKey,
	CROSSCOMPARE_BASE_TYPE_VALUES,
} from "../assets/configs/crossCompareConfig";

// JSON 檔案在 Vite 的 public/ 下，dev / prod 都會被 serve 在 /mapData/
const SCORES_JSON_URL = "/mapData/district_combined_scores.json";

// Module-scope cache — 整支檔案只 fetch 一次，後續切換 type / view 都直接 lookup
let scoresCache = null;
let scoresCachePromise = null;

// 4 維度的 normalize max — mirror BE app/services/foodsafety/data.go NORM_BASE
// 也存在於 JSON 的 meta.normalization；此處 hardcode 是讓 derive 不依賴 file load 時序
const NORM_MAX = {
	"課程": 59,
	"檢驗": 16.4557,
	"癌症篩檢": 403,
	"優良評核": 307,
};

function round2(v) {
	if (!Number.isFinite(v)) return 0;
	return Math.round(v * 100) / 100;
}

// 拿 raw row 衍生出 4 維度的 0-100 normalized score — 對應 popup 的 course_score / inspection_score 等
function deriveRow(raw) {
	return {
		...raw,
		course_score: round2((Number(raw.courses) || 0) / NORM_MAX["課程"] * 100),
		inspection_score: round2(
			(Number(raw.inspection_rate) || 0) / NORM_MAX["檢驗"] * 100,
		),
		cancer_score: round2(
			(Number(raw.cancer_clinics) || 0) / NORM_MAX["癌症篩檢"] * 100,
		),
		excellent_score: round2(
			(Number(raw.excellent_count) || 0) / NORM_MAX["優良評核"] * 100,
		),
	};
}

// 在 cache 的 combinations[] 找出符合 selectedTypes 的那一組
// 比較規則：去重 + sort 後 element-wise 相等（mirror BE normalizeTypes + equalSortedTypes）
function findCombination(cache, selectedTypes) {
	if (!cache || !Array.isArray(cache.combinations)) return null;
	const want = [...new Set(selectedTypes)]
		.filter((t) => CROSSCOMPARE_BASE_TYPE_VALUES.includes(t))
		.sort();
	if (want.length === 0) return null;
	for (const combo of cache.combinations) {
		const have = [...combo.type].sort();
		if (have.length !== want.length) continue;
		if (have.every((t, i) => t === want[i])) return combo;
	}
	return null;
}

async function loadScoresCache() {
	if (scoresCache) return scoresCache;
	if (scoresCachePromise) return scoresCachePromise;
	scoresCachePromise = (async () => {
		const resp = await fetch(SCORES_JSON_URL, { cache: "force-cache" });
		if (!resp.ok) {
			throw new Error(
				`crossCompare scores HTTP ${resp.status} ${resp.statusText}`,
			);
		}
		const json = await resp.json();
		if (!json || !Array.isArray(json.combinations)) {
			throw new Error("crossCompare scores JSON is malformed");
		}
		scoresCache = json;
		return json;
	})();
	try {
		return await scoresCachePromise;
	} finally {
		scoresCachePromise = null;
	}
}

// localStorage 持久化用 key (D-09)
const STORAGE_KEY = "crossCompare.viewMode";
// viewMode 白名單 — 防止 localStorage 遭竄改後注入任意字串（threat T-02-02-01）
const VALID_VIEW_MODES = ["taipei", "metrotaipei"];
const DEFAULT_VIEW_MODE = "metrotaipei";

// 4 基本評分維度 — UI 多選後組成 BE 的 ?types= 參數；空集合視為「全選」
const TYPES_STORAGE_KEY = "crossCompare.selectedTypes";
const DEFAULT_SELECTED_TYPES = [...CROSSCOMPARE_BASE_TYPE_VALUES];

function readStoredViewMode() {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw && VALID_VIEW_MODES.includes(raw)) {
			return raw;
		}
	} catch {
		// localStorage 在 SSR / 隱私模式下可能無法存取 — 回到預設
	}
	return DEFAULT_VIEW_MODE;
}

function readStoredSelectedTypes() {
	try {
		const raw = localStorage.getItem(TYPES_STORAGE_KEY);
		if (!raw) return [...DEFAULT_SELECTED_TYPES];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [...DEFAULT_SELECTED_TYPES];
		// 白名單：丟掉非合法值，保留排序由後端來做
		const valid = parsed.filter((t) =>
			CROSSCOMPARE_BASE_TYPE_VALUES.includes(t),
		);
		// 全空時退回 default — UI 不允許 0 選，BE 也以 0 選視為「全選」
		return valid.length === 0 ? [...DEFAULT_SELECTED_TYPES] : valid;
	} catch {
		return [...DEFAULT_SELECTED_TYPES];
	}
}

export const useCrossCompareStore = defineStore("crossCompare", {
	state: () => ({
		// 從 BE 取得的原始 rows（snake_case 欄位保留）
		scores: [],
		// 當前檢視模式 — 'taipei' 或 'metrotaipei'（D-09，初始值由 initFromStorage 寫入）
		viewMode: DEFAULT_VIEW_MODE,
		// 當前評分維度（4 取 N，N >= 1）— BE 會 dedupe + sort 後對到 15 種 combination 之一
		selectedTypes: [...DEFAULT_SELECTED_TYPES],
		loading: false,
		error: false,
	}),
	getters: {
		// 啟用區的 row 子集 — viewMode='taipei' 只留 city === '台北市'（變體 normalize），
		// 其它 getter 都吃這個結果，所以切換 viewMode 時 ramp domain + paint 表達式
		// 會自動依當前可視區重新標定（user-visible：台北 view 的最暗/最亮會比 雙北 view 更分得開）
		enabledRows(state) {
			if (state.viewMode === "metrotaipei") return state.scores;
			return state.scores.filter((row) => {
				const c = String(row.city || "").replace(/臺/g, "台");
				return c === "台北市";
			});
		},
		// [min, max] of total_score；scores 為空時回 [0, 100] 讓 UI 不爆
		// 重要：只看 enabledRows — 切換 viewMode 時 ramp 會重新依當前視圖的子集做標定
		rampDomain() {
			const rows = this.enabledRows;
			if (!rows.length) return [0, 100];
			let min = Infinity;
			let max = -Infinity;
			for (const row of rows) {
				const s = Number(row.total_score);
				if (!Number.isFinite(s)) continue;
				if (s < min) min = s;
				if (s > max) max = s;
			}
			if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 100];
			return [min, max];
		},
		// Map<normalizedKey, row> — 供 view 端做色階 lookup
		// 只 include enabledRows — paint 表達式的 match 在停用區會 fallback，由 greyed 層接手
		scoreByDistrict() {
			const m = new Map();
			for (const row of this.enabledRows) {
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
		// 在 view onMounted 第一行呼叫 — 從 localStorage 還原 viewMode + selectedTypes
		initFromStorage() {
			this.viewMode = readStoredViewMode();
			this.selectedTypes = readStoredSelectedTypes();
		},
		// 從靜態 JSON 取分數 — 第一次 fetch 後 module-scope cache，後續切換 types / view 都直接 lookup。
		// 對應 selectedTypes 找到 combinations[] 中的 row 集，然後 deriveRow 補上 4 維度的 *_score 欄位（popup 用）。
		async fetchScores() {
			this.loading = true;
			this.error = false;
			try {
				const cache = await loadScoresCache();
				const combo = findCombination(cache, this.selectedTypes);
				if (!combo) {
					console.warn(
						"[crossCompareStore] no combination matched",
						this.selectedTypes,
					);
					this.scores = [];
					return;
				}
				// all_districts_ranked 是 41 列；viewMode 過濾交給 enabled / disabled getter 做（D-18）
				const rows = Array.isArray(combo.all_districts_ranked)
					? combo.all_districts_ranked
					: [];
				this.scores = rows.map(deriveRow);
			} catch (err) {
				console.warn("[crossCompareStore] loadScores failed:", err);
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
				console.warn(`[crossCompareStore] rejected invalid viewMode: ${mode}`);
				return;
			}
			this.viewMode = mode;
			try {
				localStorage.setItem(STORAGE_KEY, mode);
			} catch {
				// 隱私模式下寫入失敗 — 不阻塞 UI
			}
		},
		// 切換評分維度集合 — 白名單 + 至少 1 個（UI 端要禁 0 選，store 也守一道）
		// 不會自動 fetch；caller (CrossCompareView watcher) 負責 trigger fetchScores
		setSelectedTypes(types) {
			if (!Array.isArray(types)) return;
			const valid = types.filter((t) =>
				CROSSCOMPARE_BASE_TYPE_VALUES.includes(t),
			);
			if (valid.length === 0) {
				console.warn("[crossCompareStore] rejected empty selectedTypes");
				return;
			}
			this.selectedTypes = valid;
			try {
				localStorage.setItem(TYPES_STORAGE_KEY, JSON.stringify(valid));
			} catch {
				// 隱私模式下寫入失敗 — 不阻塞 UI
			}
		},
	},
});
