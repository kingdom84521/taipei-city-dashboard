---
phase: 03-hover-interaction-polish
plan: 03
type: execute
wave: 1
depends_on: []
files_modified:
  - Taipei-City-Dashboard-FE/src/views/MapView.vue
  - Taipei-City-Dashboard-FE/src/components/utilities/bars/SideBar.vue
  - Taipei-City-Dashboard-FE/src/store/contentStore.js
files_deleted:
  - Taipei-City-Dashboard-FE/src/make-new-thing-here/MakeNewThingHerePanel.vue
  - Taipei-City-Dashboard-FE/src/make-new-thing-here/README.md
autonomous: true
requirements: [CC-04]
tags: [cleanup, deletion, make-new-thing-here, polish]

must_haves:
  truths:
    - "Directory Taipei-City-Dashboard-FE/src/make-new-thing-here/ no longer exists (D-15, D-19)"
    - "MapView.vue line 24 import of MakeNewThingHerePanel removed (D-16)"
    - "MapView.vue line 26 isMakeNewThingHere computed removed (D-16)"
    - "MapView.vue lines 147-153 v-if branch + comment removed (D-16)"
    - "MapView.vue line 156 v-else-if rewritten to v-if (D-16, PATTERNS Concern 5 — orphan-cascade fix)"
    - "SideBar.vue lines 160-165 SideBarLink block removed (D-17)"
    - "SideBar.vue line 11 import SideBarLink removed (D-17, PATTERNS Concern 6 — no-unused-vars)"
    - "contentStore.js lines 90-98 (the 2-line comment + 6-line if block totalling 8 lines) — make-new-thing-here short-circuit branch removed (D-17b, PATTERNS Concern 9)"
    - "grep -r make-new-thing-here Taipei-City-Dashboard-FE/src/ returns ZERO matches (D-18 — the load-bearing acceptance gate)"
    - "npm run build exits 0 (D-18)"
  artifacts:
    - path: "Taipei-City-Dashboard-FE/src/views/MapView.vue"
      provides: "MapView with mnth branch removed and v-else-if rewritten to v-if"
      not_contains: "make-new-thing-here"
      not_contains_2: "MakeNewThingHerePanel"
      not_contains_3: "isMakeNewThingHere"
    - path: "Taipei-City-Dashboard-FE/src/components/utilities/bars/SideBar.vue"
      provides: "SideBar with synthetic-index link removed and unused import cleaned"
      not_contains: "make-new-thing-here"
      not_contains_2: "import SideBarLink"
    - path: "Taipei-City-Dashboard-FE/src/store/contentStore.js"
      provides: "contentStore with mnth setRouteParams short-circuit removed"
      not_contains: "make-new-thing-here"
  key_links:
    - from: "git working tree"
      to: "make-new-thing-here references"
      via: "grep -r make-new-thing-here src/"
      pattern: "ZERO matches"
---

<objective>
Remove the deprecated `make-new-thing-here` synthetic-index injection slot now that the real `/crosscompare` route shipped in Phase 2. CC-04 acceptance criterion #3 (ROADMAP / D-18) demands `grep -r "make-new-thing-here" Taipei-City-Dashboard-FE/src/` returns **zero matches** — this plan delivers exactly that.

This plan touches **4 sites + 1 directory deletion** across 3 source files, and rewrites a load-bearing `v-else-if → v-if` to keep MapView's template compiling (PATTERNS Concern 5 — the orphan-cascade trap).

The 6 reference sites (per PATTERNS Concern 9 — explicitly added by D-17b after CONTEXT initially listed only 5):
1. `MapView.vue` line 24 — import statement
2. `MapView.vue` line 26 — `isMakeNewThingHere` computed
3. `MapView.vue` lines 147-153 — comment + `v-if` branch + panel mount
4. `SideBar.vue` lines 160-165 — `<SideBarLink to="/mapview?index=make-new-thing-here">`
5. `SideBar.vue` line 11 — `import SideBarLink` (becomes unused after #4)
6. `contentStore.js` lines 90-98 — `setRouteParams` short-circuit branch (the 6th site that PATTERNS.md Concern 9 surfaced — CC-04 acceptance gate fails without this)

Plus the directory deletion: `Taipei-City-Dashboard-FE/src/make-new-thing-here/` (2 files: `MakeNewThingHerePanel.vue` + `README.md`).

Purpose: structural cleanup removing 728-line-old prototype hack. The `v-else-if → v-if` rewrite (Concern 5) is critical — Vue WILL refuse to compile a `v-else-if` whose preceding `v-if` was deleted. PATTERNS.md flagged this as load-bearing.

Output: 3 files modified (16 lines removed across them), 1 directory deleted (2 files removed). Net reduction: ~50 LOC. Zero new files.

This plan is **wave 1, parallel-safe** with Plans 03-01 and 03-02 (different files; no overlap with Wave 2's edits to `CrossCompareView.vue`).
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

# Files being edited / deleted (read in full before changing — line numbers must be re-verified at execution time)
@Taipei-City-Dashboard-FE/src/views/MapView.vue
@Taipei-City-Dashboard-FE/src/components/utilities/bars/SideBar.vue
@Taipei-City-Dashboard-FE/src/store/contentStore.js
@Taipei-City-Dashboard-FE/src/make-new-thing-here/README.md

<interfaces>
<!-- contentStore.js current state at lines 88-99 (verified 2026-05-03) -->
```js
		setRouteParams(mode, index, city) {
			this.currentDashboard.mode = mode;
			// "make-new-thing-here" is a synthetic index handled directly by MapView; skip BE dashboard lookup
			// so the user is not auto-redirected to the first available real dashboard.
			if (index === "make-new-thing-here") {
				this.currentDashboard.city = city;
				this.currentDashboard.index = index;
				this.currentDashboard.components = [];
				return;
			}
			// 1-1. Don't do anything if the path is the same
			if (
```

<!-- MapView.vue current state at lines 23-30 -->
```js
import ReportIssue from "../components/dialogs/ReportIssue.vue";
import MakeNewThingHerePanel from "../make-new-thing-here/MakeNewThingHerePanel.vue";

const isMakeNewThingHere = computed(() => route.query.index === "make-new-thing-here");

const contentStore = useContentStore();
```

<!-- MapView.vue current state at lines 145-160 -->
```vue
  <div class="map">
    <div class="hide-if-mobile">
      <!-- 0. make-new-thing-here: synthetic index, swaps the entire content area for MakeNewThingHerePanel. -->
      <div
        v-if="isMakeNewThingHere"
        class="map-charts"
      >
        <MakeNewThingHerePanel />
      </div>
      <!-- 1. If the dashboard is map-layers -->
      <div
        v-else-if="
          contentStore.currentDashboard.index?.includes('map-layers')
        "
        class="map-charts"
      >
```

<!-- SideBar.vue current state at lines 9-13 + 157-170 -->
```js
// line 9-13
import SideBarTab from "../miscellaneous/SideBarTab.vue";
import SideBarLink from "../miscellaneous/SideBarLink.vue";

const contentStore = useContentStore();
const dialogStore = useDialogStore();
```
```vue
<!-- line 157-170 -->
    <h1>
      {{ isExpanded ? `工具` : `工具` }}
    </h1>
    <SideBarLink
      icon="science"
      title="Make New Thing Here"
      to="/mapview?index=make-new-thing-here"
      :expanded="isExpanded"
    />
    <h1 @click="toggleCollapse(contentStore.cityManager.activeCities)">
      {{ isExpanded ? `公共儀表板` : `公共` }}
    </h1>
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Remove make-new-thing-here from MapView.vue (3 sites + the v-else-if→v-if rewrite)</name>
  <files>Taipei-City-Dashboard-FE/src/views/MapView.vue</files>

  <read_first>
    - .planning/phases/03-hover-interaction-polish/03-CONTEXT.md (D-16 — three sites + critical v-else-if note)
    - .planning/phases/03-hover-interaction-polish/03-PATTERNS.md (section "src/views/MapView.vue (EDIT — REMOVE 3 sites + comment)" — verbatim deletion targets; Concern 5 — orphan-cascade trap)
    - Taipei-City-Dashboard-FE/src/views/MapView.vue (re-verify line numbers; if file shifted because of unrelated commits, update the line numbers in this action — `grep -n "make-new-thing-here\|isMakeNewThingHere\|MakeNewThingHerePanel" MapView.vue` is your source of truth)
  </read_first>

  <action>
**Per D-16 + PATTERNS Concern 5.** Three deletions + one structural fix in `MapView.vue`. **CRITICAL:** the v-else-if→v-if rewrite (deletion #4) is mandatory — without it, Vue's template compiler errors with `v-else-if has no matching v-if` and `npm run build` fails.

**Deletion #1 — line 24** (the import statement). Delete this entire line:

```js
import MakeNewThingHerePanel from "../make-new-thing-here/MakeNewThingHerePanel.vue";
```

After deletion, audit: `computed` is imported on line 15 (`import { computed, ref, watch } from "vue";`); line 41 `parseMapLayers` still uses `computed(...)`. Therefore the line-15 import STAYS.

**Deletion #2 — line 26** (the computed declaration; note line is blank line 25 then computed on line 26 in the current file — re-verify with `grep -n "isMakeNewThingHere"`). Delete this entire line:

```js
const isMakeNewThingHere = computed(() => route.query.index === "make-new-thing-here");
```

(The `route` declaration at line 31 — `const route = useRoute();` — STAYS. Other watchers in this file consume `route` independently.)

**Deletion #3 — lines 147-153 inclusive** (the HTML comment + the entire `v-if` branch). Delete these 7 lines verbatim:

```vue
      <!-- 0. make-new-thing-here: synthetic index, swaps the entire content area for MakeNewThingHerePanel. -->
      <div
        v-if="isMakeNewThingHere"
        class="map-charts"
      >
        <MakeNewThingHerePanel />
      </div>
```

**Structural Fix — line 156 (now line ~149 after the deletion above shrinks the file by 7 lines).** The next `<div v-else-if=...>` block becomes orphaned. Change `v-else-if` to `v-if`. The exact text:

BEFORE deletion-of-#3:
```vue
      <!-- 1. If the dashboard is map-layers -->
      <div
        v-else-if="
          contentStore.currentDashboard.index?.includes('map-layers')
        "
        class="map-charts"
      >
```

AFTER (deletion-of-#3 + this rewrite):
```vue
      <!-- 1. If the dashboard is map-layers -->
      <div
        v-if="
          contentStore.currentDashboard.index?.includes('map-layers')
        "
        class="map-charts"
      >
```

Subsequent `v-else-if` / `v-else` branches at the original lines 263 / 553 / 560 / 567 stay AS-IS — they chain off the new top `v-if`, which is structurally valid. Verify: `grep -n "v-else-if\|v-else" MapView.vue | head` should still show those branches present after this edit.

**Constraints:**
- Re-verify line numbers via `grep -n "make-new-thing-here\|MakeNewThingHerePanel\|isMakeNewThingHere\|v-else-if" Taipei-City-Dashboard-FE/src/views/MapView.vue` BEFORE editing — if a concurrent commit shifted them, adjust accordingly.
- Do NOT delete any other v-else-if / v-else branches lower in the file. Only the immediate-next v-else-if (the one originally at line 156) needs the rewrite.
- Do NOT change the indentation or HTML structure of the surviving block — minimal-diff.
- TUIC banner (lines 1-9) STAYS untouched.
- Run `npm run build` after the edit; Vue compile errors surface there. If you see "v-else-if has no matching v-if", the rewrite at line 156 was missed.
  </action>

  <verify>
    <automated>cd Taipei-City-Dashboard-FE && npm run build 2>&1 | tail -20 | grep -E "built in|exit" || echo "BUILD_FAILED"</automated>
    <gates>
      - `grep -c "make-new-thing-here\|MakeNewThingHerePanel\|isMakeNewThingHere" Taipei-City-Dashboard-FE/src/views/MapView.vue` == 0
      - `grep -nE "^\s*v-(if|else-if|else)" Taipei-City-Dashboard-FE/src/views/MapView.vue | head -5` shows the FIRST conditional in the post-edit chain is `v-if` (not `v-else-if`) — exact line varies
      - `cd Taipei-City-Dashboard-FE && npm run build` exit 0 (Vue template compile succeeds)
    </gates>
  </verify>

  <acceptance_criteria>
    - File loses ~9 lines (1 import + 1 computed + 7 template lines).
    - `v-else-if` → `v-if` rewrite applied to the FIRST conditional branch in `<div class="hide-if-mobile">`.
    - All other branches (map-layers / .components / .components.length / etc.) unchanged.
    - Build passes; no "v-else-if has no matching v-if" error.
    - The `route` and `computed` imports STAY (still used by other code in the file).
  </acceptance_criteria>

  <done>
MapView.vue: 3 mnth references removed, v-else-if at the first conditional rewritten to v-if. npm run build exits 0.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Remove make-new-thing-here from SideBar.vue (link block + unused import)</name>
  <files>Taipei-City-Dashboard-FE/src/components/utilities/bars/SideBar.vue</files>

  <read_first>
    - .planning/phases/03-hover-interaction-polish/03-CONTEXT.md (D-17 — link removal + unused-import cleanup)
    - .planning/phases/03-hover-interaction-polish/03-PATTERNS.md (section "src/components/utilities/bars/SideBar.vue (EDIT — REMOVE the synthetic-index link)" — Option A conservative: leave 工具 h1 placeholder; Concern 6 — no-unused-vars import deletion)
    - Taipei-City-Dashboard-FE/src/components/utilities/bars/SideBar.vue (re-verify line numbers — `grep -n "make-new-thing-here\|SideBarLink" SideBar.vue`)
  </read_first>

  <action>
**Per D-17 + PATTERNS Concern 6.** Two deletions in `SideBar.vue`. Adopt **Option A** (conservative — RECOMMENDED in PATTERNS): leave the `<h1>工具</h1>` placeholder header in place; future tools can slot beneath it. Minimal-diff is preferred for a polish phase.

**Deletion #1 — lines 160-165 inclusive** (the `<SideBarLink>` block). Delete these 6 lines verbatim:

```vue
    <SideBarLink
      icon="science"
      title="Make New Thing Here"
      to="/mapview?index=make-new-thing-here"
      :expanded="isExpanded"
    />
```

The surrounding context after deletion:
```vue
    <h1>
      {{ isExpanded ? `工具` : `工具` }}
    </h1>
    <h1 @click="toggleCollapse(contentStore.cityManager.activeCities)">
      {{ isExpanded ? `公共儀表板` : `公共` }}
    </h1>
```

(The `工具` `<h1>` becomes an empty section header. Acceptable — Option A. Future tools can be added under it without re-introducing the `工具` chrome.)

**Deletion #2 — line 11** (the now-unused import). After Deletion #1, `SideBarLink` is no longer referenced anywhere in this file (`grep -c "SideBarLink" SideBar.vue` should drop to `0` — the only consumer was the deleted block). Delete this line:

```js
import SideBarLink from "../miscellaneous/SideBarLink.vue";
```

**Verification of unused-ness:** before deleting line 11, run `grep -n "SideBarLink" Taipei-City-Dashboard-FE/src/components/utilities/bars/SideBar.vue`. Expected output AFTER Deletion #1 is empty (0 matches). If any reference remains (e.g. someone added a second `<SideBarLink>` block since CONTEXT was authored), abort the import deletion and report — manual review needed.

**Constraints:**
- Do NOT delete `SideBarLink.vue` itself (the component file at `src/components/utilities/miscellaneous/SideBarLink.vue`). It's still a generic reusable component; just not consumed by this particular file anymore. PATTERNS line 555 confirms.
- Do NOT delete or rename the `工具` `<h1>` (Option A). Aggressive deletion is Option B and is NOT chosen here.
- Do NOT touch the `<v-for>` dashboards list (lines 169-194 in pre-edit numbering). It's structurally independent.
- Do NOT touch the `import SideBarTab` at line 10 — `SideBarTab` is still used in the `<v-for>` block.
- TUIC banner (if present at top of file) STAYS untouched.
  </action>

  <verify>
    <automated>cd Taipei-City-Dashboard-FE && npm run build 2>&1 | tail -20 | grep -E "built in|exit" || echo "BUILD_FAILED"</automated>
    <gates>
      - `grep -c "make-new-thing-here\|SideBarLink" Taipei-City-Dashboard-FE/src/components/utilities/bars/SideBar.vue` == 0
      - `grep -c "工具" Taipei-City-Dashboard-FE/src/components/utilities/bars/SideBar.vue` ≥ 2 (the `<h1>{{ isExpanded ? `工具` : `工具` }}</h1>` placeholder STAYS)
      - `grep -c "SideBarTab" Taipei-City-Dashboard-FE/src/components/utilities/bars/SideBar.vue` ≥ 1 (the OTHER import + use stays)
      - `cd Taipei-City-Dashboard-FE && npm run build` exit 0 (no `no-unused-vars` ESLint error)
    </gates>
  </verify>

  <acceptance_criteria>
    - File loses ~7 lines (6 template + 1 import).
    - `工具` placeholder `<h1>` retained per Option A.
    - `<v-for>` dashboards block unchanged.
    - `SideBarLink.vue` component file untouched (still on disk).
    - Build passes; no `no-unused-vars` warnings.
  </acceptance_criteria>

  <done>
SideBar.vue: SideBarLink block + unused import removed. The 工具 placeholder section header stays. npm run build exits 0.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Remove make-new-thing-here short-circuit from contentStore.js (D-17b — the 6th site)</name>
  <files>Taipei-City-Dashboard-FE/src/store/contentStore.js</files>

  <read_first>
    - .planning/phases/03-hover-interaction-polish/03-CONTEXT.md (D-17b — added 2026-05-03 from PATTERNS Concern 9)
    - .planning/phases/03-hover-interaction-polish/03-PATTERNS.md (Concern 9 — verbatim block to delete; safety analysis of removing the early-return)
    - Taipei-City-Dashboard-FE/src/store/contentStore.js (read lines 80-110 to confirm exact line range — the verified state shows the comment at lines 90-91 + the if at lines 92-97 + closing brace at 98)
  </read_first>

  <action>
**Per D-17b + PATTERNS Concern 9.** This is the 6th `make-new-thing-here` reference site. The CC-04 acceptance gate (`grep -r "make-new-thing-here" Taipei-City-Dashboard-FE/src/` returns ZERO) FAILS without this deletion. The original CONTEXT enumerated 5 sites; D-17b explicitly added this one after the pattern-mapping pass discovered it.

**Deletion target — `contentStore.js` lines 90-98 inclusive** (the 2-line comment + the 6-line `if` block + the closing brace). Verbatim:

```js
			// "make-new-thing-here" is a synthetic index handled directly by MapView; skip BE dashboard lookup
			// so the user is not auto-redirected to the first available real dashboard.
			if (index === "make-new-thing-here") {
				this.currentDashboard.city = city;
				this.currentDashboard.index = index;
				this.currentDashboard.components = [];
				return;
			}
```

Delete all 8 lines (the 2 comment lines + the 6 `if`-block lines including the closing `}`).

The surrounding context after deletion (lines 88 + 89 stay; what was line 99 becomes the new line 91):
```js
		setRouteParams(mode, index, city) {
			this.currentDashboard.mode = mode;
			// 1-1. Don't do anything if the path is the same
			if (
				this.currentDashboard.index === index &&
				this.currentDashboard.city === city
			) {
```

**Safety analysis (per PATTERNS line 736):** removing this short-circuit means `setRouteParams("...", "make-new-thing-here", ...)` would fall through to the normal dashboard-lookup logic. After Tasks 1-2, the route `/mapview?index=make-new-thing-here` no longer exists (no SideBar link, no MapView v-if branch). Therefore `setRouteParams` will never be called with `index === "make-new-thing-here"` from any in-tree caller. The deletion is safe.

(If a user manually crafts `/mapview?index=make-new-thing-here` in the URL, MapView will fall through to the existing `currentDashboard.components?.length !== 0` else-branch and either show whatever the `make-new-thing-here` index would resolve to via BE — which is nothing — or render an empty `<DashboardComponent>` list. No crash, no broken state. Acceptable.)

**Constraints:**
- Re-verify the line range with `grep -n "make-new-thing-here" Taipei-City-Dashboard-FE/src/store/contentStore.js` before deleting. PATTERNS.md cites lines 87-98; the verified state shows lines 90-98 inclusive (comment block at 90-91, if at 92-97, closing brace at 98). The discrepancy is just a 3-line offset from blank-line counting; the BLOCK is the same. Delete the whole block bounded by the two `// "make-new-thing-here"` comments through the matching `}`.
- Do NOT touch any other code in `contentStore.js` — this is a 1130-line file with much unrelated logic. Minimal-diff.
- Hard tabs preserved.
- The `setRouteParams` action's outer `if (this.currentDashboard.index === index ...)` block (the "Don't do anything if the path is the same" guard) must STAY — it's the next thing in the function and is unrelated.
  </action>

  <verify>
    <automated>cd Taipei-City-Dashboard-FE && npm run build 2>&1 | tail -20 | grep -E "built in|exit" || echo "BUILD_FAILED"</automated>
    <gates>
      - `grep -c "make-new-thing-here" Taipei-City-Dashboard-FE/src/store/contentStore.js` == 0
      - `grep -c "setRouteParams" Taipei-City-Dashboard-FE/src/store/contentStore.js` ≥ 1 (the action signature stays)
      - `grep -c "currentDashboard\.mode" Taipei-City-Dashboard-FE/src/store/contentStore.js` ≥ 1 (the immediately-preceding `this.currentDashboard.mode = mode;` line stays)
      - `cd Taipei-City-Dashboard-FE && npm run build` exit 0
    </gates>
  </verify>

  <acceptance_criteria>
    - File loses 8 lines (2 comments + 6 if-block lines).
    - `setRouteParams` action body now goes directly from `this.currentDashboard.mode = mode;` to the `// 1-1. Don't do anything if the path is the same` block.
    - Build passes; no syntax errors.
    - No other code in contentStore.js modified.
  </acceptance_criteria>

  <done>
contentStore.js: the 6th make-new-thing-here reference (the setRouteParams short-circuit) is deleted. The action falls through to normal dashboard lookup. npm run build exits 0.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 4: Delete the make-new-thing-here directory + final grep-zero gate</name>
  <files>Taipei-City-Dashboard-FE/src/make-new-thing-here/</files>

  <read_first>
    - .planning/phases/03-hover-interaction-polish/03-CONTEXT.md (D-15, D-18 — directory deletion; grep-zero verification gate)
    - .planning/phases/03-hover-interaction-polish/03-PATTERNS.md (section "src/make-new-thing-here/ (DELETE — entire directory)" — recommended commit message body preserves README archaeology in `git log --follow`)
    - Taipei-City-Dashboard-FE/src/make-new-thing-here/README.md (read lines 1-15 — quote in the deletion commit message body)
  </read_first>

  <action>
**Per D-15 + D-18.** Two operations:

**Operation 1 — delete the directory** (use `git rm -r` to ensure the deletion is staged for commit):

```bash
cd /home/yumekuii/works/taipei-city-dashboard
git rm -r Taipei-City-Dashboard-FE/src/make-new-thing-here/
```

This stages the deletion of both files (`MakeNewThingHerePanel.vue` + `README.md`) and the directory itself. The `git rm -r` form (vs plain `rm -rf` then `git add`) keeps the move-tracking machinery intact for `git log --follow`.

**Operation 2 — final grep-zero gate.** This is the load-bearing acceptance check (D-18 / ROADMAP success criterion #3):

```bash
grep -r "make-new-thing-here" Taipei-City-Dashboard-FE/src/
echo "EXIT=$?"
```

Expected: NO output (zero match lines), `grep` exits with code `1` (no-match exit code). If any match line appears OR exit is `0` (matches found), STOP — Tasks 1-3 left a reference behind. Re-grep with `-n` to find which file, fix it, re-run.

After the grep gate passes, run final build:

```bash
cd Taipei-City-Dashboard-FE && npm run build
echo "BUILD_EXIT=$?"
```

Expected: exit `0`.

**Commit message draft** (the executor produces commits per plan; this commit can be a single squash combining all 4 tasks of this plan, or one commit per task — either works. Recommended: one commit per task, then a final acceptance commit. Whatever pattern Phase 2 used. The DELETE commit's body should preserve README archaeology):

For the directory deletion commit (per PATTERNS.md commit-message-body recommendation):

```
重新命名: 移除 make-new-thing-here synthetic-index 注入點 (CC-04 / Phase 3)

This directory hosted the temporary synthetic-dashboard-index hack that
let new map features be prototyped inside MapView via
/mapview?index=make-new-thing-here, bypassing currentDashboard.components.
That role is now filled by the real /crosscompare top-level route shipped
in Phase 2 (v2.3 milestone), so the injection slot is removed.

Removed:
- src/make-new-thing-here/MakeNewThingHerePanel.vue
- src/make-new-thing-here/README.md
- import + computed + v-if branch in src/views/MapView.vue (lines 24, 26, 147-153) + v-else-if→v-if rewrite at line 156
- SideBarLink to /mapview?index=make-new-thing-here in src/components/utilities/bars/SideBar.vue (lines 160-165) + unused import line 11
- setRouteParams short-circuit branch in src/store/contentStore.js (lines 90-98) [D-17b]

CC-04 acceptance: grep -r "make-new-thing-here" Taipei-City-Dashboard-FE/src/ returns ZERO matches.
```

(Mirrors the existing `重新命名: datalab → make-new-thing-here` style at commit `8f6082f`, per PATTERNS line 600.)

**Constraints:**
- Run the grep-zero gate AFTER the directory delete + AFTER Tasks 1-3's source edits are saved/staged. The order matters: each task is independent, but the final gate only passes once ALL 6 sites + the directory are gone.
- Do NOT delete `Taipei-City-Dashboard-FE/src/components/utilities/miscellaneous/SideBarLink.vue` (the generic component) — Task 2's "delete unused import" only removed the import line in `SideBar.vue`. The reusable component file itself stays available for future use.
- The `git rm -r` command staging step is mandatory — `rm -rf` alone leaves the deletion unstaged and an attentive developer might `git restore` accidentally.
- After this plan's commit, executor-side `git status` should show: 3 modified source files + 2 deleted (the directory's 2 files) and ZERO untracked files in `make-new-thing-here/`.
  </action>

  <verify>
    <automated>cd /home/yumekuii/works/taipei-city-dashboard && grep -rE "make-new-thing-here" Taipei-City-Dashboard-FE/src/ ; echo "GREP_EXIT=$?"</automated>
    <gates>
      - `test -d Taipei-City-Dashboard-FE/src/make-new-thing-here` exit code `1` (NOT a directory anymore)
      - `grep -r "make-new-thing-here" Taipei-City-Dashboard-FE/src/` produces ZERO output lines and grep exits with `1` (no matches)
      - `git status --short Taipei-City-Dashboard-FE/src/make-new-thing-here/` shows 2 deleted files (`D` status) — staged
      - `cd Taipei-City-Dashboard-FE && npm run build` exit 0
    </gates>
  </verify>

  <acceptance_criteria>
    - Directory `Taipei-City-Dashboard-FE/src/make-new-thing-here/` is deleted (verified by `test -d` returning false / `ls` failing).
    - `grep -r "make-new-thing-here" Taipei-City-Dashboard-FE/src/` returns ZERO matches across views, components, stores, configs, anywhere — the LOAD-BEARING D-18 gate.
    - `npm run build` passes — Vite/eslint succeeds with 6 sites + the directory gone.
    - The 2 deleted files (`MakeNewThingHerePanel.vue`, `README.md`) appear in `git diff --staged --name-status` with `D` status.
  </acceptance_criteria>

  <done>
make-new-thing-here directory deleted. grep -r returns zero. Build passes. CC-04 acceptance criterion #3 satisfied.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| pre-deletion code → post-deletion code | All deletions are inside the FE bundle; no API contracts or external systems depend on `make-new-thing-here`. The only public surface was the URL `/mapview?index=make-new-thing-here`, which now falls through to the existing `else-if` chain (no crash, no auth bypass). |
| `git log --follow` archaeology | Deletion commit message body quotes the README excerpt — historical context survives via `git log` on the deleted path. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-03-01 (T-DEL) | Tampering | Stale references after `make-new-thing-here` removal — a missed reference site (e.g. the contentStore.js 6th site that PATTERNS Concern 9 surfaced) breaks the CC-04 acceptance gate | mitigate | The grep-zero gate (`grep -r "make-new-thing-here" Taipei-City-Dashboard-FE/src/` returns 0) is the structural verification that catches ANY missed reference. Per D-18, this gate is BLOCKING. The plan additionally enumerates all 6 sites in `must_haves.truths` so reviewers can checklist them. |
| T-03-03-02 | Denial of Service | Removing the `setRouteParams` short-circuit causes `/mapview?index=make-new-thing-here` to fall through and crash | accept | Per Concern 9 / PATTERNS line 736 analysis: after Tasks 1-2 nothing IN-TREE generates that URL, and a user manually crafting it triggers the existing `currentDashboard.components` else-branch which renders zero `<DashboardComponent>` elements (no crash). Risk surface is bounded to a hand-typed URL that no UI affordance produces. Tested by manual smoke (deferred to Plan 03-05). |
| T-03-03-03 | Information Disclosure | Deletion commit message body quotes README — could it leak something secret? | accept | README.md content is purely architectural prose ("how it's wired"). No credentials, no PII, no internal hostnames. Already published in the public repo at HEAD~. |
| T-03-03-04 | Repudiation | Loss of move-history archaeology if `rm -rf` used instead of `git rm -r` | mitigate | Action explicitly mandates `git rm -r` (vs `rm -rf` + `git add`). The recommended commit-message body preserves the architectural notes from README so `git log --follow` retains pointers. |
| T-03-03-05 | v-else-if orphan compile error | MapView.vue template fails to compile after deleting the `v-if` branch | mitigate | Task 1 mandates the `v-else-if` → `v-if` rewrite at the next sibling. Build gate (`npm run build` exit 0) catches a missed rewrite — Vue compile fails LOUDLY. PATTERNS Concern 5 documents this as the load-bearing detail. |

**Block-on severity:** T-03-03-01 (missed reference site) is HIGH — the grep-zero gate must pass or the plan is not done. T-03-03-05 (v-else-if orphan) is HIGH — the build gate must pass.
</threat_model>

<verification>
- `grep -r "make-new-thing-here" Taipei-City-Dashboard-FE/src/` returns ZERO matches — THE D-18 acceptance gate
- `test -d Taipei-City-Dashboard-FE/src/make-new-thing-here` exit `1`
- `git status --short Taipei-City-Dashboard-FE/src/make-new-thing-here/` shows 2 staged deletions
- `npm run build` exit `0` (Vue template compile succeeds — no orphan v-else-if)
- `grep -nE "^\s*v-(if|else-if|else)" Taipei-City-Dashboard-FE/src/views/MapView.vue | head -10` shows the FIRST conditional in the post-edit chain is `v-if`
- `grep -c "SideBarLink" Taipei-City-Dashboard-FE/src/components/utilities/bars/SideBar.vue` == 0
- `grep -c "SideBarTab" Taipei-City-Dashboard-FE/src/components/utilities/bars/SideBar.vue` ≥ 1 (untouched)
- `grep -c "setRouteParams" Taipei-City-Dashboard-FE/src/store/contentStore.js` ≥ 1 (action signature stays)
- D-20 boundary: `git diff` shows ZERO changes to mapStore.js, mapConfig.js, mapStyle.js, crossCompareStore.js, ViewToggle.vue, RampLegend.vue, router/index.js, NavBar.vue, CrossCompareView.vue, crossCompareConfig.js (CrossCompareView + crossCompareConfig are touched by Plans 03-01 and 03-04, NOT this plan)
</verification>

<success_criteria>
- 3 source files modified (~24 lines removed across them).
- 1 directory deleted (2 files removed).
- `grep -r "make-new-thing-here" Taipei-City-Dashboard-FE/src/` returns ZERO — the D-18 / CC-04 acceptance #3 gate.
- `npm run build` passes — no v-else-if orphan, no unused-vars warning.
- ROADMAP Phase 3 success criterion #3 satisfied.
- Deletion commit message preserves README archaeology per `git log --follow`.
</success_criteria>

<output>
After completion, create `.planning/phases/03-hover-interaction-polish/03-03-SUMMARY.md` recording:
- the 3 files modified with line-count deltas (negative)
- the directory + 2 files deleted (with `git status` evidence)
- gate evidence: grep-zero output (literally `(empty)` or `GREP_EXIT=1`), npm run build exit code 0
- D-IDs honoured: D-15, D-16, D-17, D-17b, D-18, D-19
- explicit confirmation: "CC-04 acceptance criterion #3 SATISFIED — grep-zero proven"
- the verbatim deletion commit-message body for traceability
</output>
</content>
</invoke>