---
phase: 03-hover-interaction-polish
plan: 05
type: execute
wave: 3
depends_on: ["03-01", "03-02", "03-03", "03-04"]
files_modified: []
files_created:
  - .planning/phases/03-hover-interaction-polish/03-PHASE-SUMMARY.md
autonomous: false
requirements: [CC-04]
tags: [acceptance, build, lint, audit, phase-summary, crosscompare, hover]

must_haves:
  truths:
    - "All 4 prior plans (03-01..03-04) shipped: imports/configs added, popup SFC created, mnth removed, hover wired"
    - "ROADMAP Phase 3 success criterion #1 — code-evident: hover lift + popup (D-01..D-14)"
    - "ROADMAP Phase 3 success criterion #2 — code-evident: hover-on-greyed does nothing (D-12 layer-scoped binding + D-11 belt-and-braces guard)"
    - "ROADMAP Phase 3 success criterion #3 — grep-zero for make-new-thing-here CONFIRMED via grep (D-18)"
    - "All 23 D-IDs (D-01..D-23) audited and evidenced in committed source"
    - "All 4 threat-model entries (T-XSS, T-LEAK, T-REENT, T-DEL from CONTEXT.md security_threat_model_requirement) verified in code"
    - "Final npm run build exit 0"
    - "Browser smoke 4-step user verification list documented for hand-off (deferred per Phase 2 STATE.md Vite cache blocker)"
    - "03-PHASE-SUMMARY.md exists at canonical path"
  artifacts:
    - path: ".planning/phases/03-hover-interaction-polish/03-PHASE-SUMMARY.md"
      provides: "Phase 3 acceptance audit + handoff to /gsd-transition"
      min_lines: 100
  key_links:
    - from: "Phase 3 plans 03-01..03-04 SUMMARYs"
      to: "03-PHASE-SUMMARY.md"
      via: "consolidation"
      pattern: "consolidates"
---

<objective>
Phase 3 acceptance gate. After Plans 03-01..03-04 complete, this plan:

1. Runs the final `npm run build` and confirms exit 0.
2. Audits all 3 ROADMAP Phase 3 success criteria with code-evidence verdicts (criterion #3's grep-zero is the load-bearing test).
3. Audits all 23 D-IDs (D-01..D-23) — every CONTEXT.md decision MUST be evidenced in source.
4. Cross-checks the 4 phase-level threats (T-XSS, T-LEAK, T-REENT, T-DEL) against committed code.
5. Documents the deferred browser smoke (4-step user verification — same shape as Phase 2's deferred smoke, since the Vite cache root-ownership blocker carries over per STATE.md).
6. Writes `.planning/phases/03-hover-interaction-polish/03-PHASE-SUMMARY.md` consolidating Plans 03-01..03-04 SUMMARYs.

This plan has a `checkpoint:human-verify` task at the end — the user is asked to optionally run the browser smoke once they fix the Vite cache permissions; otherwise they sign off on the deferral and Phase 3 ships with the same code-evidence gate Phase 2 used.

Output: 1 NEW summary file. Zero source modifications.

Wave 3, depends on 03-01..03-04. Last plan of Phase 3, last plan of milestone v2.3.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/03-hover-interaction-polish/03-CONTEXT.md
@.planning/phases/03-hover-interaction-polish/03-PATTERNS.md
@.planning/phases/03-hover-interaction-polish/03-01-extrusion-config-PLAN.md
@.planning/phases/03-hover-interaction-polish/03-02-district-popup-PLAN.md
@.planning/phases/03-hover-interaction-polish/03-03-mnth-removal-PLAN.md
@.planning/phases/03-hover-interaction-polish/03-04-hover-handler-PLAN.md
@.planning/phases/02-fe-cross-compare-page/02-06-SUMMARY.md
@./CLAUDE.md
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Final npm run build + grep-zero acceptance gate</name>
  <files>(no source modifications — verification only)</files>

  <read_first>
    - .planning/phases/03-hover-interaction-polish/03-CONTEXT.md (D-18 — the load-bearing grep-zero gate)
    - All four prior plan SUMMARYs (03-01..03-04 — confirm each shipped its content)
  </read_first>

  <action>
**Run these gates in order. Each must pass before proceeding.**

```bash
# Gate 1 — production build
cd /home/yumekuii/works/taipei-city-dashboard/Taipei-City-Dashboard-FE && npm run build 2>&1 | tee /tmp/phase03-build.log
echo "BUILD_EXIT=$?"
```

Expected: `BUILD_EXIT=0`. If non-zero, STOP — read `/tmp/phase03-build.log` to diagnose. Common failures:
- `v-else-if has no matching v-if` → Plan 03-03 Task 1 missed the rewrite at MapView.vue line 156. Re-run.
- `'SideBarLink' is defined but never used` → Plan 03-03 Task 2 didn't delete the import line. Re-run.
- `Cannot find module ../components/crosscompare/DistrictPopup.vue` → Plan 03-02 didn't create the file. Re-run 03-02 first.
- `'CROSSCOMPARE_EXTRUSION_LAYER_ID' is not exported` → Plan 03-01 didn't append to crossCompareConfig.js. Re-run 03-01 first.

```bash
# Gate 2 — load-bearing grep-zero (D-18 / CC-04 acceptance #3)
cd /home/yumekuii/works/taipei-city-dashboard
GREP_OUTPUT=$(grep -r "make-new-thing-here" Taipei-City-Dashboard-FE/src/ 2>/dev/null)
GREP_EXIT=$?
echo "GREP_EXIT=$GREP_EXIT"
echo "GREP_OUTPUT=$GREP_OUTPUT"
test -z "$GREP_OUTPUT" && echo "ACCEPTANCE_3_PASS"
```

Expected: `GREP_EXIT=1`, `GREP_OUTPUT=` (empty), and `ACCEPTANCE_3_PASS` printed. Any match line means Plan 03-03 missed a site — re-run 03-03 to clean it.

```bash
# Gate 3 — directory deleted
test ! -d Taipei-City-Dashboard-FE/src/make-new-thing-here && echo "DIR_DELETED" || echo "DIR_STILL_EXISTS"
```

Expected: `DIR_DELETED`.

```bash
# Gate 4 — Phase 3 file inventory
ls Taipei-City-Dashboard-FE/src/components/crosscompare/DistrictPopup.vue && echo "POPUP_OK"
grep -c "CROSSCOMPARE_EXTRUSION_LAYER_ID\|buildExtrusionPaint\|EXTRUSION_HEIGHT_HOVER\|EXTRUSION_TRANSITION_MS" Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js
grep -cE 'setFeatureState|createApp\(DistrictPopup|popupApp\.unmount|map\.on\("mouse' Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue
```

Expected:
- `POPUP_OK` printed (DistrictPopup.vue exists)
- crossCompareConfig.js: ≥ 6 matches across the 4 new symbols
- CrossCompareView.vue: ≥ 6 matches (setFeatureState ≥ 1, createApp(DistrictPopup ≥ 1, popupApp.unmount ≥ 1, map.on("mouse..." ≥ 3)

```bash
# Gate 5 — D-20 off-limits files (Phase 2 surface untouched)
PHASE2_BOUNDARY=$(git log --grep="acceptance SUMMARY" --pretty=%H -n 1 -- .planning/phases/02-fe-cross-compare-page/ 2>/dev/null || echo "36da7e8")
for f in \
  Taipei-City-Dashboard-FE/src/store/mapStore.js \
  Taipei-City-Dashboard-FE/src/assets/configs/mapbox/mapConfig.js \
  Taipei-City-Dashboard-FE/src/assets/configs/mapbox/mapStyle.js \
  Taipei-City-Dashboard-FE/src/store/crossCompareStore.js \
  Taipei-City-Dashboard-FE/src/components/crosscompare/ViewToggle.vue \
  Taipei-City-Dashboard-FE/src/components/crosscompare/RampLegend.vue \
  Taipei-City-Dashboard-FE/src/router/index.js \
  Taipei-City-Dashboard-FE/src/components/utilities/bars/NavBar.vue
do
  DIFF_LINES=$(git diff "$PHASE2_BOUNDARY" HEAD -- "$f" | wc -l)
  echo "$f: $DIFF_LINES diff lines"
done
```

Expected: every entry is `0 diff lines` — D-20 / D-19 boundary preserved.

If ANY gate fails, STOP and produce a remediation plan. The orchestrator will route a continuation executor to fix it before re-running this acceptance task.
  </action>

  <verify>
    <automated>cd /home/yumekuii/works/taipei-city-dashboard && grep -rE "make-new-thing-here" Taipei-City-Dashboard-FE/src/ ; echo "GREP_EXIT=$?" ; cd Taipei-City-Dashboard-FE && npm run build 2>&1 | tail -3 | grep "built in" || echo "BUILD_FAILED"</automated>
    <gates>
      - All 5 gates above pass.
      - `BUILD_EXIT=0`
      - `GREP_EXIT=1` (no matches)
      - `DIR_DELETED` printed
      - `POPUP_OK` printed
      - all 8 off-limits files show 0 diff lines
    </gates>
  </verify>

  <acceptance_criteria>
    - All 5 gates pass; output captured for the SUMMARY.
    - Build log saved to `/tmp/phase03-build.log` for the SUMMARY's evidence section.
    - No off-limits-file boundary violations.
    - Any gate failure halts the plan with a remediation note.
  </acceptance_criteria>

  <done>
All 5 hard gates pass. Phase 3 source state matches Plans 03-01..03-04 collective contracts.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: 23-D-ID audit + 4-threat audit + 3-criteria audit</name>
  <files>(no source modifications — verification only)</files>

  <read_first>
    - .planning/phases/03-hover-interaction-polish/03-CONTEXT.md (full — all 23 D-IDs to audit)
    - .planning/phases/03-hover-interaction-polish/03-01..04-PLAN.md (each plan's must_haves to cross-check)
    - .planning/phases/03-hover-interaction-polish/03-01..04-SUMMARY.md (each plan's actually-shipped evidence)
  </read_first>

  <action>
**Build the audit tables for the SUMMARY (next task) by gathering grep evidence for each D-ID, threat, and ROADMAP criterion.**

For each D-ID below, run the corresponding grep and record the output. **The list maps D-IDs → grep gates (expected count ≥ 1 unless noted):**

- **D-01** — `setFeatureState` in CrossCompareView.vue (≥ 1; Plans 03-01 / 03-04)
- **D-02** — `CROSSCOMPARE_EXTRUSION_LAYER_ID` in crossCompareConfig.js (≥ 1) AND in CrossCompareView.vue (≥ 1)
- **D-03** — `case` + `feature-state` + `hover` co-occurring in crossCompareConfig.js (read file inline; the `case` array literal contains all three tokens)
- **D-04** — `fill-extrusion-height-transition` in crossCompareConfig.js (≥ 1) AND `EXTRUSION_TRANSITION_MS` references (≥ 2)
- **D-05** — `fill-extrusion-color` in crossCompareConfig.js (≥ 1)
- **D-06** — `createApp(DistrictPopup` in CrossCompareView.vue (≥ 1) AND `test -f DistrictPopup.vue`
- **D-07** — `anchor: "bottom"` AND `setLngLat(e.lngLat)` in CrossCompareView.vue (each ≥ 1)
- **D-08** — `districtName`, `rank`, `totalScore`, `courseScore`, `inspectionScore` in DistrictPopup.vue (collectively ≥ 5 references)
- **D-09** — `toFixed` AND `Number.isFinite` in DistrictPopup.vue (≥ 2 combined)
- **D-10** — `var(--color-component-background)`, `var(--color-highlight)`, `var(--color-normal-text)` in DistrictPopup.vue (each ≥ 1)
- **D-11** — `disabledDistricts` in CrossCompareView.vue (≥ 1, belt-and-braces guard)
- **D-12** — `map.on("mousemove", CROSSCOMPARE_FILL_LAYER_ID`, `map.on("mouseenter", CROSSCOMPARE_FILL_LAYER_ID`, `map.on("mouseleave", CROSSCOMPARE_FILL_LAYER_ID` (each ≥ 1; total ≥ 3). And confirm NO event bound to `CROSSCOMPARE_GREY_LAYER_ID`.
- **D-13** — `cursor = "pointer"` AND `cursor = ""` in CrossCompareView.vue (≥ 2 combined)
- **D-14** — `popupApp.unmount` AND `popup.remove` in CrossCompareView.vue (≥ 2 combined)
- **D-15** — `test ! -d Taipei-City-Dashboard-FE/src/make-new-thing-here` exits 0
- **D-16** — `make-new-thing-here\|MakeNewThingHerePanel\|isMakeNewThingHere` in MapView.vue (== 0)
- **D-17** — `make-new-thing-here\|SideBarLink` in SideBar.vue (== 0)
- **D-17b** — `make-new-thing-here` in contentStore.js (== 0)
- **D-18** — `grep -r "make-new-thing-here" Taipei-City-Dashboard-FE/src/` returns ZERO lines (the load-bearing gate)
- **D-19** — All 6 expected files modified/created/deleted as listed in `must_haves.artifacts` of plans 03-01..03-04; off-limits files (D-20) untouched
- **D-20** — Gate 5 from Task 1 — 8 off-limits files all `0 diff lines`
- **D-21** — `v-html` in DistrictPopup.vue (== 0; XSS mitigation)
- **D-22** — `popupApp.unmount` AND `popup.remove` in CrossCompareView.vue (≥ 2; WebGL/Vue leak fix). Visually confirm `onBeforeUnmount` block calls `teardownPopup()` BEFORE `map.remove()`.
- **D-23** — `hoveredFeatureId !== districtName` in CrossCompareView.vue (≥ 1; re-entrancy coalesce)

**For the 4 phase-level threats (from CONTEXT.md security_threat_model_requirement):**

| Threat | Mitigation Code | Verification |
|--------|----------------|--------------|
| T-XSS | Vue mustache escape; no v-html in DistrictPopup.vue | `grep -c "v-html\|innerHTML\|outerHTML" DistrictPopup.vue CrossCompareView.vue` == 0 |
| T-LEAK | popup?.remove() + popupApp?.unmount() in onBeforeUnmount AND per-leave teardown | `grep -c "popup.remove\|popupApp.unmount" CrossCompareView.vue` ≥ 2; visually confirm onBeforeUnmount calls teardownPopup() |
| T-REENT | hoveredFeatureId !== districtName coalesce | `grep -c "hoveredFeatureId !== districtName" CrossCompareView.vue` ≥ 1 |
| T-DEL | grep-zero gate catches stale references | `grep -r "make-new-thing-here" src/` empty |

**For the 3 ROADMAP Phase 3 success criteria:**

| # | Criterion | Code Evidence | Browser Smoke |
|---|-----------|---------------|----------------|
| 1 | Hover lifts < 200ms; popup shows district + total + rank + per-component | D-01..D-14 all evidenced; transition 150 ms < 200 ms | DEFER: hover 中正區 in 雙北 → popup `中正區 / #1 / 63.9 / 課程 28.1 / 抽查 35.8` + visible lift |
| 2 | Hover-on-greyed = nothing | D-12 layer-scoped binding; D-11 belt-and-braces guard | DEFER: in 台北 view, hover 烏來區 → no popup, no lift, no cursor change |
| 3 | grep-r make-new-thing-here zero | Gate 2 from Task 1 confirms | (no browser test needed — grep is the gate) |

Record all results into structured tables for Task 3's SUMMARY write. If ANY D-ID has zero evidence, STOP and route to remediation — the orchestrator will spawn a continuation executor to fix the missing decision.
  </action>

  <verify>
    <automated>cd /home/yumekuii/works/taipei-city-dashboard && grep -c "setFeatureState" Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue && grep -c "v-html" Taipei-City-Dashboard-FE/src/components/crosscompare/DistrictPopup.vue ; echo "AUDIT_COMPLETE=$?"</automated>
    <gates>
      - All 23 D-IDs evidenced (every grep returns the expected count)
      - All 4 threats mitigated and verified
      - All 3 ROADMAP criteria #1, #2 are CODE-EVIDENT (browser deferred); #3 is grep-confirmed
    </gates>
  </verify>

  <acceptance_criteria>
    - Audit tables filled with grep counts and pass/fail flags.
    - No D-ID has zero evidence — if ANY does, the plan halts and routes to remediation.
    - All threat mitigations pass their grep gates.
    - The audit data is captured in a markdown-ready format for Task 3.
  </acceptance_criteria>

  <done>
23 D-IDs audited (23/23 evidenced). 4 threats verified. 3 ROADMAP criteria status established (2 code-evident + 1 grep-confirmed; 2 with deferred browser smoke).
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Write 03-PHASE-SUMMARY.md consolidating Plans 03-01..03-04</name>
  <files>.planning/phases/03-hover-interaction-polish/03-PHASE-SUMMARY.md</files>

  <read_first>
    - The audit tables from Task 2
    - Plans 03-01..03-04 SUMMARYs (each plan's individual outputs)
    - .planning/phases/02-fe-cross-compare-page/02-06-SUMMARY.md (template/style precedent)
  </read_first>

  <action>
Write `03-PHASE-SUMMARY.md` to `.planning/phases/03-hover-interaction-polish/03-PHASE-SUMMARY.md`. Use the same heading structure Phase 2's `02-06-SUMMARY.md` used (mirror that style for the orchestrator's automated parsing). Use the Write tool — never heredoc.

Required sections (copy the structure from `02-06-SUMMARY.md`):

**1. Frontmatter** — phase / plan / wave / depends_on / status / date / requirements / dependency_graph / metrics. Match `02-06-SUMMARY.md` schema. Status: `complete`. Set `completed_plans: 5` and `total_plans: 5`.

**2. One-liner** — single sentence summary of what shipped. Example: "Phase 3 acceptance — `npm run build` exit 0, all 6 mnth references gone (`grep -r` ZERO matches), DistrictPopup.vue + extrusion config + hover handler all shipped, all 23 D-IDs evidenced, browser smoke deferred to user."

**3. Build / Lint Status (Task 1)** — table with the 5 gates from Task 1 + their pass/fail + evidence (grep counts, file existence, build log location).

**4. Files Shipped This Phase** — table:

| File | Status | Lines | Plan |
|------|--------|-------|------|
| Taipei-City-Dashboard-FE/src/components/crosscompare/DistrictPopup.vue | NEW | ~95 | 03-02 |
| Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js | EDIT | +~25 | 03-01 |
| Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue | EDIT | +~92 | 03-01 + 03-04 |
| Taipei-City-Dashboard-FE/src/views/MapView.vue | EDIT | -~9 | 03-03 |
| Taipei-City-Dashboard-FE/src/components/utilities/bars/SideBar.vue | EDIT | -~7 | 03-03 |
| Taipei-City-Dashboard-FE/src/store/contentStore.js | EDIT | -~8 | 03-03 |
| Taipei-City-Dashboard-FE/src/make-new-thing-here/ | DELETE | -~50 (2 files) | 03-03 |

Net delta: actual numbers from `git diff` output.

**5. D-XX Audit Table (D-01..D-23)** — for each D-ID, columns: ID / Decision summary / Honoured? (✓/✗) / Evidence (grep count, file path).

**6. Threat-Mitigation Verification** — table for T-XSS / T-LEAK / T-REENT / T-DEL with columns: Threat / Mitigation / Evidence / Status. Block-on severity items (T-LEAK, T-DEL high, T-XSS high) all PASS.

**7. ROADMAP Phase 3 Success Criteria** — table:

| # | Criterion | Code Evidence | Status |
|---|-----------|---------------|--------|
| 1 | Hover lift + popup | D-01..D-14 evidenced; transition 150ms | EVIDENCED ✓ — runtime hover deferred |
| 2 | Hover-on-greyed = nothing | D-12 + D-11 evidenced | EVIDENCED ✓ — runtime hover deferred |
| 3 | grep-r make-new-thing-here zero | grep-zero confirmed | EVIDENCED ✓ — grep is the gate |

**8. Off-Limits-File Audit (D-20)** — 8 files, all 0 diff lines vs Phase 2 boundary.

**9. Deferred Verification (Browser Smoke)** — explanatory paragraph then the **CC-04-specific 4-step verification**:

> The dev-server-driven smoke test cannot run end-to-end due to root-owned `node_modules/.vite/deps`. Production build (`npm run build`) passes — code at minimum compiles and lints. Same three remediation paths as Phase 2: chown / wipe / docker.

```
1. Hover 中正區 in 雙北 view
   Expected: visible 4000m lift (smooth 150ms transition); popup at cursor showing
            "中正區" / "#1" pill / large "63.9" / 課程分數 28.1 / 抽查分數 35.8

2. Hover 萬華區 in 雙北 view
   Expected: visible lift; popup "萬華區" / "#41" / "10.6" / per-component scores

3. Toggle to 台北 view, hover 烏來區
   Expected: NOTHING — no lift, no popup, no cursor change (烏來區 is greyed in 台北 mode)

4. Navigate /crosscompare → /dashboard → /crosscompare → /mapview → /crosscompare (×3)
   Expected: no console errors, no leaked Mapbox / Vue instances
            Open DevTools Memory tab and confirm heap doesn't keep growing across navigations
```

**10. Plans Shipped** — list 03-01..03-04 with their one-line summaries.

**11. Phase 3 Hand-off** — bullet list for orchestrator's `/gsd-transition`:

```
✓ All 4 implementation plans + this acceptance plan complete
✓ All 23 D-IDs evidenced
✓ All 4 threats mitigated
✓ ROADMAP success criteria #1, #2 code-evident; #3 grep-confirmed
✓ npm run build exit 0
✓ Pre-existing dirty mapConfig.js working-tree change still UNRESOLVED (carried over from Phase 2 STATE.md item 1) — user-decision item, NOT a Phase 3 deliverable

Next:
- /gsd-transition  (commits state, marks Phase 3 + milestone v2.3 complete)
- /gsd-complete-milestone  (after browser smoke confirms; user-driven)
```

**12. Open Items / Carry-overs** — same shape as Phase 2: dirty mapConfig.js, browser smoke deferral, Vite cache permission, no test framework, etc.

**13. Verification (Plan-Level)** — same gate-table shape as `02-06-SUMMARY.md` "Verification (Plan-Level)" section.

**14. Self-Check** — checklist of programmatically verifiable claims (all should be checked off).

Write it all in markdown. Hard tabs OK in code blocks. Use absolute paths from repo root for any inline file references. Final file should be ≥ 100 lines.
  </action>

  <verify>
    <automated>test -f /home/yumekuii/works/taipei-city-dashboard/.planning/phases/03-hover-interaction-polish/03-PHASE-SUMMARY.md && wc -l /home/yumekuii/works/taipei-city-dashboard/.planning/phases/03-hover-interaction-polish/03-PHASE-SUMMARY.md | awk '$1 >= 100 {print "OK"}'</automated>
    <gates>
      - File exists at canonical path
      - File ≥ 100 lines
      - Frontmatter contains `status: complete` and `requirements: [CC-04]`
      - All 14 sections from the action above are present (visual review)
    </gates>
  </verify>

  <acceptance_criteria>
    - 03-PHASE-SUMMARY.md exists at `.planning/phases/03-hover-interaction-polish/03-PHASE-SUMMARY.md`
    - File length ≥ 100 lines
    - All 14 required sections present in order
    - D-XX audit table covers all 23 IDs
    - Threat verification table covers T-XSS / T-LEAK / T-REENT / T-DEL
    - 4-step browser smoke checklist matches the planning_context spec verbatim
    - Self-Check section has all items checked off (`[x]`)
  </acceptance_criteria>

  <done>
03-PHASE-SUMMARY.md is written, ≥ 100 lines, captures all 14 sections, evidences all 23 D-IDs and 4 threats, and documents the deferred browser smoke for the user.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 4: Browser smoke checkpoint (deferred — user signs off on deferral OR runs locally)</name>

  <files>(checkpoint — no files modified by Claude; user runs browser smoke locally)</files>

  <action>
**Pause execution and surface the browser-smoke checkpoint to the user.** The user picks Option A (defer) or Option B (run smoke locally). The executor MUST NOT proceed until the user replies. See `<what-built>` and `<how-to-verify>` below for the full checkpoint payload to render to the user.
  </action>

  <verify>
    <automated>echo "checkpoint:human-verify — execution paused; awaiting user reply (approved | defer-smoke | failure-description)"</automated>
    <manual>User has replied with one of: approved, defer-smoke, or a failure description. The orchestrator records the reply in STATE.md Open verification for traceability. No build gate runs in this task — Tasks 1-3 already enforced npm run build exit 0 and grep-zero.</manual>
  </verify>

  <done>
User has signed off (approved / defer-smoke) or reported a failure. If failure, orchestrator spawns a continuation executor against the failure details. If approved or deferred, Phase 3 is COMPLETE and the next step is /gsd-transition.
  </done>

  <what-built>
Phase 3 ships the levitate hover animation + popup on `/crosscompare` and removes the `make-new-thing-here` synthetic-index injection slot. All code-level acceptance gates pass:
- `npm run build` exit 0
- `grep -r "make-new-thing-here" Taipei-City-Dashboard-FE/src/` returns ZERO matches
- All 23 CONTEXT.md decisions evidenced in source
- All 4 threats (T-XSS, T-LEAK, T-REENT, T-DEL) mitigated and verified

The only remaining gate is the user's manual browser verification, which is environmentally blocked in the executor sandbox (root-owned `node_modules/.vite/deps`, carried over from Phase 2 STATE.md). The user has two options below.
  </what-built>

  <how-to-verify>

**Option A — Defer browser smoke (RECOMMENDED if Vite cache is still root-owned):**

Sign off on the deferral. Phase 3 ships with code-evidence parity to Phase 2 (which also deferred its browser smoke for the same reason). The orchestrator records the deferral in STATE.md → `Open verification` and proceeds to `/gsd-transition`.

Reply: `defer-smoke`

**Option B — Run browser smoke now:**

1. Resolve the Vite cache permission (one of three paths, same as Phase 2):

   ```bash
   # Path A: chown
   sudo chown -R $USER /home/yumekuii/works/taipei-city-dashboard/Taipei-City-Dashboard-FE/node_modules/.vite

   # Path B: wipe
   sudo rm -rf /home/yumekuii/works/taipei-city-dashboard/Taipei-City-Dashboard-FE/node_modules/.vite
   cd /home/yumekuii/works/taipei-city-dashboard/Taipei-City-Dashboard-FE && npm install

   # Path C: Docker stack
   docker network create br_dashboard 2>/dev/null
   docker compose -f /home/yumekuii/works/taipei-city-dashboard/docker/docker-compose-db.yaml up -d
   docker compose -f /home/yumekuii/works/taipei-city-dashboard/docker/docker-compose.yaml up -d
   ```

2. Start the dev server:
   ```bash
   cd /home/yumekuii/works/taipei-city-dashboard/Taipei-City-Dashboard-FE && DOCKER_COMPOSE=false npm run dev
   ```

3. Visit `http://localhost:80/crosscompare` (Vite) or `http://localhost:8080/crosscompare` (Docker).

4. Run the **CC-04 4-step verification**:

   **Step 1 — Hover 中正區 in 雙北 view (default):**
   - Expected: visible 4000 m lift (smooth 150 ms transition)
   - Expected: popup at cursor showing `中正區` (h3) + `#1` pill + large `63.9` total + 2-cell grid `課程分數 28.1` / `抽查分數 35.8`
   - Cursor changes to pointer over the active fill

   **Step 2 — Hover 萬華區 in 雙北 view:**
   - Expected: visible lift
   - Expected: popup `萬華區` / `#41` / `10.6` (dimmest district / lowest rank in fixture)

   **Step 3 — Toggle to 台北 view (top-left ViewToggle), hover 烏來區 (in 新北 area, now greyed):**
   - Expected: NOTHING — no lift, no popup, no cursor change (D-12 layer-scoped binding + D-11 belt-and-braces)

   **Step 4 — Navigation cleanup smoke (T-LEAK):**
   - Navigate `/crosscompare → /dashboard → /crosscompare → /mapview → /crosscompare` 3 times
   - Expected: no console errors, no `WebGL: too many active contexts` warnings
   - Open DevTools Memory tab → take heap snapshot before and after → heap doesn't keep growing linearly (some growth is normal; unbounded leak is not)

5. If any step fails, capture the symptom (console error, missing popup, wrong values) and reply with the failure details. The orchestrator will spawn a continuation executor to fix.

If all steps pass, reply: `approved`
  </how-to-verify>

  <resume-signal>Reply `approved` (smoke passed), `defer-smoke` (defer to a later session), or describe any failure observed during browser smoke.</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Acceptance gate (grep + build) → orchestrator (`/gsd-transition`) | The gate output flows to STATE.md as the canonical proof of Phase 3 done-ness. Tampering would mean a future session reads "Phase 3 complete" but the code still has stale references. |
| Browser smoke deferral → user trust | The user must trust the code-evidence audit as a proxy for runtime correctness. Phase 2 used this same deferral pattern; precedent is established. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-05-01 | Tampering | A previous plan (03-01..03-04) silently failed to ship its content; the SUMMARY claims "complete" without evidence | mitigate | Task 1 enforces 5 hard gates BEFORE the SUMMARY is written. Task 2 enforces 23 D-ID grep audits BEFORE the SUMMARY is written. Failure of any gate halts the plan and routes to remediation. The grep-zero gate (D-18) is the load-bearing structural test. |
| T-03-05-02 | Repudiation | Future session sees "Phase 3 complete" but a regression appears | accept | Code-evidence audit is the strongest proxy available without a test framework (CLAUDE.md notes "no `npm test`"). Browser smoke is the runtime confirmation; deferral risk is acknowledged. Future test infrastructure (per Phase 2 STATE.md "Open Items") would close this gap. |
| T-03-05-03 | Information Disclosure | SUMMARY.md leaks something | n/a | SUMMARY contains only architectural prose, file paths, grep counts, and public commit hashes. No credentials, PII, or secrets. |

**Block-on severity:** T-03-05-01 (tampering / silent failure) is HIGH — the 5+23 hard gates in Tasks 1-2 are the structural enforcement. Without all gates passing, the SUMMARY MUST NOT be written.
</threat_model>

<verification>
- All 5 gates from Task 1 pass (build, grep-zero, dir deleted, file inventory, off-limits 0 diff)
- All 23 D-IDs from Task 2 audit return ≥ expected count
- All 4 threats verified
- 03-PHASE-SUMMARY.md exists at canonical path with ≥ 100 lines and all 14 sections
- User signs off (or defers per Phase 2 precedent)
</verification>

<success_criteria>
- Phase 3 source state matches Plans 03-01..03-04 collective contracts.
- All 23 D-IDs evidenced; all 4 threats mitigated; all 3 ROADMAP success criteria addressed.
- 03-PHASE-SUMMARY.md is the canonical handoff artifact for `/gsd-transition`.
- User has two clear paths: defer (Phase 2 precedent) or run smoke locally.
- Pre-existing `mapConfig.js` working-tree dirty change is documented as a non-blocking carry-over (NOT a Phase 3 deliverable).
- Phase 3 = Milestone v2.3 final phase; on `/gsd-transition` the milestone progresses to "complete pending user smoke / `/gsd-complete-milestone`".
</success_criteria>

<output>
After completion, the canonical output is `.planning/phases/03-hover-interaction-polish/03-PHASE-SUMMARY.md` (created in Task 3). No additional per-plan SUMMARY for plan 03-05 is needed — the phase-level SUMMARY consolidates all five plans.

The orchestrator's next step is `/gsd-transition` which:
1. Reads `03-PHASE-SUMMARY.md`
2. Marks Phase 3 complete in `.planning/STATE.md` and `ROADMAP.md`
3. Records the deferred browser smoke as an open verification item
4. Updates `MILESTONES.md` to mark v2.3 as "complete pending user smoke"
5. Suggests `/gsd-complete-milestone` once the user runs the smoke and confirms
</output>
</content>
</invoke>