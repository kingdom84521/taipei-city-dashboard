---
phase: 03-hover-interaction-polish
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js
  - Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue
autonomous: true
requirements: [CC-04]
tags: [crosscompare, mapbox, fill-extrusion, config]

must_haves:
  truths:
    - "crossCompareConfig.js exports CROSSCOMPARE_EXTRUSION_LAYER_ID, EXTRUSION_HEIGHT_HOVER (=4000), EXTRUSION_TRANSITION_MS (=150) (D-02, D-03, D-04)"
    - "crossCompareConfig.js exports buildExtrusionPaint(domain, scoreByDistrict) returning fill-extrusion-color/-opacity/-height/-height-transition (D-02, D-04, D-05)"
    - "buildExtrusionPaint's fill-extrusion-height is a case expression on ['feature-state','hover'] returning EXTRUSION_HEIGHT_HOVER on hover and 0 at rest (D-03 — paint-expression-driven, NOT setPaintProperty)"
    - "CrossCompareView.vue's addCrossCompareLayers() adds a fill-extrusion layer with id=CROSSCOMPARE_EXTRUSION_LAYER_ID ABOVE crosscompare_fill_active (D-02 — companion above existing flat fill, NOT replacement)"
    - "Existing flat fill / greyed fill / line layers untouched — Phase 2 D-19 single-source semantics preserved"
    - "npm run build exits 0; eslint clean"
  artifacts:
    - path: "Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js"
      provides: "Extrusion constants + buildExtrusionPaint()"
      contains: "CROSSCOMPARE_EXTRUSION_LAYER_ID"
      contains_2: "buildExtrusionPaint"
      contains_3: "EXTRUSION_HEIGHT_HOVER"
      contains_4: "EXTRUSION_TRANSITION_MS"
      contains_5: "fill-extrusion-height-transition"
    - path: "Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue"
      provides: "Extrusion companion layer in addCrossCompareLayers()"
      contains: "CROSSCOMPARE_EXTRUSION_LAYER_ID"
      contains_2: "fill-extrusion"
      contains_3: "buildExtrusionPaint"
  key_links:
    - from: "Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue"
      to: "Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js"
      via: "named imports"
      pattern: "from \"../assets/configs/crossCompareConfig\""
    - from: "addCrossCompareLayers"
      to: "buildExtrusionPaint"
      via: "paint argument on map.addLayer"
      pattern: "paint: buildExtrusionPaint\\("
---

<objective>
Add the Mapbox `fill-extrusion` companion layer plumbing — the paint-expression machinery that lets CC-04 hover lift a district from 0 m to 4000 m via `feature-state.hover` with a built-in 150 ms transition (D-02, D-03, D-04). This plan ships the **config-side primitives + the layer-add call only**. The hover handler that actually flips `setFeatureState` lives in Plan 03-04 (Wave 2).

The flat colour layer `crosscompare_fill_active` from Phase 2 stays in place untouched and continues to provide the choropleth colour at rest. The new extrusion layer sits ABOVE it and is invisible at rest (`fill-extrusion-height: 0`) — Phase 2's flat-fill rendering is visually identical when nothing is hovered (D-02).

Purpose: deliver the load-bearing primitive of CC-04 acceptance #1 ("transition < 200 ms"). Mapbox's built-in `fill-extrusion-height-transition` handles the easing; JS only flips `feature-state` (Plan 03-04). Per D-03 / Concern 2 in PATTERNS.md, height MUST animate via `case + feature-state`, NOT via `setPaintProperty` — this plan locks that contract in code.

Output: 2 files modified (1 config + 1 view), ~25 LOC added in config, ~6 LOC added in view. No new packages.
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
@.planning/phases/02-fe-cross-compare-page/02-CONTEXT.md
@.planning/phases/02-fe-cross-compare-page/02-06-SUMMARY.md
@./CLAUDE.md

# Files being edited (read in full before changing)
@Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js
@Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue

<interfaces>
<!-- crossCompareConfig.js EXISTING exports (Phase 2 — DO NOT TOUCH; Phase 3 only APPENDS) -->
From Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js (lines 16-157):
```js
export const CROSSCOMPARE_HAS_SOURCE_LAYER = ...;
export const CROSSCOMPARE_SOURCE_ID = "metrotaipei_town";
export const CROSSCOMPARE_SOURCE_LAYER = ...;
export const CROSSCOMPARE_FILL_LAYER_ID = "crosscompare_fill_active";
export const CROSSCOMPARE_GREY_LAYER_ID = "crosscompare_fill_greyed";
export const CROSSCOMPARE_GREY_LINE_LAYER_ID = "crosscompare_line_greyed";
export const CROSSCOMPARE_JOIN_KEY = "TNAME";
export const CROSSCOMPARE_RAMP = { low, high, greyFill, greyOpacity, greyLine };
export function normalizeDistrictKey(city, name) { ... }
export function buildFillPaint(domain, scoreByDistrict) { ... }   // returns { "fill-color", "fill-opacity" }
export function buildGreyPaint() { ... }
export function buildLinePaint() { ... }
```

<!-- CrossCompareView.vue EXISTING addCrossCompareLayers (lines 97-130) -->
```js
function addCrossCompareLayers() {
	if (!map) return;
	const baseLayer = {
		source: CROSSCOMPARE_SOURCE_ID,
		...(CROSSCOMPARE_SOURCE_LAYER ? { "source-layer": CROSSCOMPARE_SOURCE_LAYER } : {}),
	};
	// 1. greyed fill (下層)
	map.addLayer({ ...baseLayer, id: CROSSCOMPARE_GREY_LAYER_ID, type: "fill", paint: buildGreyPaint() });
	// 2. active fill (上層)
	const initialPaint = buildFillPaint(store.rampDomain, store.scoreByDistrict);
	map.addLayer({ ...baseLayer, id: CROSSCOMPARE_FILL_LAYER_ID, type: "fill", paint: initialPaint });
	// 3. greyed line (邊框)
	map.addLayer({ ...baseLayer, id: CROSSCOMPARE_GREY_LINE_LAYER_ID, type: "line", paint: buildLinePaint() });
}
```

<!-- CrossCompareView.vue EXISTING import block (lines 20-31) — Phase 3 must EXTEND it -->
```js
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
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Append extrusion constants + buildExtrusionPaint() to crossCompareConfig.js</name>
  <files>Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js</files>

  <read_first>
    - .planning/phases/03-hover-interaction-polish/03-CONTEXT.md (D-02 / D-03 / D-04 / D-05)
    - .planning/phases/03-hover-interaction-polish/03-PATTERNS.md (section "src/assets/configs/crossCompareConfig.js (EDIT — append extrusion constants + builder)" — verbatim insertion shapes; Concern 2 — case+feature-state mandatory)
    - Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js (read FULL — confirm current line 32 layer-id block end + line 157 file end before appending)
  </read_first>

  <action>
**Per D-02, D-03, D-04, D-05.** Append these blocks to `crossCompareConfig.js` — DO NOT modify any existing code; only APPEND. Hard tabs in the `<script>`-style indentation. Traditional Chinese inline comments to match Phase 2 style.

**Insertion point 1 — after the existing layer-id block ending at line 32** (immediately after `export const CROSSCOMPARE_GREY_LINE_LAYER_ID = "crosscompare_line_greyed";`):

```js

// ----------------------------------------------------------------------
// Extrusion layer (Phase 3 / CC-04 — hover-driven levitate)
// ----------------------------------------------------------------------
// 與 active fill 同層（同一個 source / source-layer）但 type:"fill-extrusion"，
// 由 feature-state.hover 驅動 fill-extrusion-height 在 0 ↔ EXTRUSION_HEIGHT_HOVER 之間切換。
// EXTRUSION_TRANSITION_MS < 200 滿足 CC-04 acceptance #1（150ms + 50ms 餘裕）。
export const CROSSCOMPARE_EXTRUSION_LAYER_ID = "crosscompare_extrusion_active";
export const EXTRUSION_HEIGHT_HOVER = 4000;     // 公尺（hover 時的 levitate 高度）
export const EXTRUSION_TRANSITION_MS = 150;     // < 200ms（D-04 + 預留餘裕）
```

**Insertion point 2 — at the END of the file (after `buildLinePaint` at line 157)** — append a JSDoc + `buildExtrusionPaint` function:

```js

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
```

**Constraints (do NOT violate):**
- Do NOT touch existing `buildFillPaint` / `buildGreyPaint` / `buildLinePaint` / `normalizeDistrictKey` / `CROSSCOMPARE_RAMP` — they are Phase 2 surface and locked.
- Do NOT add new external imports — `buildExtrusionPaint` reuses the in-file `buildFillPaint`.
- Hard tabs only. No spaces-for-indent.
- The `case` expression and `fill-extrusion-height-transition` are NOT optional — Concern 2 says swapping height imperatively will not animate.
  </action>

  <verify>
    <automated>cd Taipei-City-Dashboard-FE && npm run build 2>&1 | tail -20 | grep -E "built in|exit" || echo "BUILD_FAILED"</automated>
    <gates>
      - `grep -c "CROSSCOMPARE_EXTRUSION_LAYER_ID" Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js` ≥ 1
      - `grep -c "EXTRUSION_HEIGHT_HOVER" Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js` ≥ 2 (constant declaration + use inside builder)
      - `grep -c "EXTRUSION_TRANSITION_MS" Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js` ≥ 2
      - `grep -c "buildExtrusionPaint" Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js` ≥ 1
      - `grep -c "fill-extrusion-height-transition" Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js` ≥ 1
      - `grep -c "feature-state" Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js` ≥ 1
      - `cd Taipei-City-Dashboard-FE && npm run build` exit 0
    </gates>
  </verify>

  <acceptance_criteria>
    - File length grew by ~25 lines (existing 157 → ~182). No deletions.
    - Existing exports unchanged (`grep -c "buildFillPaint" crossCompareConfig.js` still ≥ 2 — declaration + buildExtrusionPaint reuse).
    - `npm run build` passes — eslint --fix runs clean (hard tabs preserved).
    - JSDoc on buildExtrusionPaint references D-03 + Concern 2 by intent (the `case` + `feature-state` requirement is explained inline so future maintainers don't try `setPaintProperty`).
  </acceptance_criteria>

  <done>
crossCompareConfig.js exports the four new symbols (CROSSCOMPARE_EXTRUSION_LAYER_ID, EXTRUSION_HEIGHT_HOVER, EXTRUSION_TRANSITION_MS, buildExtrusionPaint). All Phase 2 exports remain. npm run build exits 0.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Add fill-extrusion companion layer in CrossCompareView.vue addCrossCompareLayers()</name>
  <files>Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue</files>

  <read_first>
    - .planning/phases/03-hover-interaction-polish/03-CONTEXT.md (D-02 — companion layer ABOVE active fill, invisible at rest)
    - .planning/phases/03-hover-interaction-polish/03-PATTERNS.md (section "src/views/CrossCompareView.vue (EDIT — extrusion layer + hover handler …)" — extrusion-layer addition snippet)
    - Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue lines 14-33 (existing imports — must extend) and lines 97-130 (existing addCrossCompareLayers — must append)
  </read_first>

  <action>
**Per D-02 and D-05.** Two edits in `CrossCompareView.vue` — extend the import block, then APPEND a 4th `addLayer` call inside `addCrossCompareLayers()`. Hard tabs.

**Edit 1 — extend the named import from `crossCompareConfig` (current lines 20-31).** Add three new symbols to the existing import list. The exact change to the existing block (insert at the END of the import group, before `} from "../assets/configs/crossCompareConfig";`):

Add these lines (with leading tab) inside the existing `import { ... }`:
```js
	CROSSCOMPARE_EXTRUSION_LAYER_ID,
	EXTRUSION_HEIGHT_HOVER,
	EXTRUSION_TRANSITION_MS,
	buildExtrusionPaint,
```

(`EXTRUSION_HEIGHT_HOVER` / `EXTRUSION_TRANSITION_MS` are imported here even though only `buildExtrusionPaint` references their values — they're imported defensively because Plan 03-04's hover handler may want to read them too. ESLint's `no-unused-vars` would only fire if Plan 03-04 doesn't pull them through; safer to forward them now and let 03-04 prune if unused. **If linter complains in this plan, drop `EXTRUSION_HEIGHT_HOVER` and `EXTRUSION_TRANSITION_MS` from this import — keep only `CROSSCOMPARE_EXTRUSION_LAYER_ID` and `buildExtrusionPaint` for Task 2's needs.**)

After Task 2 the import block becomes:
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

(Order: layer-id constants first, then builders. Matches the Phase 2 idiom in this same import block.)

**Edit 2 — append a 4th `addLayer` call inside `addCrossCompareLayers()` after the existing layer #3 (line 124-129) and BEFORE the function's closing brace at line 130.** This is the highest-z layer — Mapbox renders layers in addLayer order; extrusion goes last so it sits above the line border.

Verbatim insertion (tab-indented to match the existing function body):

```js

	// 4. extrusion layer (上層) — D-02：與 active fill 共生，由 feature-state.hover 驅動
	//    paint 表達式 + transition 一併設定；JS 端只透過 setFeatureState 改 hover 狀態（Plan 03-04）
	//    rest 時 fill-extrusion-height = 0 → 視覺上與 Phase 2 平面 fill 完全一致
	map.addLayer({
		...baseLayer,
		id: CROSSCOMPARE_EXTRUSION_LAYER_ID,
		type: "fill-extrusion",
		paint: buildExtrusionPaint(store.rampDomain, store.scoreByDistrict),
	});
```

**Critical constraints (per CONTEXT.md and PATTERNS.md):**
- Do NOT replace the existing `crosscompare_fill_active` layer — D-02 says ADD a companion. The flat colour layer stays.
- Do NOT bind any events here — events go in Plan 03-04.
- Do NOT call `setFeatureState` here — that's Plan 03-04.
- Do NOT touch `applyEnabledFilter` (line 42) — the extrusion layer does not get a filter applied this phase. Whether to filter the extrusion layer in 台北 mode is moot because hover events bind only to the active fill layer (D-12), so the extrusion can technically render across all 41 districts at rest with `height: 0` and never visually surface. Concern 4 in PATTERNS.md confirms this.
- Do NOT add a watcher to update extrusion paint when `store.rampDomain` changes — that's a follow-up if visual parity matters; for v1 the extrusion's color matches the flat fill's INITIAL paint at mount, which is acceptable since the extrusion is invisible at rest. (If user reports a colour mismatch on hover after Phase 3 ships, address in a v2.4 patch.)
- Hard tabs.
  </action>

  <verify>
    <automated>cd Taipei-City-Dashboard-FE && npm run build 2>&1 | tail -20 | grep -E "built in|exit" || echo "BUILD_FAILED"</automated>
    <gates>
      - `grep -c "CROSSCOMPARE_EXTRUSION_LAYER_ID" Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` ≥ 2 (1 import + 1 use in addLayer)
      - `grep -c "buildExtrusionPaint" Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` ≥ 2 (import + call)
      - `grep -c "fill-extrusion" Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` ≥ 1
      - `grep -c "promoteId\|setFeatureState\|fill-extrusion-height" Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` ≥ 3 (promoteId from Phase 2 × 3 + this plan adds fill-extrusion via the helper but height itself lives in the helper file; setFeatureState arrives in 03-04 — at THIS plan's exit the count is ≥ 3 from Phase 2's promoteId hits alone, gate satisfied)
      - `cd Taipei-City-Dashboard-FE && npm run build` exit 0 (eslint clean — `no-unused-vars` will catch dead imports if any)
    </gates>
  </verify>

  <acceptance_criteria>
    - File grew by ~12 lines (4 new imports + 8-line addLayer block including comments). Existing layers (greyed fill, active fill, greyed line) untouched.
    - `addCrossCompareLayers` now adds 4 layers in order: greyed fill, active fill, greyed line, extrusion.
    - Build passes; no new ESLint warnings.
    - Browser visual at rest is identical to Phase 2 (extrusion height = 0).
  </acceptance_criteria>

  <done>
CrossCompareView.vue's addCrossCompareLayers() registers the fill-extrusion companion layer using buildExtrusionPaint(). All 4 layers attach on style.load. npm run build exits 0.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Mapbox vector tile → Mapbox renderer | Untrusted external tile data (`metrotaipei_town`) reaches the GPU only via Mapbox's parser; Phase 3 paint expressions are static strings/numbers — no user input flows here. |
| crossCompareConfig.js (pure module) → CrossCompareView.vue | In-process module boundary; no IPC. The exported numerics (4000, 150) are constants — not derived from any user input. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-01-01 | Tampering | `EXTRUSION_HEIGHT_HOVER` constant misused (e.g. set to a NaN or huge value via accidental edit, causing GPU OOM) | accept | Constant is a numeric literal in source; protected by code review + ESLint. CI build catches NaN-typed constants. ASVS L1 does not require runtime constant validation for compile-time literals. |
| T-03-01-02 | Denial of Service | Mapbox `fill-extrusion` layer at `height: 0` for all 41 features still costs GPU memory at rest (latent perf regression on low-end devices) | accept | `fill-extrusion` with constant 0 height is GPU-cheap; Mapbox skips actual extrusion when height equals 0. Manual smoke on user's machine in Plan 03-05 will confirm. No remediation needed unless smoke flags lag. |
| T-03-01-03 | Information Disclosure | None — no user data, no PII in paint expressions or constants | n/a | Constants are public visualisation parameters. |
| T-03-01-04 | Repudiation / Spoofing | None applicable (no auth, no audit log surface) | n/a | — |

**Block-on severity:** none. All threats accept-able; none mitigate-required for ASVS L1.
</threat_model>

<verification>
- `npm run build` exits 0
- `grep -c "CROSSCOMPARE_EXTRUSION_LAYER_ID\|buildExtrusionPaint\|EXTRUSION_HEIGHT_HOVER\|EXTRUSION_TRANSITION_MS" Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js` ≥ 6 (4 constants + 1 function declaration + 1 function body reference)
- `grep -c "fill-extrusion-height-transition" Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js` ≥ 1
- `grep -c "feature-state" Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js` ≥ 1
- `grep -c "fill-extrusion" Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` ≥ 1
- `grep -c "type: \"fill-extrusion\"" Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` ≥ 1
- Phase 2 surface in CrossCompareView.vue untouched: `grep -c "applyEnabledFilter\|applyActivePaint\|probeJoinKey" CrossCompareView.vue` ≥ 3 (all three functions still present)
- D-20 boundary: `git diff` against this plan shows ZERO changes to mapStore.js, mapConfig.js, mapStyle.js, crossCompareStore.js, ViewToggle.vue, RampLegend.vue, router/index.js, NavBar.vue
</verification>

<success_criteria>
- Two files modified, ~37 LOC added total (config: ~25, view: ~12).
- All four new exports present and importable.
- Build passes.
- No semantic change to flat-fill rendering (extrusion is invisible at rest until Plan 03-04 wires `setFeatureState`).
- Plan 03-04 can `import` `CROSSCOMPARE_EXTRUSION_LAYER_ID` (not strictly needed by 03-04 — events bind to `CROSSCOMPARE_FILL_LAYER_ID`, not the extrusion — but exported for symmetry / future).
</success_criteria>

<output>
After completion, create `.planning/phases/03-hover-interaction-polish/03-01-SUMMARY.md` recording:
- the two files modified with line counts
- the four new exported symbols and their values (4000 m, 150 ms)
- gate evidence (grep counts above) and `npm run build` exit code
- D-IDs honoured: D-02, D-03, D-04, D-05
- a one-line statement that Plan 03-04 will consume `buildExtrusionPaint`'s contract via `setFeatureState`
</output>
</content>
</invoke>