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
	} catch {
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
			} catch {
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
	},
});
