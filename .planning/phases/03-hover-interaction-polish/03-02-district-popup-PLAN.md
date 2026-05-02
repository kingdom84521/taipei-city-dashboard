---
phase: 03-hover-interaction-polish
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - Taipei-City-Dashboard-FE/src/components/crosscompare/DistrictPopup.vue
autonomous: true
requirements: [CC-04]
tags: [crosscompare, popup, sfc, vue]

must_haves:
  truths:
    - "DistrictPopup.vue exists at Taipei-City-Dashboard-FE/src/components/crosscompare/DistrictPopup.vue (D-06, D-19)"
    - "Component accepts 5 camelCase props: districtName (String, required), rank (Number, default null), totalScore (Number, default null), courseScore (Number, default null), inspectionScore (Number, default null) (D-08)"
    - "Score values rendered via toFixed(1); rank rendered as `#N`; missing/non-finite values show `—` (D-09 + defensive nullguard)"
    - "Template uses Vue mustache interpolation `{{ }}` for ALL dynamic content — NEVER `v-html` (D-21 — XSS-safe escape by default)"
    - "Template layout top→bottom: districtName (h3) → rank pill → total_score big → 2-cell grid (課程分數 / 抽查分數) (D-08)"
    - "Style uses existing CSS variables: var(--color-component-background), var(--color-normal-text), var(--color-highlight), var(--color-complement-text), var(--font-s/ms/m) (D-10)"
    - "Single-line TUIC banner at line 1 matches RampLegend.vue convention"
    - "npm run build exits 0; eslint clean"
  artifacts:
    - path: "Taipei-City-Dashboard-FE/src/components/crosscompare/DistrictPopup.vue"
      provides: "Popup body SFC consumed by Plan 03-04 via createApp(DistrictPopup, props).mount(...)"
      contains: "defineProps"
      contains_2: "districtName"
      contains_3: "toFixed"
      contains_4: "課程分數"
      contains_5: "抽查分數"
      min_lines: 80
  key_links:
    - from: "Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue"
      to: "Taipei-City-Dashboard-FE/src/components/crosscompare/DistrictPopup.vue"
      via: "createApp(DistrictPopup, props).mount(div) (wired in Plan 03-04)"
      pattern: "DistrictPopup"
---

<objective>
Create the popup body SFC `DistrictPopup.vue` — the visual that Plan 03-04 will mount into a Mapbox `Popup` HTML container via `createApp(DistrictPopup, props).mount(div)` (D-06, Concern 3 in PATTERNS.md).

The component is purely presentational: receives 5 props, renders 4 layout regions (name, rank pill, big total, 2-cell grid), and applies project-theme CSS variables for the dark glass look on top of Mapbox's default popup wrapper.

Purpose: deliver the user-facing surface of CC-04 acceptance #1 ("popup shows district name + total_score + rank + per-component scores"). XSS-safe by D-21 (Vue mustache interpolation escapes by default — `v-html` is forbidden).

Output: 1 NEW file (~95 LOC: ~20 script, ~17 template, ~55 style + 1 banner + 2 blank). No new packages.

This plan is **wave 1, parallel-safe** with Plans 03-01 and 03-03 (different file). Plan 03-04 (Wave 2) is the consumer.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/03-hover-interaction-polish/03-CONTEXT.md
@.planning/phases/03-hover-interaction-polish/03-PATTERNS.md
@./CLAUDE.md
@.planning/codebase/CONVENTIONS.md

# Primary analog (Phase 2 sibling — same directory, same script-setup conventions)
@Taipei-City-Dashboard-FE/src/components/crosscompare/RampLegend.vue
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Create DistrictPopup.vue popup body SFC</name>
  <files>Taipei-City-Dashboard-FE/src/components/crosscompare/DistrictPopup.vue</files>

  <read_first>
    - .planning/phases/03-hover-interaction-polish/03-CONTEXT.md (D-06 / D-08 / D-09 / D-10 / D-21)
    - .planning/phases/03-hover-interaction-polish/03-PATTERNS.md (section "src/components/crosscompare/DistrictPopup.vue (NEW — popup body SFC)" — VERBATIM script + template + SCSS blocks)
    - Taipei-City-Dashboard-FE/src/components/crosscompare/RampLegend.vue (read FULL — primary analog for banner + script-setup style + SCSS conventions)
  </read_first>

  <action>
**Per D-06, D-08, D-09, D-10, D-21.** Create the file VERBATIM as below. Hard tabs in `<script>` and `<style>` blocks; the `<template>` block may be 2-space-indented per ESLint autofix on Vue templates (Concern 7 in PATTERNS.md — accept that).

**Path:** `Taipei-City-Dashboard-FE/src/components/crosscompare/DistrictPopup.vue` (the directory exists; `RampLegend.vue` and `ViewToggle.vue` are already there).

**Full file contents (write exactly as shown — preserve TC inline comments + hard tabs in script/style):**

```vue
<!-- Developed by Taipei Urban Intelligence Center 2023-2024 -->
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

**Constraints (do NOT violate):**
- NO `v-html` anywhere. Vue mustache `{{ }}` is the only output mechanism (D-21 — XSS-safe escape by default).
- Single-line TUIC banner only (NOT the 9-line block from `views/*.vue`). Match `RampLegend.vue` line 1.
- Hard tabs in `<script>` and `<style>` blocks. Vue auto-format may convert `<template>` to 2-space; that's fine.
- `defineProps` with explicit type + default for each prop — not an array shorthand.
- Do NOT add a Mapbox `Popup` constructor here — that's Plan 03-04's responsibility (this SFC is body-only, framework-agnostic).
- Do NOT import the store — props flow IN at mount time; no Pinia coupling.
- Do NOT register globally; the file just exists for `createApp(DistrictPopup, props)` to consume by relative path in Plan 03-04.
  </action>

  <verify>
    <automated>cd Taipei-City-Dashboard-FE && npm run build 2>&1 | tail -20 | grep -E "built in|exit" || echo "BUILD_FAILED"</automated>
    <gates>
      - `test -f Taipei-City-Dashboard-FE/src/components/crosscompare/DistrictPopup.vue` exit 0
      - `grep -c "defineProps" Taipei-City-Dashboard-FE/src/components/crosscompare/DistrictPopup.vue` ≥ 1
      - `grep -c "districtName\|courseScore\|inspectionScore\|totalScore" Taipei-City-Dashboard-FE/src/components/crosscompare/DistrictPopup.vue` ≥ 4 (4 props referenced — `rank` makes 5; this gate ≥ 4 confirms the camelCase prop names match Plan 03-04's expected callsite)
      - `grep -c "toFixed" Taipei-City-Dashboard-FE/src/components/crosscompare/DistrictPopup.vue` ≥ 1
      - `grep -c "課程分數\|抽查分數" Taipei-City-Dashboard-FE/src/components/crosscompare/DistrictPopup.vue` ≥ 2
      - `grep -c "v-html" Taipei-City-Dashboard-FE/src/components/crosscompare/DistrictPopup.vue` == 0 (D-21 forbidden)
      - `grep -c "var(--color-component-background)\|var(--color-highlight)\|var(--color-normal-text)" Taipei-City-Dashboard-FE/src/components/crosscompare/DistrictPopup.vue` ≥ 3 (D-10 theme tokens)
      - `wc -l Taipei-City-Dashboard-FE/src/components/crosscompare/DistrictPopup.vue` outputs ≥ 80
      - `cd Taipei-City-Dashboard-FE && npm run build` exit 0
    </gates>
  </verify>

  <acceptance_criteria>
    - File exists at the canonical path with the file contents above (modulo template auto-formatting).
    - `npm run build` passes — eslint --fix produces no diff that breaks the file (Vue templates may shift to 2-space; script + style stay tab-indented).
    - All 5 prop names match the schema in `must_haves.truths` exactly (camelCase: `districtName`, `rank`, `totalScore`, `courseScore`, `inspectionScore`). This is load-bearing for Plan 03-04's `createApp(DistrictPopup, { districtName: ..., totalScore: row.total_score, ... })` call.
    - Defensive `fmt()` returns `"—"` for non-finite inputs (CRITICAL — store may not have a row for an edge-case district name; popup must not crash).
  </acceptance_criteria>

  <done>
DistrictPopup.vue exists, builds clean, accepts 5 camelCase props, renders the 4-region layout, uses theme CSS variables, and never uses v-html. Plan 03-04 can import it via `import DistrictPopup from "../components/crosscompare/DistrictPopup.vue"`.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Mapbox vector tile (`metrotaipei_town`) → `feature.id` (district name) → DistrictPopup `districtName` prop | Untrusted external string flows from tile to DOM. Vue mustache `{{ }}` escapes HTML by default — no XSS surface. |
| BE response (`/api/v1/crosscompare/scores`) → `crossCompareStore.scoreByDistrict` Map → DistrictPopup numeric props | Trusted-but-validated: Phase 2 store guards via `Number.isFinite`. This SFC re-guards via `fmt()` defensively. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-02-01 (T-XSS) | Spoofing / Tampering | `districtName` prop interpolated into `<h3>{{ districtName }}</h3>` and `<span>` rank pill | mitigate | Vue 3 mustache interpolation escapes HTML by default. The template uses `{{ }}` for ALL output — never `v-html` (D-21). The grep gate `grep -c "v-html" DistrictPopup.vue == 0` enforces this in CI. ASVS L1 §5.3.3 satisfied. |
| T-03-02-02 | Denial of Service | Non-finite `totalScore` (NaN/null) → `toFixed` throws → popup mount crashes whole Vue app | mitigate | `fmt()` helper guards via `Number.isFinite(Number(v))` and returns `"—"` for any non-numeric input. Gate: `grep -c "Number.isFinite" DistrictPopup.vue` ≥ 2 (one in `fmt`, one in `rankLabel` computed). |
| T-03-02-03 | Information Disclosure | Popup might leak fields not on the spec (e.g. accidentally render entire row JSON) | mitigate | Template renders ONLY the 5 prop fields (D-08). No `v-for (k,v) of row` patterns. Code review + grep gate `grep -c "for(.*of\|for(.*in" DistrictPopup.vue == 0`. |
| T-03-02-04 | Repudiation | None | n/a | — |
| T-03-02-05 | Elevation of Privilege | None — no auth surface | n/a | — |

**Block-on severity:** T-03-02-01 (XSS) is HIGH severity — mitigation is enforced by both grep gate (`v-html == 0`) and convention (mustache only). Build must fail-closed if `v-html` ever appears in a future commit to this file.
</threat_model>

<verification>
- File created at the canonical path (D-19).
- 5 props declared with explicit types + defaults.
- Mustache interpolation only — no `v-html`.
- `Number.isFinite` guards on all 4 numeric props (3 scores + rank).
- TC inline comments (`// 防呆…`) per project style.
- Hard tabs in `<script>` and `<style>` blocks.
- `npm run build` exit 0.
- D-20 boundary: no other files modified — `git status` shows ONLY the new SFC.
</verification>

<success_criteria>
- 1 new file shipped (~95 LOC).
- Build passes.
- Plan 03-04 can `import DistrictPopup from "../components/crosscompare/DistrictPopup.vue"` and `createApp(DistrictPopup, { districtName, rank, totalScore, courseScore, inspectionScore })` — the 5 props exactly match Plan 03-04's call shape.
- Visual smoke (deferred — Plan 03-05 handoff): cursor-anchored popup over a hovered district shows `中正區 / #1 / 63.9 / 28.1 / 35.8`.
</success_criteria>

<output>
After completion, create `.planning/phases/03-hover-interaction-polish/03-02-SUMMARY.md` recording:
- file path + final line count
- 5 prop names + types + defaults
- gate evidence (grep counts above) and `npm run build` exit code
- D-IDs honoured: D-06, D-08, D-09, D-10, D-19, D-21
- a one-line statement: "Plan 03-04 consumes this via createApp(DistrictPopup, { districtName, rank, totalScore, courseScore, inspectionScore }).mount('#crosscompare-popup-mount')"
</output>
</content>
</invoke>