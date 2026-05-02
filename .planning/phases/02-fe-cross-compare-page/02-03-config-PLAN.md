---
phase: 02-fe-cross-compare-page
plan: 03
type: execute
wave: 1
depends_on: []
files_modified:
  - Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js
autonomous: true
requirements: [CC-02, CC-03]
tags: [config, mapbox, paint-expression, normalize, hcl-interpolate]
must_haves:
  truths:
    - "normalizeDistrictKey('臺北市', '中正區') === normalizeDistrictKey('台北市', '中正區') (D-14 — 臺/台 canonicalisation)"
    - "buildFillPaint(domain, scoreByDistrict) returns a valid Mapbox interpolate-hcl expression keyed on TNAME (D-10, D-13)"
    - "Greyed paint expression uses #3a3a3a at 0.35 opacity (D-11)"
    - "CROSSCOMPARE_SOURCE_ID === 'metrotaipei_town' — single source layer for both modes (D-19)"
    - "hasSourceLayer flag mirrors mapStore.js logic so localhost fallback works (PATTERNS.md Concern 3)"
  artifacts:
    - path: "Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js"
      provides: "Color stops, source ids, join-key constant, normalizer, paint-expression builder"
      exports:
        - "CROSSCOMPARE_RAMP"
        - "CROSSCOMPARE_SOURCE_ID"
        - "CROSSCOMPARE_SOURCE_LAYER"
        - "CROSSCOMPARE_JOIN_KEY"
        - "CROSSCOMPARE_HAS_SOURCE_LAYER"
        - "normalizeDistrictKey"
        - "buildFillPaint"
        - "buildGreyPaint"
        - "buildLinePaint"
      min_lines: 80
  key_links:
    - from: "crossCompareConfig.js"
      to: "Plan 02-02 (crossCompareStore.js consumes normalizeDistrictKey)"
      via: "named export"
      pattern: "export function normalizeDistrictKey"
    - from: "crossCompareConfig.js"
      to: "Plan 02-04 (CrossCompareView consumes paint builders)"
      via: "named exports"
      pattern: "export function buildFillPaint"
---

<objective>
Create `src/assets/configs/crossCompareConfig.js` — the shared config + helper module
for Phase 2. Holds: ramp colors, single source-id constant (D-19), join-key constant
(D-13), 臺/台 normalizer (D-14), and the Mapbox paint-expression builders consumed by
Plan 02-04.

Purpose: Centralise the visual/data constants so Plans 02-04 and 02-05 work against
named imports instead of magic strings. Per D-16 we MUST NOT touch `mapConfig.js` —
all new fill descriptors live here.

Output:
- New file `src/assets/configs/crossCompareConfig.js` with named exports (no default).
- Three pure paint-expression builders: `buildFillPaint(domain, scoreByDistrict)`, `buildGreyPaint()`, `buildLinePaint()`.
- `normalizeDistrictKey(city, name)` defensive 臺→台 + whitespace canonicalisation.
- Re-exports `CROSSCOMPARE_HAS_SOURCE_LAYER` so the view can branch local-dev geojson vs prod vector tiles (PATTERNS.md Concern 3).

This plan is purely additive — independent of Plans 02-01 and 02-02. The three Wave 1 plans converge in Plan 02-04.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/02-fe-cross-compare-page/02-CONTEXT.md
@.planning/phases/02-fe-cross-compare-page/02-PATTERNS.md
@./CLAUDE.md
@Taipei-City-Dashboard-FE/src/assets/configs/mapbox/mapConfig.js
@Taipei-City-Dashboard-FE/src/store/mapStore.js

<interfaces>
<!-- Existing patterns this module must mirror. -->

From src/assets/configs/mapbox/mapConfig.js (existing hasSourceLayer pattern; lines 1-4):
```js
const allowedDomains = ["citydashboard.taipei", "test-citydashboard.taipei"];
const hasSourceLayer = allowedDomains.includes(window.location.hostname);
```

From src/store/mapStore.js (existing source loading branches the new view will replicate at runtime; lines 218-267):
```js
// PROD branch (hasSourceLayer === true): vector tiles via geo_server TMS
this.map.addSource(`metrotaipei_town`, {
    type: "vector",
    scheme: "tms",
    tolerance: 0,
    tiles: [
        `${location.origin}/geo_server/gwc/service/tms/1.0.0/taipei_vioc:metrotaipei_town@EPSG:900913@pbf/{z}/{x}/{y}.pbf`,
    ],
});

// LOCALHOST branch (hasSourceLayer === false): geojson from /mapData/
this.map.addSource("metrotaipei_town", {
    type: "geojson",
    data: "/mapData/metrotaipei_town.geojson",
});
```

Mapbox interpolate-hcl expression shape (D-10):
```js
[
    "interpolate-hcl",
    ["linear"],
    ["coalesce", ["feature-state", "score"], ["literal", -1]],
    minDomain, lowColor,
    maxDomain, highColor,
]
```

Note: We will NOT use feature-state for the colour itself in Phase 2 — feature-state is reserved for Phase 3 hover. The colour expression will be a `match` keyed on `["get", "TNAME"]` returning per-district score values, then wrapped with interpolate-hcl. See `buildFillPaint` body below.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create crossCompareConfig.js with constants, normalizer, and paint builders</name>
  <files>Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js</files>
  <read_first>
    - Taipei-City-Dashboard-FE/src/assets/configs/mapbox/mapConfig.js (full — `hasSourceLayer` pattern lines 1-4; named-export style throughout; existing `metroTpDistrict` line layer descriptor lines 219-235 to confirm we are NOT colliding)
    - Taipei-City-Dashboard-FE/src/store/mapStore.js lines 218-297 (source loading branches — production geo_server vs localhost geojson)
    - .planning/phases/02-fe-cross-compare-page/02-PATTERNS.md (`crossCompareConfig.js` section — header pattern, named exports, layer-config shape, normalizeDistrictKey lines 427-432)
    - .planning/phases/02-fe-cross-compare-page/02-CONTEXT.md (D-10 colour ramp; D-11 grey fill; D-13 TNAME; D-14 normalize; D-19 single source layer)
    - .planning/codebase/CONVENTIONS.md (hard tabs; relative imports; no path aliases)
    - ./CLAUDE.md (snake_case JSON end-to-end; hard tabs MANDATORY)
  </read_first>
  <action>
    Create `Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js` with HARD TABS. Named exports only (no default), matching `mapConfig.js` precedent.

    **Why every export?**
    - `CROSSCOMPARE_HAS_SOURCE_LAYER` — view (Plan 02-04) branches between vector-tile (prod) and geojson (localhost) source loading. Computed identically to `mapConfig.js` line 3.
    - `CROSSCOMPARE_SOURCE_ID = "metrotaipei_town"` — D-19: single source for both modes (covers all 41 雙北 districts including 臺北市).
    - `CROSSCOMPARE_SOURCE_LAYER` — only set when `hasSourceLayer === true` (vector-tile mode). On localhost (geojson source) Mapbox does NOT accept `source-layer`, so it is `undefined`.
    - `CROSSCOMPARE_JOIN_KEY = "TNAME"` — D-13. Strong hypothesis confirmed via `mapConfig.js` lines 55, 89 where existing label layers use `["get", "TNAME"]` against the same source.
    - `CROSSCOMPARE_RAMP` — colour stops (D-10, D-11).
    - `normalizeDistrictKey(city, name)` — D-14, defensive 臺→台 + trim.
    - `buildFillPaint(domain, scoreByDistrict)` — Mapbox `interpolate-hcl` paint expression for the ACTIVE fill layer.
    - `buildGreyPaint()` — flat `#3a3a3a` at 0.35 opacity (D-11) for the GREYED fill layer.
    - `buildLinePaint()` — `#555555` border (D-11) for the greyed layer outline; the active layer can omit a line layer (the existing `metroTpDistrict` line layer in `mapConfig.js` already draws white-dashed borders site-wide; we are NOT touching that — we only need a subtle outline on greyed districts).

    Paste this content verbatim. After writing, verify hard-tab indentation:

    ```js
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
    // Join key on vector tile features (D-13)
    // 強烈假設為 TNAME — mapConfig.js lines 55 + 89 的 label layer 也用 ["get", "TNAME"]
    // CrossCompareView load handler 還是會跑一次 runtime probe 確認，但 paint 表達式直接寫死 TNAME
    // ----------------------------------------------------------------------
    export const CROSSCOMPARE_JOIN_KEY = "TNAME";

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
    ```

    **Sanity checks:**
    - File starts with `// Developed by Taipei Urban Intelligence Center 2023-2024`
    - All indented lines use HARD TABS (verify: `grep -P '^\t' Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js | head`)
    - No `import` statements — this is a pure config/helper module (no Mapbox, no Pinia)
    - `CROSSCOMPARE_SOURCE_ID === "metrotaipei_town"` — D-19 enforced
    - `CROSSCOMPARE_JOIN_KEY === "TNAME"` — D-13 enforced
    - The `normalizeDistrictKey` signature matches what `crossCompareStore.js` (Plan 02-02) imports: `(city, name) => string`
    - Paint expressions are plain JSON-serialisable arrays/objects — Mapbox runtime parses them
  </action>
  <verify>
    <automated>test -f Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js &amp;&amp; grep -q 'export const CROSSCOMPARE_SOURCE_ID = "metrotaipei_town"' Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js &amp;&amp; grep -q 'export const CROSSCOMPARE_JOIN_KEY = "TNAME"' Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js &amp;&amp; grep -q 'export function normalizeDistrictKey' Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js &amp;&amp; grep -q 'export function buildFillPaint' Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js &amp;&amp; grep -q 'export function buildGreyPaint' Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js &amp;&amp; grep -q 'interpolate-hcl' Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js &amp;&amp; grep -q 'CROSSCOMPARE_HAS_SOURCE_LAYER' Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js &amp;&amp; grep -P '^\t' Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js | head -1 | grep -q .</automated>
  </verify>
  <acceptance_criteria>
    - File exists at `Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js`
    - All 9 named exports are present (CROSSCOMPARE_RAMP, CROSSCOMPARE_SOURCE_ID, CROSSCOMPARE_SOURCE_LAYER, CROSSCOMPARE_JOIN_KEY, CROSSCOMPARE_HAS_SOURCE_LAYER, CROSSCOMPARE_FILL_LAYER_ID, CROSSCOMPARE_GREY_LAYER_ID, CROSSCOMPARE_GREY_LINE_LAYER_ID, plus the three functions: normalizeDistrictKey, buildFillPaint, buildGreyPaint, buildLinePaint)
    - `CROSSCOMPARE_SOURCE_ID === "metrotaipei_town"` (D-19)
    - `CROSSCOMPARE_JOIN_KEY === "TNAME"` (D-13)
    - `CROSSCOMPARE_RAMP.low === "#1a3a3f"` and `.high === "#5dffe6"` (D-10)
    - `CROSSCOMPARE_RAMP.greyFill === "#3a3a3a"` and `.greyOpacity === 0.35` (D-11)
    - Paint expression contains `"interpolate-hcl"` literal (Mapbox parses this as an interpolation expression)
    - `normalizeDistrictKey` replaces 臺 with 台 in BOTH the city and the name argument (D-14)
    - Hard tabs everywhere
    - No external imports (pure module)
  </acceptance_criteria>
  <done>
    Plans 02-02 and 02-04 can `import { normalizeDistrictKey, CROSSCOMPARE_SOURCE_ID, buildFillPaint, ... } from "../assets/configs/crossCompareConfig"` and the file exports everything they need. After the wave converges in Plan 02-04, `npm run build` will resolve all symbols (verified in Plan 02-06).
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| store row data → paint expression | `buildFillPaint` consumes `scoreByDistrict` rows from BE response. Row strings (district names) end up inside a Mapbox `match` expression. |
| `window.location.hostname` → environment branching | The hostname determines vector-tile vs geojson loading. A user can fake hostname (e.g. via `/etc/hosts`) but only on their own machine; effect is local to their browser. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-03-01 | Tampering | district names embedded in Mapbox match expression | mitigate | District names from BE are rendered into a Mapbox runtime expression — Mapbox runtime treats the strings as opaque match keys, not HTML or JS. No string interpolation into `eval` or `innerHTML`. Numeric scores coerced via `Number()` + `Number.isFinite` guard. |
| T-02-03-02 | Information disclosure | hostname check leaks no info | accept | `window.location.hostname` is already known to the browser; reading it adds no new disclosure surface. |
| T-02-03-03 | Spoofing | malicious user fakes hostname to enable vector-tile mode | accept | The vector-tile URL points at `${location.origin}/geo_server/...` which only works if the user is actually on the prod domain. Faking the hostname locally just causes the request to fail — no privilege escalation. |
| T-02-03-04 | DoS | malformed `domain` (NaN, [10, 10]) crashes paint expression | mitigate | `buildFillPaint` early-returns a flat-colour paint object when domain is degenerate (`!Number.isFinite || min === max`). Same fallback when match arms array is empty. |
</threat_model>

<verification>
- File exists; all 9 expected exports present (verified by grep above)
- File is pure (no imports of external libs, no DOM mutation)
- Hard-tab indentation passes (`grep -P '^\t' | head -1` matches a real line)
- Plan 02-04 will exercise the paint builders; Plan 02-06 runs `npm run build` to confirm import resolution end-to-end
</verification>

<success_criteria>
- `crossCompareConfig.js` exports all 9 expected symbols (constants + functions)
- Paint expression is a valid Mapbox interpolate-hcl expression keyed on `["get", "TNAME"]` (D-13)
- Single source layer constant `metrotaipei_town` (D-19) — no `tp_district` reference
- Defensive fallbacks (degenerate domain, empty match arms, missing window) prevent runtime throws
- Supports CC-02 (toggle setFilter via `enabledDistrictNames`) and CC-03 (choropleth fill via paint expression)
</success_criteria>

<output>
After completion, create `.planning/phases/02-fe-cross-compare-page/02-03-SUMMARY.md` documenting:
- Final list of named exports (with brief one-line purpose for each)
- Confirmation that 臺/台 normalization is applied on BOTH sides of the join (BE `city` + vector tile `TNAME`)
- The hardcoded JOIN_KEY = "TNAME" hypothesis (Plan 02-04 still runs a runtime assertion to log a warning if a vector tile feature is missing TNAME)
</output>
