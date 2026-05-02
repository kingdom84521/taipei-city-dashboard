---
phase: 02-fe-cross-compare-page
plan: 05
type: execute
wave: 2
depends_on: ["02-02", "02-04"]
files_modified:
  - Taipei-City-Dashboard-FE/src/components/crosscompare/ViewToggle.vue
  - Taipei-City-Dashboard-FE/src/components/crosscompare/RampLegend.vue
  - Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue
autonomous: false
requirements: [CC-02]
tags: [vue, components, ui, toggle, legend, scss]
must_haves:
  truths:
    - "Top-left of the map shows a pill-style 台北 / 雙北 toggle"
    - "Bottom-right of the map shows a colour-ramp legend with min/max numeric labels (e.g. 10.6 — 63.9) and axis label total_score"
    - "Clicking 台北 makes 新北 districts grey at #3a3a3a / 0.35 opacity within 200ms (D-12, ROADMAP success #3)"
    - "Clicking 雙北 paints all 41 districts via the score ramp"
    - "Toggling does NOT trigger a second network request (D-18)"
    - "Active toggle button has visible highlighted state (background-color: var(--color-highlight))"
    - "Toggle persists across page reload via localStorage (D-09)"
  artifacts:
    - path: "Taipei-City-Dashboard-FE/src/components/crosscompare/ViewToggle.vue"
      provides: "Pill-style 台北 / 雙北 toggle that calls store.setViewMode"
      contains: "viewtoggle__btn"
    - path: "Taipei-City-Dashboard-FE/src/components/crosscompare/RampLegend.vue"
      provides: "Floating colour-ramp legend with numeric domain labels"
      contains: "ramplegend__bar"
    - path: "Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue"
      provides: "Updated to import + slot ViewToggle (top-left) and RampLegend (bottom-right)"
      contains: "ViewToggle|RampLegend"
  key_links:
    - from: "ViewToggle.vue"
      to: "Plan 02-02 store setViewMode"
      via: "@click handler"
      pattern: "store\\.setViewMode\\("
    - from: "CrossCompareView.vue"
      to: "ViewToggle + RampLegend"
      via: "scoped imports + template slots"
      pattern: "import ViewToggle from"
    - from: "RampLegend.vue"
      to: "store.rampDomain"
      via: "prop binding from view"
      pattern: ":domain"
---

<objective>
Create the two floating UI controls (ViewToggle top-left, RampLegend bottom-right) and
wire them into CrossCompareView.vue. Implements the UI half of CC-02.

Purpose: Plan 02-04 already gave the view the wiring to react to `store.viewMode` and
`store.rampDomain` changes — this plan provides the controls that USER interactions
flow through. Toggling between 台北 and 雙北 is now a one-click action that:
1. ViewToggle calls `store.setViewMode('taipei' | 'metrotaipei')`
2. Store updates state + persists to localStorage (whitelisted)
3. View's `watch(() => store.viewMode, applyEnabledFilter)` (from Plan 02-04) triggers `setFilter` swap
4. Mapbox repaints — greyed districts grey out within Mapbox's next render frame (well under the 200ms threshold of ROADMAP success #3)

Output:
- New file `src/components/crosscompare/ViewToggle.vue` — pill toggle (台北 / 雙北)
- New file `src/components/crosscompare/RampLegend.vue` — gradient-strip legend with min/max labels
- Edit `src/views/CrossCompareView.vue` to import both components and add their template slots
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
@Taipei-City-Dashboard-FE/src/components/utilities/miscellaneous/SideBarTab.vue
@Taipei-City-Dashboard-FE/src/components/utilities/bars/NavBar.vue
@Taipei-City-Dashboard-FE/src/dashboardComponent/components/MapLegend.vue
@Taipei-City-Dashboard-FE/src/store/crossCompareStore.js
@Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue

<interfaces>
<!-- Contracts these components consume. -->

From Plan 02-02 src/store/crossCompareStore.js:
- store.viewMode: 'taipei' | 'metrotaipei'
- store.rampDomain: [number, number]
- store.setViewMode(mode: string): void  // whitelist-validated; persists to localStorage

From Plan 02-03 src/assets/configs/crossCompareConfig.js:
- CROSSCOMPARE_RAMP.low: "#1a3a3f"   // legend gradient start
- CROSSCOMPARE_RAMP.high: "#5dffe6"  // legend gradient end

Existing site CSS variables (used in NavBar &-tabs SCSS at lines 218-241):
- var(--color-component-background)
- var(--color-highlight)
- var(--color-complement-text)
- var(--color-normal-text)
- var(--font-s), var(--font-m), var(--font-ms)
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create ViewToggle.vue (pill 台北 / 雙北 toggle)</name>
  <files>Taipei-City-Dashboard-FE/src/components/crosscompare/ViewToggle.vue</files>
  <read_first>
    - Taipei-City-Dashboard-FE/src/components/utilities/miscellaneous/SideBarTab.vue (full — small focused control with active-state class; primary analog)
    - Taipei-City-Dashboard-FE/src/components/utilities/bars/NavBar.vue lines 218-249 (SCSS &-tabs block — pill row with --color-highlight active variant)
    - .planning/phases/02-fe-cross-compare-page/02-PATTERNS.md (`ViewToggle.vue` section — component skeleton, pill-row markup, active-state SCSS)
    - .planning/phases/02-fe-cross-compare-page/02-CONTEXT.md (D-08 top-left placement; D-09 default 'metrotaipei'; D-12 instant transition)
    - Taipei-City-Dashboard-FE/src/store/crossCompareStore.js (Plan 02-02 — confirms `setViewMode` signature)
  </read_first>
  <action>
    The directory `src/components/crosscompare/` does not exist yet. Create it (e.g. `mkdir -p Taipei-City-Dashboard-FE/src/components/crosscompare`) and add `ViewToggle.vue` inside.

    Use HARD TABS. Inline comments in Traditional Chinese.

    Paste this content verbatim:

    ```vue
    <!-- Developed by Taipei Urban Intelligence Center 2023-2024 -->

    <script setup>
    import { useCrossCompareStore } from "../../store/crossCompareStore";

    const store = useCrossCompareStore();

    // 兩個模式 — 'taipei' (12 區) / 'metrotaipei' (41 區)
    const options = [
        { value: "taipei", label: "台北" },
        { value: "metrotaipei", label: "雙北" },
    ];

    function handleClick(value) {
        // store.setViewMode 內部白名單驗證；不必再檢查
        if (store.viewMode === value) return;
        store.setViewMode(value);
    }
    </script>

    <template>
        <div
            class="viewtoggle"
            role="tablist"
            aria-label="View mode"
        >
            <button
                v-for="opt in options"
                :key="opt.value"
                :class="{
                    viewtoggle__btn: true,
                    'viewtoggle__btn--active': store.viewMode === opt.value,
                }"
                role="tab"
                :aria-selected="store.viewMode === opt.value"
                type="button"
                @click="handleClick(opt.value)"
            >
                {{ opt.label }}
            </button>
        </div>
    </template>

    <style scoped lang="scss">
    .viewtoggle {
        display: inline-flex;
        background-color: var(--color-component-background);
        border-radius: 999px;
        padding: 4px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);

        &__btn {
            padding: 6px 16px;
            border: 0;
            background: transparent;
            color: var(--color-complement-text);
            border-radius: 999px;
            font-size: var(--font-s);
            cursor: pointer;
            transition: background-color 0.2s, color 0.2s;

            &:hover {
                opacity: 0.85;
            }

            &--active {
                background-color: var(--color-highlight);
                color: var(--color-component-background);
            }
        }
    }
    </style>
    ```

    **Design notes:**
    - Pill style (border-radius: 999px) matches the visual brief in CONTEXT D-08.
    - `<button type="button">` — without explicit type, buttons inside form-like contexts can default to "submit". Defensive.
    - `role="tablist"` + `role="tab"` + `aria-selected` — accessibility (cheap to add; no requirement).
    - SCSS uses the same CSS variables as NavBar's existing `&-tabs` block — auto-themes with the site's dark theme.
  </action>
  <verify>
    <automated>test -f Taipei-City-Dashboard-FE/src/components/crosscompare/ViewToggle.vue &amp;&amp; grep -q 'useCrossCompareStore' Taipei-City-Dashboard-FE/src/components/crosscompare/ViewToggle.vue &amp;&amp; grep -q 'store\.setViewMode' Taipei-City-Dashboard-FE/src/components/crosscompare/ViewToggle.vue &amp;&amp; grep -q '台北' Taipei-City-Dashboard-FE/src/components/crosscompare/ViewToggle.vue &amp;&amp; grep -q '雙北' Taipei-City-Dashboard-FE/src/components/crosscompare/ViewToggle.vue &amp;&amp; grep -q 'viewtoggle__btn--active' Taipei-City-Dashboard-FE/src/components/crosscompare/ViewToggle.vue &amp;&amp; grep -P '^\t' Taipei-City-Dashboard-FE/src/components/crosscompare/ViewToggle.vue | head -1 | grep -q .</automated>
  </verify>
  <acceptance_criteria>
    - File at exact path `Taipei-City-Dashboard-FE/src/components/crosscompare/ViewToggle.vue`
    - Imports `useCrossCompareStore` from `"../../store/crossCompareStore"` (two-level relative path because we are nested one directory deeper than `views/`)
    - Renders TWO buttons with labels `台北` and `雙北`
    - Active button has the `viewtoggle__btn--active` class (driven by `store.viewMode === opt.value`)
    - Click handler calls `store.setViewMode(opt.value)` (no direct state mutation)
    - Hard tabs throughout
  </acceptance_criteria>
  <done>
    Toggle component exists, imports the store, dispatches setViewMode on click, highlights the active option.
  </done>
</task>

<task type="auto">
  <name>Task 2: Create RampLegend.vue (gradient strip with min/max labels)</name>
  <files>Taipei-City-Dashboard-FE/src/components/crosscompare/RampLegend.vue</files>
  <read_first>
    - Taipei-City-Dashboard-FE/src/dashboardComponent/components/MapLegend.vue lines 1-92, 134-207 (primary analog: TUIC banner + props pattern + SCSS swatch+label markup)
    - .planning/phases/02-fe-cross-compare-page/02-PATTERNS.md (`RampLegend.vue` section — component skeleton, SCSS pattern with linear-gradient)
    - .planning/phases/02-fe-cross-compare-page/02-CONTEXT.md (D-08 bottom-right placement; D-10 colour stops)
    - Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js (Plan 02-03 — confirms CROSSCOMPARE_RAMP.low and .high)
  </read_first>
  <action>
    Add `RampLegend.vue` in the same `src/components/crosscompare/` directory created in Task 1.

    Use HARD TABS.

    Paste this content verbatim:

    ```vue
    <!-- Developed by Taipei Urban Intelligence Center 2023-2024 -->

    <script setup>
    import { computed } from "vue";
    import { CROSSCOMPARE_RAMP } from "../../assets/configs/crossCompareConfig";

    const props = defineProps({
        // [min, max] of total_score — store.rampDomain
        domain: {
            type: Array,
            default: () => [0, 100],
        },
        // 軸標籤；預設為 BE 欄位名（snake_case 跨層）
        label: {
            type: String,
            default: "total_score",
        },
    });

    const minLabel = computed(() => {
        const v = Number(props.domain?.[0]);
        return Number.isFinite(v) ? v.toFixed(1) : "—";
    });
    const maxLabel = computed(() => {
        const v = Number(props.domain?.[1]);
        return Number.isFinite(v) ? v.toFixed(1) : "—";
    });

    // 直接用 CSS linear-gradient — 與 buildFillPaint 的 interpolate-hcl 並非完全等價
    // (HCL vs RGB 中段插值會略有差異)，但人眼感受夠接近，使用者不會分辨；
    // 確切的色階對應由 Mapbox 在地圖上呈現，此 legend 只是視覺指引
    const gradientStyle = computed(() => ({
        background: `linear-gradient(to right, ${CROSSCOMPARE_RAMP.low}, ${CROSSCOMPARE_RAMP.high})`,
    }));
    </script>

    <template>
        <div class="ramplegend">
            <span class="ramplegend__min">{{ minLabel }}</span>
            <div
                class="ramplegend__bar"
                :style="gradientStyle"
            />
            <span class="ramplegend__max">{{ maxLabel }}</span>
            <p class="ramplegend__axis">{{ label }}</p>
        </div>
    </template>

    <style scoped lang="scss">
    .ramplegend {
        display: inline-flex;
        align-items: center;
        gap: var(--font-s);
        padding: var(--font-s) var(--font-m);
        background-color: var(--color-component-background);
        border-radius: 5px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);

        &__bar {
            width: 160px;
            height: 12px;
            border-radius: 6px;
        }

        &__min,
        &__max {
            color: var(--color-complement-text);
            font-size: var(--font-ms);
            min-width: 36px;
            text-align: center;
        }

        &__axis {
            color: var(--color-normal-text);
            font-size: var(--font-s);
            margin: 0 0 0 var(--font-s);
        }
    }
    </style>
    ```

    **Design notes:**
    - Reads `CROSSCOMPARE_RAMP.low` and `.high` from the config so any future colour change ripples here automatically.
    - Numeric labels use `toFixed(1)` (e.g. `10.6 — 63.9`).
    - The CSS linear-gradient approximates Mapbox's interpolate-hcl — close enough for a legend, deliberate per the inline comment.
  </action>
  <verify>
    <automated>test -f Taipei-City-Dashboard-FE/src/components/crosscompare/RampLegend.vue &amp;&amp; grep -q 'CROSSCOMPARE_RAMP' Taipei-City-Dashboard-FE/src/components/crosscompare/RampLegend.vue &amp;&amp; grep -q 'defineProps' Taipei-City-Dashboard-FE/src/components/crosscompare/RampLegend.vue &amp;&amp; grep -q 'ramplegend__bar' Taipei-City-Dashboard-FE/src/components/crosscompare/RampLegend.vue &amp;&amp; grep -q 'linear-gradient' Taipei-City-Dashboard-FE/src/components/crosscompare/RampLegend.vue &amp;&amp; grep -P '^\t' Taipei-City-Dashboard-FE/src/components/crosscompare/RampLegend.vue | head -1 | grep -q .</automated>
  </verify>
  <acceptance_criteria>
    - File at exact path `Taipei-City-Dashboard-FE/src/components/crosscompare/RampLegend.vue`
    - Defines two props: `domain` (Array, default `[0, 100]`) and `label` (String, default `"total_score"`)
    - Imports `CROSSCOMPARE_RAMP` from `"../../assets/configs/crossCompareConfig"`
    - Renders `min — bar — max — axisLabel` markup in template
    - Bar background is a CSS `linear-gradient(to right, #1a3a3f, #5dffe6)` (computed from config)
    - Hard tabs throughout
  </acceptance_criteria>
  <done>
    RampLegend renders a 160×12px gradient strip flanked by two numeric labels. Default props produce `0.0 — 100.0` until the view passes the real `store.rampDomain`.
  </done>
</task>

<task type="auto">
  <name>Task 3: Wire ViewToggle and RampLegend into CrossCompareView.vue</name>
  <files>Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue</files>
  <read_first>
    - Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue (current state from Plan 02-04 — single empty div under `<div class="crosscompare">`)
    - .planning/phases/02-fe-cross-compare-page/02-PATTERNS.md (CrossCompareView.vue template chrome lines 146-154 — slot pattern; SCSS positioning lines 165-181)
    - .planning/phases/02-fe-cross-compare-page/02-CONTEXT.md (D-08 top-left toggle, bottom-right legend; D-12 instant)
    - .planning/codebase/CONVENTIONS.md (hard tabs)
  </read_first>
  <action>
    Edit `Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue`. Make THREE precise changes; do nothing else.

    **Change 1 — add two component imports** at the bottom of the existing `<script setup>` import block (after the `crossCompareConfig` named imports, before the `const store = useCrossCompareStore();` line):

    ```js
    import ViewToggle from "../components/crosscompare/ViewToggle.vue";
    import RampLegend from "../components/crosscompare/RampLegend.vue";
    ```

    **Change 2 — replace the placeholder template comment + add component slots**. The current template (from Plan 02-04) reads:

    ```vue
    <template>
        <div class="crosscompare">
            <!-- #crosscompareMapBox needs to be empty to ensure Mapbox performance -->
            <div id="crosscompareMapBox" />
            <!-- ViewToggle (top-left) 與 RampLegend (bottom-right) 由 Plan 02-05 補上 -->
        </div>
    </template>
    ```

    Replace it with (just adds the two `<ViewToggle/>` and `<RampLegend/>` lines and drops the placeholder comment):

    ```vue
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
    ```

    **Change 3 — extend the `<style scoped lang="scss">` block** to position the two children. The current SCSS is:

    ```scss
    .crosscompare {
        height: calc(100vh - 60px);
        height: calc(var(--vh) * 100 - 60px);
        position: relative;

        #crosscompareMapBox {
            width: 100%;
            height: 100%;
            border-radius: 0;
        }
    }
    ```

    Append two new nested rules so the final block reads:

    ```scss
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
    ```

    **DO NOT** touch:
    - The TUIC banner block at the top
    - The Mapbox imports / lifecycle code (Plan 02-04 owns it)
    - The two `watch()` calls (Plan 02-04 owns them)
    - The `onMounted` / `onBeforeUnmount` blocks
    - The `applyEnabledFilter` / `applyActivePaint` / `addCrossCompareSource` / `addCrossCompareLayers` / `probeJoinKey` functions

    Match HARD TABS for all new lines.
  </action>
  <verify>
    <automated>grep -q 'import ViewToggle from "\.\./components/crosscompare/ViewToggle\.vue"' Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue &amp;&amp; grep -q 'import RampLegend from "\.\./components/crosscompare/RampLegend\.vue"' Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue &amp;&amp; grep -q '<ViewToggle' Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue &amp;&amp; grep -q '<RampLegend' Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue &amp;&amp; grep -q ':domain="store.rampDomain"' Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue &amp;&amp; grep -q '&__toggle' Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue &amp;&amp; grep -q '&__legend' Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue</automated>
  </verify>
  <acceptance_criteria>
    - Both new imports present (`ViewToggle`, `RampLegend`)
    - Both components used in template (`<ViewToggle ...>` and `<RampLegend :domain="store.rampDomain" ...>`)
    - SCSS has `&__toggle` (positioned top-left) and `&__legend` (positioned bottom-right) rules
    - The Plan 02-04 lifecycle / watcher code is UNCHANGED (`grep -c 'onBeforeUnmount' Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` is exactly 1; `grep -c 'map\.remove()' ...` is exactly 1)
    - File still has hard-tab indentation
  </acceptance_criteria>
  <done>
    The view renders Mapbox + the toggle (top-left) + the legend (bottom-right). Clicking the toggle drives store.setViewMode → store.viewMode change → existing `watch(() => store.viewMode, applyEnabledFilter)` fires → Mapbox setFilter swap. The legend reactively updates min/max labels as `store.rampDomain` changes after fetch.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 4: Smoke verify toggle + legend behaviour end-to-end</name>
  <what-built>
    The ViewToggle and RampLegend components, wired into CrossCompareView. Toggle is top-left, Legend is bottom-right. Toggle persists viewMode to localStorage and triggers Mapbox setFilter without refetching.
  </what-built>
  <how-to-verify>
    1. From `Taipei-City-Dashboard-FE/`, run `npm run dev`. Open `http://localhost:8080/crosscompare`.
    2. Initial render (within 5s):
       - All 41 districts coloured (default mode 'metrotaipei').
       - Top-left: pill toggle showing `台北 | 雙北` with `雙北` highlighted.
       - Bottom-right: legend with gradient strip, two numeric labels (≈ `10.6 — 63.9` based on fixture), axis label `total_score`.
    3. Open DevTools Network tab. Click `台北`.
       - The 29 新北 districts should grey out within 200ms (per ROADMAP success #3 — set a stopwatch by eye; the swap should feel "instant").
       - 12 臺北 districts retain their colours.
       - NO new network request fires (D-18 — exactly one `/api/v1/crosscompare/scores` call total since page load).
       - Top-left: `台北` is now highlighted; `雙北` dimmed.
    4. Click `雙北`.
       - All 41 districts repaint with their score colours.
       - Still no new network request.
    5. Click `台北` again. Refresh the page.
       - On reload, viewMode should still be `taipei` — only 12 districts coloured. (D-09 localStorage persistence.)
       - Run `localStorage.getItem("crossCompare.viewMode")` in console — returns `"taipei"`.
    6. Test threat T-02-02-01 (whitelist):
       - Run `localStorage.setItem("crossCompare.viewMode", "../etc/passwd")` in DevTools console.
       - Refresh.
       - Page should still load with `metrotaipei` view (whitelist rejected the bogus value).
       - No alert / no error.
    7. Visual sanity:
       - Toggle pill is fully visible (not clipped by NavBar) at top-left.
       - Legend is fully visible at bottom-right (not clipped by browser edges or scrollbars).
       - Both float over the map with the dark site theme — readable contrast.
    8. Run `npm run build` from Taipei-City-Dashboard-FE/ — exits with 0 (eslint --fix may auto-fix indentation; that's fine — the build must succeed). Plan 02-06 gates this formally.
  </how-to-verify>
    <action>
    Stop here and wait for the user to perform the toggle/legend smoke verification listed in <how-to-verify>. The user runs `npm run dev` and steps through 8 numbered checks covering visual placement, toggle dispatch without refetch (D-18), localStorage persistence (D-09), whitelist rejection (T-02-02-01), and final `npm run build` exit code. Do NOT auto-resume.
  </action>
  <verify>User types 'approved' in response to the resume-signal prompt; failures (e.g. >200ms transition, second network request, build exit non-zero) are described.</verify>
  <done>All 8 verification steps pass; D-08 placement confirmed; D-12 instant transition confirmed; D-18 single-fetch contract preserved.</done>
  <resume-signal>
    Type "approved" if all 8 checks pass. If toggle does not visibly grey out 新北 districts within 200ms, that's a watcher / setFilter wiring bug — note the symptom. If a second network request fires on toggle, that's a D-18 violation.
  </resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| ViewToggle button click → store action | The component dispatches a fixed string from a hardcoded `options` array. No user-typed input on this surface. |
| RampLegend prop `domain` → toFixed | If `domain` is ever a non-array (e.g. `null`), `Number(props.domain?.[0])` returns `NaN` — guarded by `Number.isFinite`. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-05-01 | Tampering | DevTools-injected click on toggle button with crafted event | accept | Even if a user fakes a click event, the handler dispatches a string from the local `options` array (`'taipei'` or `'metrotaipei'`) — no path for injection. The store's whitelist (T-02-02-02) is the second line of defense. |
| T-02-05-02 | Information disclosure | rendered district name in legend | accept | RampLegend renders only numeric `domain[0/1].toFixed(1)` and the static literal `"total_score"` — no district names, no XSS surface. |
| T-02-05-03 | Spoofing | XSS via translated label string | accept | Labels (`台北` / `雙北`) are hardcoded literals, not from BE response. |
| T-02-05-04 | DoS | rapid toggle clicking floods Mapbox setFilter calls | accept | Mapbox's `setFilter` is synchronous + idempotent; rapid clicks just reapply the same filter. The early-return `if (store.viewMode === value) return` short-circuits redundant dispatches. |
</threat_model>

<verification>
- All 7 grep gates above pass
- Browser smoke (Task 4) verifies:
  - Visual placement (top-left, bottom-right)
  - Toggle dispatches without refetching (D-18)
  - localStorage round-trip (D-09)
  - Whitelist rejects bogus localStorage value (T-02-02-01)
- npm run build smoke (Task 4 step 8) passes
</verification>

<success_criteria>
- ViewToggle.vue and RampLegend.vue exist under `src/components/crosscompare/`
- CrossCompareView.vue imports both and slots them at top-left / bottom-right
- ROADMAP success criteria #3 (toggle updates within 200ms; greyed at desaturated colour at reduced opacity; non-interactive guard via store.disabledDistricts ready for Phase 3) — confirmed
- D-08 chrome placement honoured (top-left + bottom-right)
- D-09 localStorage persistence works AND is whitelist-validated
- D-12 instant transition (no animation choreography in Phase 2)
- D-18 single fetch contract preserved (no refetch on toggle)
- Requirement CC-02 fully implemented
</success_criteria>

<output>
After completion, create `.planning/phases/02-fe-cross-compare-page/02-05-SUMMARY.md` documenting:
- The two new component files + line counts
- Confirmation that the Plan 02-04 lifecycle code is unchanged
- Browser smoke result (which districts greyed out; observed transition speed)
- localStorage round-trip behaviour
</output>
