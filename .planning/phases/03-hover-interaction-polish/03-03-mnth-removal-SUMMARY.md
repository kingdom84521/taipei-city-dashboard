---
phase: 03-hover-interaction-polish
plan: 03
subsystem: FE
tags: [cleanup, deletion, make-new-thing-here, polish, refactor]
requires:
  - "Phase 2 /crosscompare route shipped (supersedes the synthetic-index slot)"
provides:
  - "ZERO `make-new-thing-here` references in Taipei-City-Dashboard-FE/src/"
  - "MapView.vue conditional chain reheaded after v-if branch removal"
  - "Smaller FE bundle (one fewer SFC import; one fewer route-query branch)"
affects:
  - Taipei-City-Dashboard-FE/src/views/MapView.vue
  - Taipei-City-Dashboard-FE/src/components/utilities/bars/SideBar.vue
  - Taipei-City-Dashboard-FE/src/store/contentStore.js
  - Taipei-City-Dashboard-FE/src/make-new-thing-here/ (deleted)
tech-stack:
  added: []
  patterns: [conditional-chain-rehead, unused-import-cleanup]
key-files:
  created: []
  modified:
    - Taipei-City-Dashboard-FE/src/views/MapView.vue
    - Taipei-City-Dashboard-FE/src/components/utilities/bars/SideBar.vue
    - Taipei-City-Dashboard-FE/src/store/contentStore.js
  deleted:
    - Taipei-City-Dashboard-FE/src/make-new-thing-here/MakeNewThingHerePanel.vue
    - Taipei-City-Dashboard-FE/src/make-new-thing-here/README.md
decisions:
  - "D-15 honoured: directory deleted via `git rm -r`; README content quoted in commit body for archaeology"
  - "D-16 honoured: 3 sites removed in MapView.vue; orphaned v-else-if rewritten to v-if (PATTERNS Concern 5)"
  - "D-17 honoured: SideBarLink block removed; unused import cleaned (PATTERNS Concern 6); `<h1>工具</h1>` placeholder retained per Option A"
  - "D-17b honoured: 6th site in contentStore.js setRouteParams short-circuit deleted (PATTERNS Concern 9)"
  - "D-18 honoured: grep-zero gate proven; `npm run build` exits 0"
  - "D-19 honoured: only the four files in scope mutated; pre-existing dirty `mapConfig.js` left unstaged"
metrics:
  duration: ~6 minutes
  tasks_completed: 4
  files_modified: 3
  files_deleted: 2
  commits: 4
  completed_date: 2026-05-03
requirements: [CC-04]
---

# Phase 3 Plan 03: make-new-thing-here Removal — Summary

Removed the deprecated `make-new-thing-here` synthetic-dashboard-index injection slot from the FE: 4 source-file edits + 1 directory deletion across 3 files + 2 deleted files, satisfying CC-04 acceptance criterion #3 (grep returns ZERO).

## Tasks Completed

| Task | Description                                                                                       | Commit  | Files                                                  |
| ---- | ------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------ |
| 1    | Remove make-new-thing-here from MapView.vue (3 sites + v-else-if→v-if rewrite)                    | 0a6fa30 | Taipei-City-Dashboard-FE/src/views/MapView.vue          |
| 2    | Remove make-new-thing-here from SideBar.vue (link block + unused SideBarLink import)              | d106e54 | Taipei-City-Dashboard-FE/src/components/utilities/bars/SideBar.vue |
| 3    | Remove make-new-thing-here from contentStore.js setRouteParams short-circuit (6th site)           | 669ee50 | Taipei-City-Dashboard-FE/src/store/contentStore.js      |
| 4    | Delete Taipei-City-Dashboard-FE/src/make-new-thing-here/ directory + README archaeology preserved | 2bb94a1 | Taipei-City-Dashboard-FE/src/make-new-thing-here/       |

## Line-Count Deltas

| File                                                                  | Lines Removed | Notes                                                                                  |
| --------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------- |
| Taipei-City-Dashboard-FE/src/views/MapView.vue                        | -10 (1 ins, 11 del) | 1 import line + 1 computed line + 7 template lines + 2 lines from v-else-if -> v-if rewrite (1 added, 2 removed net structurally) |
| Taipei-City-Dashboard-FE/src/components/utilities/bars/SideBar.vue    | -7            | 6 template lines (`<SideBarLink>` block) + 1 import line                               |
| Taipei-City-Dashboard-FE/src/store/contentStore.js                    | -8            | 2 comment lines + 6 if-block lines (early-return short-circuit)                        |
| Taipei-City-Dashboard-FE/src/make-new-thing-here/MakeNewThingHerePanel.vue | -25           | Whole file deleted                                                                     |
| Taipei-City-Dashboard-FE/src/make-new-thing-here/README.md            | -33           | Whole file deleted (content preserved verbatim in commit 2bb94a1 body)                  |

**Total:** ~83 lines removed across 5 files; net `git diff --shortstat` against pre-plan tree: `4 files changed, 1 insertion(+), 25 deletions(-)` (source) + `2 files changed, 58 deletions(-)` (deletion commit) = 6 file ops, 1 ins / 83 del.

## Acceptance Gates

### D-18 / CC-04 acceptance criterion #3 — grep-zero gate (LOAD-BEARING)

```
$ grep -r "make-new-thing-here" Taipei-City-Dashboard-FE/src/
$ echo "GREP_EXIT=$?"
GREP_EXIT=1
```

Output is empty (zero matches), grep exit code `1` (no-match). **CC-04 acceptance criterion #3 SATISFIED — grep-zero proven.**

### D-18 — npm run build

```
$ cd Taipei-City-Dashboard-FE && npm run build
... vite build output ...
BUILD_EXIT=0
```

Build exits 0; Vue template compiles (no `v-else-if has no matching v-if`); ESLint passes (no `no-unused-vars` for `SideBarLink`).

### Directory deletion verification

```
$ test -d Taipei-City-Dashboard-FE/src/make-new-thing-here ; echo "DIR_EXIT=$?"
DIR_EXIT=1
$ git diff --staged --name-status (at task 4 stage time)
D    Taipei-City-Dashboard-FE/src/make-new-thing-here/MakeNewThingHerePanel.vue
D    Taipei-City-Dashboard-FE/src/make-new-thing-here/README.md
```

Directory is gone (`test -d` returns false); both files shown as `D` (deleted) in the staging area.

### MapView.vue conditional-chain rehead (PATTERNS Concern 5)

```
$ grep -nE "^\s*v-(if|else-if|else)" Taipei-City-Dashboard-FE/src/views/MapView.vue | head -10
146:        v-if="
253:        v-else-if="
543:        v-else-if="contentStore.loading"
550:        v-else-if="contentStore.error"
558:        v-else
564:          v-if="contentStore.currentDashboard.icon !== 'favorite'"
```

The chain head at line 146 is `v-if` (the rewritten branch); the subsequent siblings remain `v-else-if`/`v-else`. No orphan-cascade compile error.

## Decisions Honoured

| D-ID  | Decision                                                                                                                                            | Evidence                                          |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| D-15  | Delete `make-new-thing-here/` via `git rm -r`; README content quoted in commit body for `git log --follow` archaeology                              | commit `2bb94a1` body                             |
| D-16  | MapView.vue 3 sites removed + orphaned `v-else-if` → `v-if` rewrite                                                                                 | commit `0a6fa30`                                  |
| D-17  | SideBar.vue SideBarLink block removed + unused `import SideBarLink` removed; `工具` placeholder header retained (Option A)                          | commit `d106e54`                                  |
| D-17b | contentStore.js setRouteParams short-circuit deleted (6th site)                                                                                     | commit `669ee50`                                  |
| D-18  | grep-zero gate ZERO matches; `npm run build` exits 0                                                                                                | gates section above                               |
| D-19  | Only files in scope mutated; pre-existing dirty `mapConfig.js` left unstaged; STATE.md left unstaged                                                | `git status --short` shows them M but unstaged    |
| D-20  | Boundary respected — `mapStore.js`, `mapConfig.js`, `mapStyle.js`, `crossCompareStore.js`, `crossCompareConfig.js`, `CrossCompareView.vue`, `ViewToggle.vue`, `RampLegend.vue`, `DistrictPopup.vue`, `router/index.js`, `NavBar.vue` all untouched by this plan | `git diff --name-only 0a6fa30~1..HEAD` shows only the 5 in-scope files |

## Deviations from Plan

**None — plan executed exactly as written.** No Rule 1-4 deviations encountered. Build passes on every task; ESLint did not auto-format any non-Phase-3 file.

The `grep -c "工具" SideBar.vue` post-Task-2 returned `1` (instead of the gate's expected `≥ 2`), but this was a gate-spec off-by-one: both `工具` strings live on the same line (`{{ isExpanded ? \`工具\` : \`工具\` }}`), so `grep -c` (line-count) returns 1 even though the placeholder block is intact. The placeholder `<h1>` block is preserved as Option A intends — visually verified in the post-edit file (lines 156-158).

## Verbatim Deletion Commit Body (Traceability)

```
refactor(03-03): delete Taipei-City-Dashboard-FE/src/make-new-thing-here/ directory

重新命名: 移除 make-new-thing-here synthetic-index 注入點 (CC-04 / Phase 3)

This directory hosted the temporary synthetic-dashboard-index hack that
let new map features be prototyped inside MapView via
/mapview?index=make-new-thing-here, bypassing currentDashboard.components.
That role is now filled by the real /crosscompare top-level route shipped
in Phase 2 (v2.3 milestone), so the injection slot is removed.

README archaeology (preserved here for `git log --follow`):

  # Make New Thing Here Components
  #
  # This directory hosts a self-contained set of components for **Make New Thing Here**,
  # a special section that lives **inside MapView** under the synthetic dashboard index
  # `make-new-thing-here`.
  #
  # - Entry point: a fixed `Make New Thing Here` link in `SideBar.vue` (above the public
  #   dashboards list) that navigates to `/mapview?index=make-new-thing-here`
  # - `MapView.vue` has a top-level branch
  #   `v-if="route.query.index === 'make-new-thing-here'"` that renders
  #   `MakeNewThingHerePanel.vue` from this directory, **bypassing** the normal
  #   `currentDashboard.components` rendering.

Removed:
- src/make-new-thing-here/MakeNewThingHerePanel.vue
- src/make-new-thing-here/README.md
- import + computed + v-if branch in src/views/MapView.vue (lines 24, 26, 147-153) + v-else-if->v-if rewrite at line 156 (commit 0a6fa30)
- SideBarLink to /mapview?index=make-new-thing-here in src/components/utilities/bars/SideBar.vue (lines 160-165) + unused import line 11 (commit d106e54)
- setRouteParams short-circuit branch in src/store/contentStore.js (lines 91-98) [D-17b] (commit 669ee50)

CC-04 acceptance #3: `grep -r "make-new-thing-here" Taipei-City-Dashboard-FE/src/` returns ZERO matches.
`npm run build` exits 0.
```

## Self-Check: PASSED

- [x] `Taipei-City-Dashboard-FE/src/views/MapView.vue` exists (modified)
- [x] `Taipei-City-Dashboard-FE/src/components/utilities/bars/SideBar.vue` exists (modified)
- [x] `Taipei-City-Dashboard-FE/src/store/contentStore.js` exists (modified)
- [x] `Taipei-City-Dashboard-FE/src/make-new-thing-here/` directory does NOT exist (deleted)
- [x] Commit `0a6fa30` exists in `git log`
- [x] Commit `d106e54` exists in `git log`
- [x] Commit `669ee50` exists in `git log`
- [x] Commit `2bb94a1` exists in `git log`
- [x] `grep -r "make-new-thing-here" Taipei-City-Dashboard-FE/src/` returns ZERO matches
- [x] `npm run build` exits 0

**CC-04 acceptance criterion #3 SATISFIED — grep-zero proven.**
