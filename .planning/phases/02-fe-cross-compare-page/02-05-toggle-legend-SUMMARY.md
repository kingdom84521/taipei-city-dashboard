---
phase: 02-fe-cross-compare-page
plan: 05
subsystem: fe
tags: [vue, components, ui, toggle, legend, scss, crosscompare]
requires: ["02-02", "02-04"]
provides:
  - "Pill-style 台北 / 雙北 floating toggle (top-left of cross-compare map)"
  - "Floating colour-ramp legend with numeric min/max labels (bottom-right)"
  - "Wiring of both into CrossCompareView so user clicks drive Mapbox setFilter via existing watcher"
affects:
  - "Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue (added 2 imports + 2 template slots + 2 SCSS positional rules)"
tech-stack:
  added: []
  patterns:
    - "BEM class naming on new floating widgets (`viewtoggle__btn--active`, `ramplegend__bar`)"
    - "ARIA tablist/tab roles on toggle buttons (a11y bonus, no requirement)"
    - "Hard tabs in <script>/<style>; <template> normalised by eslint --fix to 2-space (vue/html-indent default — accepted per Plan 02-04 pattern)"
key-files:
  created:
    - "Taipei-City-Dashboard-FE/src/components/crosscompare/ViewToggle.vue (72 lines)"
    - "Taipei-City-Dashboard-FE/src/components/crosscompare/RampLegend.vue (81 lines)"
  modified:
    - "Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue (+23 lines: 2 imports, 2 slots, 2 SCSS positional blocks; lifecycle/watchers untouched)"
decisions:
  - "Auto-approved Task 4 checkpoint per user's gsd-auto default (memory feedback_gsd_auto_default.md). Browser smoke deferred to user — see Deferred Verification."
  - "RampLegend gradient uses CSS linear-gradient (sRGB) which is not a perfect match for Mapbox's interpolate-hcl. Documented inline; legend is a visual cue, not a colour-accuracy guarantee. Phase 3 may revisit."
  - "Used hard tabs in <template> initially; eslint --fix on `npm run build` reformatted templates to 2-space (Vue's vue/html-indent default). Followed Plan 02-04's accepted pattern: let --fix do its thing in templates; preserve tabs in <script>/<style>."
metrics:
  duration_seconds: 175
  duration_minutes: 2.9
  tasks_completed: 3
  tasks_total: 4
  files_created: 2
  files_modified: 1
  commits: 3
  completed_at: "2026-05-02T19:23:39Z"
---

# Phase 02 Plan 05: ViewToggle + RampLegend Summary

**One-liner:** Pill-shaped 台北 / 雙北 floating toggle + colour-ramp legend wired into CrossCompareView; click dispatches `store.setViewMode` → existing Plan 02-04 watcher → Mapbox `setFilter` swap (no refetch, instant per D-12).

## What was built

Two small, focused floating UI controls that complete the user-facing half of CC-02:

1. **`src/components/crosscompare/ViewToggle.vue` (72 lines)** — Pill-row with two `<button>` elements (`台北` / `雙北`). The active option carries `viewtoggle__btn--active`, painted with `var(--color-highlight)` against `var(--color-component-background)`. `@click` calls `store.setViewMode(opt.value)`; an early-return `if (store.viewMode === value) return` short-circuits redundant dispatches (also helps T-02-05-04 rapid-click DoS). ARIA `tablist`/`tab` roles + `aria-selected` for accessibility; `type="button"` defensive.

2. **`src/components/crosscompare/RampLegend.vue` (81 lines)** — Inline-flex strip with `min — bar — max — axisLabel` markup. The 160×12px bar reads its gradient from `CROSSCOMPARE_RAMP.low` / `.high` (config-driven; future colour changes ripple here automatically). Numeric labels use `Number.isFinite(...) ? toFixed(1) : "—"` (T-02-05-02 NaN guard). Default props produce `0.0 — 100.0` until the view passes `store.rampDomain` (which lands as ~`10.6 — 63.9` from the 41-row fixture).

3. **`src/views/CrossCompareView.vue`** — Three surgical edits, nothing else touched:
   - Imports: `ViewToggle` and `RampLegend` added at the bottom of the existing import block.
   - Template: Two component slots (`<ViewToggle class="crosscompare__toggle" />` and `<RampLegend class="crosscompare__legend" :domain="store.rampDomain" label="total_score" />`) replace the placeholder comment under the empty `#crosscompareMapBox` div.
   - SCSS: `&__toggle` (top:`var(--font-m)`, left:`var(--font-m)`, z-index:2) and `&__legend` (bottom/right) absolute-position rules appended.

## Plan 02-04 lifecycle preserved

Confirmed via grep + diff review:

| Function / hook | Status | Line in current file |
|---|---|---|
| `onMounted(async () => { … fetchScores })` | unchanged | 152 |
| `onBeforeUnmount(() => { map?.remove(); … })` | unchanged | 190 |
| `applyEnabledFilter` | unchanged (4 references) | 42 + watchers |
| `applyActivePaint` | unchanged | 61 |
| `addCrossCompareSource` (production vector / localhost geojson branch) | unchanged | 72 |
| `addCrossCompareLayers` (greyed fill → active fill → greyed line, in order) | unchanged | 97 |
| `probeJoinKey` (D-13 runtime probe for TNAME) | unchanged | 133 |
| `watch(() => store.viewMode, applyEnabledFilter)` (the **trigger** for this plan's UX) | unchanged | 214–219 |

`grep -c 'map\.remove()' = 1`, `grep -c 'addCrossCompareSource' = 2` (function definition + onMounted call), `grep -c 'probeJoinKey' = 3` (definition + reference + once handler). Lifecycle code is untouched as required.

## Verification gates

| Gate | Status |
|---|---|
| Task 1 grep gates (file exists, useCrossCompareStore, store.setViewMode, 台北, 雙北, viewtoggle__btn--active, hard tab in script) | PASS |
| Task 2 grep gates (file exists, CROSSCOMPARE_RAMP, defineProps, ramplegend__bar, linear-gradient, hard tab in script) | PASS |
| Task 3 grep gates (both imports present, both components used, :domain="store.rampDomain", &__toggle, &__legend SCSS) | PASS |
| `npm run build` (eslint --fix + vite build) | PASS — `✓ built in 9.26s`, exit 0 |
| Plan 02-04 lifecycle preserved (`onBeforeUnmount` exists, `map.remove()` exactly 1, watchers intact) | PASS |
| No accidental file deletions | PASS |
| Pre-existing dirty files (`STATE.md`, `mapConfig.js`) left unstaged & unmodified | PASS |

## Commits

| Task | Hash | Message |
|---|---|---|
| 1 | `6a67743` | `feat(02-05): add ViewToggle.vue (pill-style 台北 / 雙北 floating top-left)` |
| 2 | `31cbd71` | `feat(02-05): add RampLegend.vue (colour-ramp gradient strip with min/max labels, bottom-right)` |
| 3 | `4520d89` | `feat(02-05): wire ViewToggle + RampLegend into CrossCompareView template` |

Task 3's commit also captures the eslint --fix template-indent normalisation on the two new components (build-gate side effect — same pattern Plan 02-04 absorbed).

## Deferred Verification (browser smoke)

The Task 4 checkpoint specified an 8-step browser smoke (`npm run dev`, click toggle, observe ≤200ms grey-out swap, confirm no second network request, refresh-persistence round-trip, T-02-02-01 whitelist test). **This cannot run end-to-end in the executor's environment**: `node_modules/.vite` cache is root-owned (environmental side-effect of a prior sudo run; same condition Plan 02-04 documented).

**Auto-approved per user gsd-auto default** (memory `feedback_gsd_auto_default.md`); compile-correctness proxy gate is `npm run build` exit 0 (passed). The 8-step browser checks below are deferred to the user once they fix `node_modules/.vite` ownership (e.g. `sudo chown -R $USER node_modules/.vite` or `rm -rf node_modules/.vite`):

1. Initial render — 41 districts coloured; toggle shows `雙北` highlighted; legend reads ≈ `10.6 — 63.9 total_score`.
2. Click `台北` → 29 新北 districts grey out (`#3a3a3a` @ 0.35 opacity) within 200ms; 12 臺北 districts retain colour.
3. DevTools Network: exactly **one** `/api/v1/crosscompare/scores` call total since page load (D-18 — toggle does NOT refetch).
4. Click `雙北` → all 41 districts repaint via the score ramp; still no new network request.
5. Click `台北`, refresh page → only 12 districts coloured; `localStorage.getItem("crossCompare.viewMode") === "taipei"` (D-09 round-trip).
6. T-02-02-01: `localStorage.setItem("crossCompare.viewMode", "../etc/passwd"); location.reload()` → page loads with `metrotaipei` (whitelist rejects bogus value, no crash).
7. Visual: toggle pill not clipped by NavBar; legend not clipped by browser edges; both readable on dark theme.
8. `npm run build` from `Taipei-City-Dashboard-FE/` exits 0 — already verified by executor.

User instruction: report back if step 2 (200ms swap) feels sluggish or step 3 fires a second network request. Either symptom indicates a watcher / setFilter wiring bug. All other steps should pass with the current code; the deferral is an environment limitation, not a code-quality gap.

## Deviations from Plan

None. The plan was executed verbatim:

- File contents pasted as-prescribed (the `<action>` blocks were copy-paste-ready).
- Imports inserted at the exact positional anchor (`} from "../assets/configs/crossCompareConfig"` → followed by the two new imports → followed by `const store = useCrossCompareStore();`).
- Template & SCSS additions matched the action block byte-for-byte (modulo eslint --fix template indent — accepted by execution rule 1).
- No Rule 1/2/3 auto-fixes were needed; build passed first try.
- No Rule 4 architectural escalation.

## Threat Flags

None. The two new files introduce no new network endpoints, auth paths, file access, or schema changes. All STRIDE entries for this plan (T-02-05-01 through T-02-05-04) are `accept` by design — the click dispatch reads from a hardcoded local `options` array, the legend renders only numeric `toFixed(1)` strings + the static `"total_score"` literal, and rapid clicks short-circuit via `store.viewMode === value` early-return.

## Known Stubs

None. Both components are fully wired:

- `ViewToggle` reads/writes `store.viewMode` (no mock data path).
- `RampLegend.domain` is bound to `store.rampDomain` in CrossCompareView's template (not a placeholder array).
- The default props (`[0, 100]`, `"total_score"`) are sane fallbacks, not stubs — they only render before the store fetch resolves, then are replaced by the real domain.

## Self-Check: PASSED

- File `Taipei-City-Dashboard-FE/src/components/crosscompare/ViewToggle.vue` — FOUND
- File `Taipei-City-Dashboard-FE/src/components/crosscompare/RampLegend.vue` — FOUND
- File `Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` — FOUND (modified)
- Commit `6a67743` — FOUND
- Commit `31cbd71` — FOUND
- Commit `4520d89` — FOUND
