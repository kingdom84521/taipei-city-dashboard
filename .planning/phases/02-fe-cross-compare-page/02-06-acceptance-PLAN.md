---
phase: 02-fe-cross-compare-page
plan: 06
type: execute
wave: 3
depends_on: ["02-01", "02-02", "02-03", "02-04", "02-05"]
files_modified: []
autonomous: false
requirements: [CC-01, CC-02, CC-03]
tags: [acceptance, lint, build, smoke, verification]
must_haves:
  truths:
    - "cd Taipei-City-Dashboard-FE && npm run build exits 0 (eslint --fix + vite build both pass)"
    - "All 4 ROADMAP Phase 2 success criteria are observably true on a running dev server"
    - "make-new-thing-here is UNCHANGED — Phase 2 leaves it alone (Phase 3 deletes it)"
    - "mapStore.js and mapConfig.js have NO Phase 2 diff (D-16)"
    - "All requirement IDs CC-01, CC-02, CC-03 are observable end-to-end"
  artifacts:
    - path: ".planning/phases/02-fe-cross-compare-page/02-06-SUMMARY.md"
      provides: "Phase 2 acceptance report — gates passed, gates failed, blockers for Phase 3"
      min_lines: 30
  key_links:
    - from: "Plan 02-06"
      to: "All Phase 2 plans"
      via: "verification gate sweep"
      pattern: "depends_on: 02-01..02-05"
---

<objective>
Final acceptance gate for Phase 2. Runs the build + lint, executes the four ROADMAP
success criteria as a manual smoke pass, verifies that no off-limits files were
touched, and produces the Phase 2 acceptance summary that unblocks Phase 3 (hover +
make-new-thing-here removal).

This plan does NOT modify production code — it only RUNS verification commands and
RECORDS the results.

Output: `.planning/phases/02-fe-cross-compare-page/02-06-SUMMARY.md` containing pass/
fail per ROADMAP criterion, lint/build status, threat-mitigation verification log, and
hand-off notes for Phase 3.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/STATE.md
@.planning/phases/02-fe-cross-compare-page/02-CONTEXT.md
@.planning/phases/02-fe-cross-compare-page/02-PATTERNS.md
@./CLAUDE.md
@.planning/fixtures/crosscompare_scores_v1.json
</context>

<tasks>

<task type="auto">
  <name>Task 1: Run npm run build (eslint --fix + vite build) and capture exit code + warnings</name>
  <files></files>
  <read_first>
    - ./CLAUDE.md (FE build command: `npm run build` runs `eslint . --fix && vite build`)
    - Taipei-City-Dashboard-FE/package.json (scripts.build = "eslint . --fix && vite build")
  </read_first>
  <action>
    Run from the repo root:

    ```bash
    cd Taipei-City-Dashboard-FE && npm run build 2>&1 | tee /tmp/phase02-build.log
    BUILD_EXIT=${PIPESTATUS[0]}
    echo "BUILD_EXIT=$BUILD_EXIT"
    ```

    Then inspect `/tmp/phase02-build.log`:
    - Exit code MUST be 0.
    - No new ESLint errors related to Phase 2 files.
    - eslint may auto-fix indentation (`--fix` flag); that is fine. Re-run a second time and confirm zero diffs:

    ```bash
    git diff --name-only Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue Taipei-City-Dashboard-FE/src/store/crossCompareStore.js Taipei-City-Dashboard-FE/src/assets/configs/crossCompareConfig.js Taipei-City-Dashboard-FE/src/components/crosscompare/ViewToggle.vue Taipei-City-Dashboard-FE/src/components/crosscompare/RampLegend.vue Taipei-City-Dashboard-FE/src/router/index.js Taipei-City-Dashboard-FE/src/components/utilities/bars/NavBar.vue
    ```

    If `--fix` modified any of these files, stage them — those modifications are still in scope for Phase 2.

    If BUILD_EXIT is non-zero, READ the error in the log and fix it (typical causes: missing import, mismatched export name, an unused-vars violation). DO NOT mask errors with eslint-disable directives; fix the root cause. After a fix, re-run `npm run build` until it exits 0.
  </action>
  <verify>
    <automated>cd Taipei-City-Dashboard-FE && npm run build > /tmp/phase02-build.log 2>&1; echo "BUILD_EXIT=$?" >> /tmp/phase02-build.log; tail -30 /tmp/phase02-build.log; grep -q 'BUILD_EXIT=0' /tmp/phase02-build.log</automated>
  </verify>
  <acceptance_criteria>
    - `BUILD_EXIT=0` line written to /tmp/phase02-build.log
    - No `error` lines in the eslint output for `src/views/CrossCompareView.vue`, `src/store/crossCompareStore.js`, `src/assets/configs/crossCompareConfig.js`, `src/components/crosscompare/*.vue`
    - vite build emits a `dist/` directory (or whatever Vite's default output dir is)
  </acceptance_criteria>
  <done>
    npm run build is green. The dist/ output exists. Phase 2 code is lint-clean and bundleable.
  </done>
</task>

<task type="auto">
  <name>Task 2: Verify no off-limits files were touched (mapStore.js, mapConfig.js, make-new-thing-here, MapView.vue, SideBar.vue)</name>
  <files></files>
  <read_first>
    - .planning/phases/02-fe-cross-compare-page/02-CONTEXT.md (D-16: do NOT touch mapStore.js or mapConfig.js)
    - .planning/ROADMAP.md (Phase 3 owns make-new-thing-here removal)
  </read_first>
  <action>
    From the repo root, verify the following files have ZERO diff vs the Phase 1 commit (`4f05999` per current HEAD):

    ```bash
    PHASE1_COMMIT=4f05999
    for f in \
      Taipei-City-Dashboard-FE/src/store/mapStore.js \
      Taipei-City-Dashboard-FE/src/assets/configs/mapbox/mapConfig.js \
      Taipei-City-Dashboard-FE/src/views/MapView.vue \
      Taipei-City-Dashboard-FE/src/components/utilities/bars/SideBar.vue ; do
        echo "=== $f ==="
        git diff $PHASE1_COMMIT HEAD -- "$f" | head -5
    done
    ```

    Expected output: empty diffs for all 4 files.

    Also verify `make-new-thing-here/` is intact:

    ```bash
    test -d Taipei-City-Dashboard-FE/src/make-new-thing-here && \
      grep -r 'make-new-thing-here' Taipei-City-Dashboard-FE/src/views/MapView.vue | head
    ```

    Expected: directory still exists; `MapView.vue` still references `make-new-thing-here`. Phase 3 will remove these.

    If ANY of these files changed in Phase 2, STOP and revert the change (it is a D-16 / Phase 3 boundary violation). Phase 2 must NOT touch these.
  </action>
  <verify>
    <automated>cd /home/yumekuii/works/taipei-city-dashboard && \
test -z "$(git diff 4f05999 HEAD -- Taipei-City-Dashboard-FE/src/store/mapStore.js)" && \
test -z "$(git diff 4f05999 HEAD -- Taipei-City-Dashboard-FE/src/assets/configs/mapbox/mapConfig.js)" && \
test -z "$(git diff 4f05999 HEAD -- Taipei-City-Dashboard-FE/src/views/MapView.vue)" && \
test -z "$(git diff 4f05999 HEAD -- Taipei-City-Dashboard-FE/src/components/utilities/bars/SideBar.vue)" && \
test -d Taipei-City-Dashboard-FE/src/make-new-thing-here && \
grep -q 'make-new-thing-here' Taipei-City-Dashboard-FE/src/views/MapView.vue</automated>
  </verify>
  <acceptance_criteria>
    - `git diff 4f05999 HEAD -- mapStore.js mapConfig.js MapView.vue SideBar.vue` is empty for all four files
    - `make-new-thing-here/` directory still exists and is referenced from `MapView.vue`
  </acceptance_criteria>
  <done>
    Confirmed: D-16 honoured. Phase 3 boundaries respected. The mapboxConfig.js file in the working tree (`M Taipei-City-Dashboard-FE/src/assets/configs/mapbox/mapConfig.js` from the initial git status) is a PRE-Phase 2 modification — verify it's unrelated to Phase 2 (likely a stash from earlier work). If `git diff 4f05999 HEAD -- mapConfig.js` is non-empty, BLOCK and ask the user to confirm the modification is intentional and pre-Phase 2.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Manual smoke pass — all 4 ROADMAP Phase 2 success criteria</name>
  <what-built>
    Phase 2 ships: a new top-level /crosscompare route, a NavBar entry, a Mapbox-rendered district choropleth coloured by total_score, a working 台北 / 雙北 toggle, a colour-ramp legend. All using zero new packages. mapStore / mapConfig untouched.
  </what-built>
  <how-to-verify>
    Run `cd Taipei-City-Dashboard-FE && npm run dev` and step through every ROADMAP Phase 2 success criterion.

    **Criterion #1 — Visiting http://localhost:8080/crosscompare resolves a new view (no 404, no MapView fallback) and shows a Mapbox base map centred on 雙北:**
    - Open URL.
    - Mapbox dark base map renders.
    - URL stays on `/crosscompare` (no redirect to `/dashboard` or `/mapview`).
    - Map is centred roughly on the 雙北 area at zoom ≈ 9.5.
    - DevTools Network: exactly one `/api/v1/crosscompare/scores?view=metrotaipei` request returning `{status:"success", data:[41 rows]}`.

    **Criterion #2 — NavBar shows a new entry that navigates to /crosscompare:**
    - Look at NavBar — `跨區比較` entry between `儀表板總覽` and `地圖交叉比對`.
    - Click `儀表板總覽` then click `跨區比較` — URL navigates to /crosscompare.
    - Click `地圖交叉比對` — URL navigates to /mapview, which still works (Phase 2 broke nothing).
    - Click back to `跨區比較` — URL returns to /crosscompare; map remounts.

    **Criterion #3 — Toggle between 台北 and 雙北 updates the visible/enabled district set within < 200ms; greyed districts use a desaturated colour at reduced opacity and non-interactive:**
    - Click `台北` — 29 新北 districts grey out (#3a3a3a / 0.35 opacity / muted #555555 border) within ≈ Mapbox's next render frame (well under 200ms).
    - Click `雙北` — all 41 districts repaint with their score colours.
    - DevTools Network: STILL exactly one `/api/v1/crosscompare/scores` request — toggling does NOT refetch.
    - Refresh the page after clicking 台北. Page reloads with viewMode='taipei' (D-09 localStorage persistence).
    - "Non-interactive" for greyed districts: in Phase 2 we have no hover handler at all, so this is trivially true. Phase 3's hover handler will need to honour `store.disabledDistricts` — that seam is shipped (T-02-05-01).

    **Criterion #4 — District fills follow a sequential colour ramp on total_score; highest scoring (中正區=63.88) is the brightest band; lowest (萬華區=10.62) the dimmest. Coverage matches the BE feature payload (12 / 41 districts):**
    - In `雙北` mode (default after first refresh-with-clean-localStorage):
      - 中正區 (Zhongzheng — central 臺北市) is the BRIGHTEST cyan-tinted district.
      - 烏來區 (south-east mountainous 新北 area, rank 2 at 60.0) and 五股區 (rank 3 at 59.78) are also brightly coloured.
      - 萬華區 (西側 萬華 — Wanhua) is the DIMMEST teal-tinted district.
    - In `台北` mode:
      - 12 臺北 districts coloured; 29 新北 districts greyed.
      - The 12 臺北 districts retain their colours from the same ramp (中正區 still brightest among the 12).
    - The colour-ramp legend (bottom-right) shows numeric labels matching the rampDomain (≈ `10.6 — 63.9`).

    **Threat-mitigation verification (T-02-02-01):**
    - Open DevTools console. Run `localStorage.setItem("crossCompare.viewMode", "<script>alert(1)</script>")`.
    - Refresh.
    - Page should load with `metrotaipei` view (whitelist rejected the bogus value).
    - No alert. No console error.

    **Threat-mitigation verification (T-02-04-03):**
    - Navigate from /crosscompare → /dashboard several times.
    - Inspect `console` for any "WebGL: too many active contexts" warnings — there should be NONE (each `onBeforeUnmount` calls `map.remove()`).

    Document each of the 4 criteria pass/fail in writing in the SUMMARY (Task 4).
  </how-to-verify>
    <action>
    Stop here and wait for the user to perform the full ROADMAP acceptance smoke listed in <how-to-verify>. The user steps through all 4 ROADMAP Phase 2 success criteria plus the two threat-mitigation verifications, recording PASS/FAIL per row. Do NOT auto-resume; the resulting PASS/FAIL data feeds Task 4's SUMMARY.md.
  </action>
  <verify>User types 'approved' (all 4 criteria + 2 threats PASS) or describes which criterion failed.</verify>
  <done>Phase 2 acceptance smoke complete; user has the data to populate the SUMMARY.md in Task 4.</done>
  <resume-signal>
    Type "approved" if all 4 ROADMAP criteria pass + both threat verifications. If any fail, describe which criterion + what was observed.
  </resume-signal>
</task>

<task type="auto">
  <name>Task 4: Write 02-06-SUMMARY.md acceptance report</name>
  <files>.planning/phases/02-fe-cross-compare-page/02-06-SUMMARY.md</files>
  <read_first>
    - $HOME/.claude/get-shit-done/templates/summary.md (template structure)
    - .planning/phases/02-fe-cross-compare-page/02-01-SUMMARY.md through 02-05-SUMMARY.md (per-plan summaries written by previous executors)
    - Outputs of Tasks 1-3 above (build log + git diff results + manual smoke results)
  </read_first>
  <action>
    Create `.planning/phases/02-fe-cross-compare-page/02-06-SUMMARY.md` with this content (fill in Tasks 1-3 actual results — the executor produces this AFTER running them):

    ```markdown
    # Phase 2 Acceptance Summary

    **Phase:** 02 — FE Cross-Compare Page
    **Date:** {YYYY-MM-DD}
    **Requirements:** CC-01, CC-02, CC-03

    ## Build / Lint Status (Task 1)

    - `npm run build` exit code: {0 if success}
    - eslint --fix modifications staged: {list any files auto-formatted, or "none"}
    - vite build dist/ produced: {yes/no}

    ## Off-Limits-File Audit (Task 2)

    | File | git diff vs Phase 1 commit | Status |
    |---|---|---|
    | `src/store/mapStore.js` | empty | UNTOUCHED |
    | `src/assets/configs/mapbox/mapConfig.js` | empty (or describe pre-existing diff) | UNTOUCHED |
    | `src/views/MapView.vue` | empty | UNTOUCHED |
    | `src/components/utilities/bars/SideBar.vue` | empty | UNTOUCHED |
    | `src/make-new-thing-here/` | exists | UNTOUCHED (Phase 3 deletes) |

    ## ROADMAP Success Criteria (Task 3 manual smoke)

    | # | Criterion | Status | Evidence |
    |---|---|---|---|
    | 1 | /crosscompare resolves; Mapbox base map shows; centred on 雙北 | {PASS/FAIL} | {one-line observation} |
    | 2 | NavBar shows new entry navigating to /crosscompare | {PASS/FAIL} | {one-line} |
    | 3 | Toggle 台北 / 雙北 updates within 200ms; greyed at #3a3a3a/0.35 | {PASS/FAIL} | {one-line} |
    | 4 | Colour ramp on total_score; 中正區 brightest, 萬華區 dimmest; 12/41 coverage | {PASS/FAIL} | {one-line} |

    ## Threat-Mitigation Verification

    | Threat ID | Mitigation Tested | Result |
    |---|---|---|
    | T-02-02-01 | localStorage whitelist rejection of bogus viewMode | {PASS/FAIL} |
    | T-02-04-03 | map.remove() prevents WebGL context leak across navigation | {PASS/FAIL} |

    ## Files Shipped This Phase

    - NEW `src/views/CrossCompareView.vue` ({line count})
    - NEW `src/store/crossCompareStore.js` ({line count})
    - NEW `src/assets/configs/crossCompareConfig.js` ({line count})
    - NEW `src/components/crosscompare/ViewToggle.vue` ({line count})
    - NEW `src/components/crosscompare/RampLegend.vue` ({line count})
    - EDIT `src/router/index.js` (+1 import, +1 route entry)
    - EDIT `src/components/utilities/bars/NavBar.vue` (+1 router-link)

    ## Decisions Honoured

    | ID | Decision | How |
    |---|---|---|
    | D-04 | Own map instance | CrossCompareView creates its own mapboxgl.Map; mapStore untouched |
    | D-05 | Store does not touch Mapbox | crossCompareStore.js has zero Mapbox imports |
    | D-06 | mapStyle.js (not dark_map_style.json) | Confirmed import path |
    | D-09 | localStorage 'crossCompare.viewMode' default 'metrotaipei' | Verified round-trip + whitelist |
    | D-10 | #1a3a3f → #5dffe6 interpolate-hcl | buildFillPaint uses interpolate-hcl |
    | D-11 | greyed #3a3a3a / 0.35 / #555555 border | buildGreyPaint + buildLinePaint |
    | D-12 | INSTANT setFilter swap (no animation) | watch(() => store.viewMode, applyEnabledFilter) |
    | D-13 | TNAME join key | hardcoded + runtime probe verified |
    | D-14 | normalizeDistrictKey 臺/台 | applied on both sides of the join |
    | D-16 | mapStore / mapConfig untouched | git diff confirms |
    | D-17 | axios singleton; public endpoint | http.get("/crosscompare/scores"), no auth header |
    | D-18 | single fetch, client-side filter on toggle | exactly 1 network request observed |
    | D-19 | single source layer (metrotaipei_town) for both modes | source-id + filter pattern |

    ## Phase 3 Hand-off

    Phase 3 (Hover Interaction & Polish) can now build directly on:
    - The `promoteId: "TNAME"` source descriptor — `setFeatureState({source, sourceLayer, id: districtName}, {hover: true})` will work without re-architecture.
    - The `store.disabledDistricts` getter — Phase 3 hover handler MUST check this set and no-op when the feature is disabled.
    - The `applyEnabledFilter` / `applyActivePaint` / `addCrossCompareLayers` functions in CrossCompareView — Phase 3 will add a `fill-extrusion` companion layer (or reuse Mapbox feature-state) and a `DistrictPopup.vue` component.
    - The `make-new-thing-here` directory — STILL PRESENT, ready for Phase 3 deletion (per ROADMAP Phase 3 #3).

    ## Open Items / Carry-overs

    - {list anything that surfaced during Phase 2 that should land in Phase 3 or a future milestone}
    ```

    Fill the `{...}` placeholders with the actual values from Tasks 1-3. The summary should be honest — if any criterion failed, mark it FAIL and document what happened (the user reads this to decide whether to ship or fix).
  </action>
  <verify>
    <automated>test -f .planning/phases/02-fe-cross-compare-page/02-06-SUMMARY.md &amp;&amp; grep -q 'ROADMAP Success Criteria' .planning/phases/02-fe-cross-compare-page/02-06-SUMMARY.md &amp;&amp; grep -q 'Phase 3 Hand-off' .planning/phases/02-fe-cross-compare-page/02-06-SUMMARY.md &amp;&amp; grep -q 'D-19' .planning/phases/02-fe-cross-compare-page/02-06-SUMMARY.md</automated>
  </verify>
  <acceptance_criteria>
    - File exists at exact path
    - Contains the 4 ROADMAP criteria table with explicit PASS/FAIL per row
    - Contains the threat-mitigation verification table
    - Contains the Phase 3 hand-off section
    - Contains the Decisions Honoured table referencing all 13 D-XX decisions in scope for Phase 2
  </acceptance_criteria>
  <done>
    Phase 2 acceptance report is written and committed. State / RoadMap can be transitioned by the user via `/gsd-transition`.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| (none new in this plan) | Plan 02-06 only runs verification commands; introduces no new code or trust boundaries. The threat-mitigation tests in Task 3 EXERCISE existing mitigations from Plans 02-02 and 02-04. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-06-01 | Repudiation | acceptance summary may misrepresent failures as passes | mitigate | Task 3 is a `checkpoint:human-verify` gate — the user (not Claude) signs off on each criterion. Task 4 is required to record honest PASS/FAIL based on Task 3 observations. |
</threat_model>

<verification>
- Task 1 build: `BUILD_EXIT=0` in /tmp/phase02-build.log
- Task 2 git diffs: empty for all four off-limits files
- Task 3 checkpoint: human-approved (4 ROADMAP criteria + 2 threat tests)
- Task 4 SUMMARY.md: exists with all required sections
</verification>

<success_criteria>
- All 4 ROADMAP Phase 2 success criteria observably TRUE
- npm run build exits 0
- D-16 boundaries honoured (mapStore/mapConfig/MapView/SideBar untouched)
- make-new-thing-here directory intact (Phase 3 will delete)
- T-02-02-01 and T-02-04-03 mitigations exercised end-to-end
- Phase 3 has a clean handoff with promoteId seam, store.disabledDistricts ready, and unmount cleanup verified
- All three Phase 2 requirements (CC-01, CC-02, CC-03) closed
</success_criteria>

<output>
The output of THIS plan is the SUMMARY.md itself, which is the artifact created in Task 4.

After Plan 02-06 ships, the user can:
1. Commit Phase 2 (`git add -A` / commit message: `feat(crosscompare): wire FE phase 2 — route, store, fill layers, toggle, legend`)
2. Run `/gsd-transition 2 -> 3` to move state forward
3. Plan Phase 3 with `/gsd-plan-phase 3` (hover + popup + make-new-thing-here removal)
</output>
