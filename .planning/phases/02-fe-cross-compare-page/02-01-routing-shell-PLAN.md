---
phase: 02-fe-cross-compare-page
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue
  - Taipei-City-Dashboard-FE/src/router/index.js
  - Taipei-City-Dashboard-FE/src/components/utilities/bars/NavBar.vue
autonomous: false
requirements: [CC-01]
tags: [vue, vue-router, navbar, scaffolding]
must_haves:
  truths:
    - "Visiting http://localhost:8080/crosscompare resolves a real Vue view (no 404, no MapView fallback)"
    - "NavBar shows a 跨區比較 entry between 儀表板總覽 and 地圖交叉比對 that navigates to /crosscompare"
    - "/crosscompare does NOT trigger contentStore.setRouteParams (the existing /dashboard, /mapview branch in router.beforeEach is untouched)"
    - "D-15: file layout shipped per CONTEXT.md — exactly one new view file (CrossCompareView.vue), router edit, NavBar edit; no extras created"
    - "D-17: /crosscompare is public-readable — NO auth guard added in router.beforeEach, mirrors /dashboard"
  artifacts:
    - path: "Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue"
      provides: "Top-level view scaffold with TUIC banner + empty #crosscompareMapBox div"
      contains: "Developed By Taipei Urban Intelligence Center"
    - path: "Taipei-City-Dashboard-FE/src/router/index.js"
      provides: "Eager-imported /crosscompare route"
      contains: "CrossCompareView"
    - path: "Taipei-City-Dashboard-FE/src/components/utilities/bars/NavBar.vue"
      provides: "<router-link to='/crosscompare'> entry"
      contains: "跨區比較"
  key_links:
    - from: "Taipei-City-Dashboard-FE/src/router/index.js"
      to: "Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue"
      via: "eager import + routes array entry"
      pattern: "import CrossCompareView from \"\\.\\./views/CrossCompareView\\.vue\""
    - from: "Taipei-City-Dashboard-FE/src/components/utilities/bars/NavBar.vue"
      to: "/crosscompare route"
      via: "<router-link :to=\"`/crosscompare...`\">"
      pattern: "/crosscompare"
---

<objective>
Add the routing shell, NavBar entry, and a minimal CrossCompareView.vue scaffold so that
http://localhost:8080/crosscompare resolves to a real Vue route (not a 404 or MapView
fallback). Implements requirement CC-01.

Purpose: This unblocks every other Plan 02 task. The view file exists with a TUIC banner,
imports a placeholder set of Vue lifecycle hooks, and renders an empty
`#crosscompareMapBox` div. NO Mapbox instantiation, NO store wiring, NO components yet —
those land in Plans 02-04 and 02-05. This plan is pure routing plumbing.

Output:
- New file `src/views/CrossCompareView.vue` (scaffold with TUIC banner — long-lived view)
- Edit `src/router/index.js` (eager import + new entry between /dashboard and /mapview, per D-15 and PATTERNS.md `router/index.js` section)
- Edit `src/components/utilities/bars/NavBar.vue` (new `<router-link>` between 儀表板總覽 and 地圖交叉比對, label `跨區比較`, public — no auth guard, mirrors `/dashboard`)
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/02-fe-cross-compare-page/02-CONTEXT.md
@.planning/phases/02-fe-cross-compare-page/02-PATTERNS.md
@./CLAUDE.md
@Taipei-City-Dashboard-FE/src/router/index.js
@Taipei-City-Dashboard-FE/src/components/utilities/bars/NavBar.vue
@Taipei-City-Dashboard-FE/src/views/MapView.vue

<interfaces>
<!-- Key existing patterns the executor needs. Extracted directly from the codebase. -->
<!-- Use these verbatim — no exploration needed. -->

From src/router/index.js (existing eager imports for primary routes; lines 16-20):
```js
import DashboardView from "../views/DashboardView.vue";
import MapView from "../views/MapView.vue";
import ComponentView from "../views/ComponentView.vue";
import ComponentInfoView from "../views/ComponentInfoView.vue";
import EmbedView from "../views/EmbedView.vue";
```

From src/router/index.js (existing route entries to slot between; lines 32-41):
```js
{
    path: "/dashboard",
    name: "dashboard",
    component: DashboardView,
},
{
    path: "/mapview",
    name: "mapview",
    component: MapView,
},
```

From src/components/utilities/bars/NavBar.vue (existing <router-link> block; lines 69-82):
```vue
<router-link
    :to="`/dashboard${
        linkQuery.includes('undefined') ? '' : linkQuery
    }`"
>
    儀表板總覽
</router-link>
<router-link
    :to="`/mapview${
        linkQuery.includes('undefined') ? '' : linkQuery
    }`"
>
    地圖交叉比對
</router-link>
```

From src/views/MapView.vue (TUIC banner head; lines 1-9 — copy verbatim into CrossCompareView):
```vue
<!-- Developed By Taipei Urban Intelligence Center 2023-2024 -->
<!--
Lead Developer:  Igor Ho (Full Stack Engineer)
Data Pipelines:  Iima Yu (Data Scientist)
Design and UX: Roy Lin (Fmr. Consultant), Chu Chen (Researcher)
Systems: Ann Shih (Systems Engineer)
Testing: Jack Huang (Data Scientist), Ian Huang (Data Analysis Intern)
-->
<!-- Department of Information Technology, Taipei City Government -->
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create CrossCompareView.vue scaffold (TUIC banner + empty #crosscompareMapBox div)</name>
  <files>Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue</files>
  <read_first>
    - .planning/phases/02-fe-cross-compare-page/02-CONTEXT.md (D-04, D-06, D-07, D-15 — view owns its own map; full-bleed under NavBar; file layout)
    - .planning/phases/02-fe-cross-compare-page/02-PATTERNS.md (CrossCompareView.vue section — TUIC banner block lines 33-43, template chrome lines 146-154, SCSS pattern lines 159-181)
    - Taipei-City-Dashboard-FE/src/views/MapView.vue lines 1-50 (TUIC banner verbatim)
    - Taipei-City-Dashboard-FE/src/components/map/MapContainer.vue (#mapboxBox empty-div pattern + height: calc(100vh - 60px) precedent)
    - ./CLAUDE.md (hard tabs MANDATORY; no path aliases; relative imports only)
  </read_first>
  <action>
    Create `Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` with HARD TABS (eslint indent rule fails on spaces). The file is a scaffold ONLY — no Mapbox, no store wiring, no components imported. Plans 02-04 and 02-05 fill it in. This task ships ONLY the banner + empty-div + scoped SCSS so the route resolves cleanly.

    Per D-04 the view will own a Mapbox instance (Plan 02-04). Per D-07 the map is full-bleed under the 60px NavBar. Per D-15 file layout, this is the only view file.

    Paste this content verbatim (already in tabs — verify by `grep -P '^\t' Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue | head` after writing):

    ```vue
    <!-- Developed By Taipei Urban Intelligence Center 2023-2024 -->
    <!--
    Lead Developer:  Igor Ho (Full Stack Engineer)
    Data Pipelines:  Iima Yu (Data Scientist)
    Design and UX: Roy Lin (Fmr. Consultant), Chu Chen (Researcher)
    Systems: Ann Shih (Systems Engineer)
    Testing: Jack Huang (Data Scientist), Ian Huang (Data Analysis Intern)
    -->
    <!-- Department of Information Technology, Taipei City Government -->

    <!-- 跨區比較頁：地圖底圖 + 各區分數渲染（地圖實例與資料拉取於 Plan 02-04 / 02-02 補上） -->

    <script setup>
    // 此頁面在 Plan 02-04 會掛上 mapboxgl.Map 實例與 fill layers。
    // 此 Plan (02-01) 僅建立路由骨架，確保 /crosscompare 可解析到一個真正的 Vue view。
    </script>

    <template>
        <div class="crosscompare">
            <!-- #crosscompareMapBox needs to be empty to ensure Mapbox performance (Plan 02-04 attaches map here) -->
            <div id="crosscompareMapBox" />
        </div>
    </template>

    <style scoped lang="scss">
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
    </style>
    ```

    Notes:
    - The template has ONE empty div `#crosscompareMapBox`. Do NOT add ViewToggle / RampLegend imports yet — Plan 02-05 inserts those when the components exist.
    - Inline comments are Traditional Chinese to match `mapStore.js` / `vite.config.js` precedent (PATTERNS.md "Inline-comment language").
    - The 60px NavBar offset matches `MapContainer.vue` SCSS pattern.
    - File header is the FULL TUIC banner block (5 roles), per CONVENTIONS.md "TUIC banner is for long-lived views/*.vue". Phase 2 files are NOT sandbox.
  </action>
  <verify>
    <automated>test -f Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue &amp;&amp; grep -q "Developed By Taipei Urban Intelligence Center" Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue &amp;&amp; grep -q 'id="crosscompareMapBox"' Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue &amp;&amp; grep -P '^\t' Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue | head -1 | grep -q .</automated>
  </verify>
  <acceptance_criteria>
    - File exists at the exact path
    - First line is the TUIC banner comment (`<!-- Developed By Taipei Urban Intelligence Center 2023-2024 -->`)
    - Template contains an empty `<div id="crosscompareMapBox" />` (self-closing or empty pair both acceptable)
    - File contains at least one tab-indented line (validates hard-tab use; ESLint's `indent: tab` rule passes)
    - No `mapboxgl`, no `useCrossCompareStore`, no `ViewToggle` import — those are Plan 02-04 / 02-05's job
  </acceptance_criteria>
  <done>
    `CrossCompareView.vue` exists, is tab-indented, has TUIC banner, empty `#crosscompareMapBox` div, and scoped SCSS. No Mapbox / store / component imports yet.
  </done>
</task>

<task type="auto">
  <name>Task 2: Register /crosscompare route (eager import) in router/index.js</name>
  <files>Taipei-City-Dashboard-FE/src/router/index.js</files>
  <read_first>
    - Taipei-City-Dashboard-FE/src/router/index.js (full — lines 11-41 for import + routes array; lines 109-194 for the four `router.beforeEach` blocks. Confirm we are NOT extending the content-loading guard at lines 164-194 — per PATTERNS.md `src/router/index.js` section that's intentional)
    - .planning/phases/02-fe-cross-compare-page/02-PATTERNS.md (`src/router/index.js (EDIT)` section — eager-import style; mobile-guard whitelist intentionally omits "crosscompare")
    - .planning/phases/02-fe-cross-compare-page/02-CONTEXT.md (D-15 — exact route path; D-17 — public, no auth guard)
  </read_first>
  <action>
    Edit `Taipei-City-Dashboard-FE/src/router/index.js`. Make TWO changes; do nothing else.

    **Change 1 — eager import** (insert at line 21, immediately after `import EmbedView from "../views/EmbedView.vue";`). Match the eager-import style of the four primary routes (NOT the lazy `() => import(...)` style used for callback / admin routes — Phase 2's PATTERNS.md `src/router/index.js (EDIT)` section explicitly chose eager to mirror DashboardView/MapView):

    ```js
    import CrossCompareView from "../views/CrossCompareView.vue";
    ```

    **Change 2 — routes array entry** (insert between the `/dashboard` entry at lines 32-36 and the `/mapview` entry at lines 37-41). The new entry has NO auth guard (mirrors /dashboard, per D-17 the page is public-readable):

    ```js
    {
        path: "/crosscompare",
        name: "crosscompare",
        component: CrossCompareView,
    },
    ```

    The resulting routes array order should be: `/`, `/callback`, `/dashboard`, `/crosscompare`, `/mapview`, `/component`, ...

    **DO NOT** modify any of the four `router.beforeEach` blocks (lines 109-204). Per PATTERNS.md:
    - The mobile-guard whitelist at line 124 (`["dashboard", "component-info", "callback", "embed", "mapview"]`) intentionally OMITS `"crosscompare"`. Mobile-narrow responsive is deferred — narrow devices will redirect to `/dashboard`. Do not add it.
    - The content-loading guard at lines 164-194 intentionally only fires for `/dashboard` and `/mapview`. CrossCompareView does its own fetching in `onMounted` (Plan 02-04) — leave the guard alone.
    - The `mapStore.clearEntireMap()` call at line 188 will fire on every non-`/mapview` navigation (including LEAVING `/crosscompare`). That is fine — `/crosscompare` never touched the singleton `mapStore`, so `clearEntireMap` is a safe no-op.

    Use hard tabs (the rest of the file uses tabs — preserve that).
  </action>
  <verify>
    <automated>grep -q 'import CrossCompareView from "\.\./views/CrossCompareView\.vue"' Taipei-City-Dashboard-FE/src/router/index.js &amp;&amp; grep -q 'path: "/crosscompare"' Taipei-City-Dashboard-FE/src/router/index.js &amp;&amp; grep -q 'name: "crosscompare"' Taipei-City-Dashboard-FE/src/router/index.js &amp;&amp; grep -q 'component: CrossCompareView' Taipei-City-Dashboard-FE/src/router/index.js</automated>
  </verify>
  <acceptance_criteria>
    - Eager `import CrossCompareView from "../views/CrossCompareView.vue";` present
    - Route entry with `path: "/crosscompare"`, `name: "crosscompare"`, `component: CrossCompareView` present
    - The new entry sits BETWEEN the `/dashboard` and `/mapview` entries (verify by line ordering: `awk '/path: "\/dashboard"/{d=NR} /path: "\/crosscompare"/{c=NR} /path: "\/mapview"/{m=NR} END{exit !(d<c && c<m)}' Taipei-City-Dashboard-FE/src/router/index.js`)
    - The mobile-guard whitelist at line 124 area still reads exactly `["dashboard", "component-info", "callback", "embed", "mapview"]` — `"crosscompare"` is NOT added
    - No edits to the four `router.beforeEach` blocks
  </acceptance_criteria>
  <done>
    Visiting `/crosscompare` will not 404 and will not fall through to the catch-all `/:pathMatch(.*)*` redirect to `/dashboard`. Mobile-narrow devices DO still redirect (intentional, per PATTERNS.md).
  </done>
</task>

<task type="auto">
  <name>Task 3: Insert &lt;router-link to=&quot;/crosscompare&quot;&gt; in NavBar.vue between 儀表板總覽 and 地圖交叉比對</name>
  <files>Taipei-City-Dashboard-FE/src/components/utilities/bars/NavBar.vue</files>
  <read_first>
    - Taipei-City-Dashboard-FE/src/components/utilities/bars/NavBar.vue lines 1-110 (full template head — the existing 儀表板總覽 / 地圖交叉比對 block at lines 69-82 is the analog; the `組件瀏覽平台` link at 59-68 is auth-gated and we are NOT mirroring that)
    - .planning/phases/02-fe-cross-compare-page/02-PATTERNS.md (`src/components/utilities/bars/NavBar.vue (EDIT)` section — exact <router-link> block to insert; `linkQuery` interpolation pattern; label = `跨區比較`)
    - .planning/phases/02-fe-cross-compare-page/02-CONTEXT.md (D-15 — NavBar edit; CC-01 — link must navigate to /crosscompare)
  </read_first>
  <action>
    Edit `Taipei-City-Dashboard-FE/src/components/utilities/bars/NavBar.vue`. Insert exactly one new `<router-link>` block BETWEEN the existing `/dashboard` link (lines 69-75) and the existing `/mapview` link (lines 76-82). No other changes.

    The block to insert (mirror the existing two — same `linkQuery` interpolation guard, no `v-if`, no auth guard — `/crosscompare` is public per D-17). Label is `跨區比較` (chosen per CONTEXT `<code_context>` to parallel `儀表板總覽` and `地圖交叉比對`):

    ```vue
          <router-link
            :to="`/crosscompare${
              linkQuery.includes('undefined') ? '' : linkQuery
            }`"
          >
            跨區比較
          </router-link>
    ```

    The resulting block structure (lines 59-90 area, post-edit):
    1. `<router-link v-if="authStore.token" :to="`/component`" ...>` (existing, unchanged)
    2. `<router-link :to="`/dashboard...">` (existing, unchanged)
    3. `<router-link :to="`/crosscompare...">` (NEW)
    4. `<router-link :to="`/mapview...">` (existing, unchanged)

    **DO NOT:**
    - Add a `v-if="authStore.token"` guard (per PATTERNS.md "Auth gate" note — this link is public like /dashboard and /mapview)
    - Touch the SCSS — the existing `&-tabs a` styling at lines 218-241 applies automatically
    - Touch any other lines (logo, user menu, mobile-mode handling)
    - Edit the `linkQuery` computed (lines 21-26) — the new entry consumes it as-is

    Match the existing indentation (NavBar.vue uses spaces in some places and tabs in others — eslint `--fix` will sort it during build, but match what is locally adjacent at lines 69-82 to minimize the diff).
  </action>
  <verify>
    <automated>grep -q '`/crosscompare\${' Taipei-City-Dashboard-FE/src/components/utilities/bars/NavBar.vue &amp;&amp; grep -q '跨區比較' Taipei-City-Dashboard-FE/src/components/utilities/bars/NavBar.vue &amp;&amp; awk '/`\/dashboard\${/{d=NR} /`\/crosscompare\${/{c=NR} /`\/mapview\${/{m=NR} END{exit !(d<c && c<m)}' Taipei-City-Dashboard-FE/src/components/utilities/bars/NavBar.vue</automated>
  </verify>
  <acceptance_criteria>
    - Exactly one `<router-link>` containing the literal string `/crosscompare` was added
    - Label content is `跨區比較` (4 chars, parallels 儀表板總覽 / 地圖交叉比對)
    - The new link sits BETWEEN the /dashboard link and the /mapview link in source order (awk gate above)
    - No `v-if` guard on the new link (it's public)
    - The `linkQuery` computed binding format is preserved verbatim
  </acceptance_criteria>
  <done>
    NavBar renders 跨區比較 between 儀表板總覽 and 地圖交叉比對. Clicking it triggers vue-router and lands on /crosscompare.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 4: Smoke verify route resolution</name>
  <what-built>
    A new top-level route `/crosscompare` registered in vue-router and a NavBar link `跨區比較` that points at it. CrossCompareView is an empty-div scaffold (Plans 02-04 and 02-05 fill it in).
  </what-built>
  <how-to-verify>
    1. From repo root, in `Taipei-City-Dashboard-FE/`, run `npm run dev` (Vite serves on :8080).
    2. Open `http://localhost:8080/crosscompare` in a browser.
    3. Expected: A blank page (just the NavBar at top, then empty body where the map will eventually render). NO 404 redirect to /dashboard. NO MapView UI.
    4. Look at the NavBar — the `跨區比較` entry should appear BETWEEN `儀表板總覽` and `地圖交叉比對`.
    5. Click `跨區比較` — URL should navigate to `/crosscompare` (with whatever `linkQuery` was active).
    6. Open DevTools Console — there should be NO errors. (Warnings about empty store / no map are fine; this view is intentionally bare.)
    7. Click back to `儀表板總覽` (should load /dashboard normally — the existing flow must not be broken).
  </how-to-verify>
    <action>
    Stop here and wait for the user to perform the verification listed in <how-to-verify>. The user manually drives the dev server (`cd Taipei-City-Dashboard-FE && npm run dev`) and confirms each numbered step. Do NOT auto-resume; wait for the resume-signal text 'approved' or a failure description.
  </action>
  <verify>User explicitly types 'approved' (or equivalent) in response to the resume-signal prompt.</verify>
  <done>All 7 verification steps pass; user has approved the route resolution checkpoint.</done>
  <resume-signal>
    Type "approved" if all 7 checks pass, or describe what failed.
  </resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser → SPA route | The /crosscompare path is publicly reachable; no auth gate (D-17). Treat any URL-based parameters as untrusted, but Plan 02-01 introduces no parameters — the route is a fixed string. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-01-01 | Tampering | router-link path interpolation | accept | The `linkQuery` template uses `?index` / `?city` from the current URL, NOT user-typed input. Existing /dashboard and /mapview links use the same pattern with no exploit history. The `linkQuery.includes('undefined')` guard suppresses the literal string "undefined" — that is the entire sanitization surface and we mirror it exactly. |
| T-02-01-02 | Information disclosure | route name added to authStore.currentPath | accept | `router.beforeEach` at lines 109-117 sets `authStore.currentPath = "crosscompare"`. This is a string ID, used for active-tab styling only; it is not logged or transmitted. |
| T-02-01-03 | Spoofing | open redirect via router-link | mitigate | The new link's `:to` binding is a string-literal-prefix `/crosscompare` — not a user-controlled path. Vue Router resolves it against the in-app routes table; external URLs are not reachable through this code path. |
| T-02-01-04 | Elevation of privilege | bypass auth on a sensitive page | accept | Per D-17 the page is intentionally public (mirrors /dashboard). No PII is rendered (Phase 2 shows district scores, no user data). Treating as accept aligns with explicit user decision. |
</threat_model>

<verification>
After all 3 auto tasks + 1 checkpoint:
- `test -f Taipei-City-Dashboard-FE/src/views/CrossCompareView.vue` exits 0
- `grep -c "跨區比較" Taipei-City-Dashboard-FE/src/components/utilities/bars/NavBar.vue` is exactly 1
- `grep -c '/crosscompare' Taipei-City-Dashboard-FE/src/router/index.js` is at least 2 (import + path)
- `cd Taipei-City-Dashboard-FE && npm run build` passes (does NOT need to pass at the end of THIS plan — Plan 02-06 owns the final build gate; but it should at least not introduce new lint errors)
- Browser smoke: /crosscompare resolves, NavBar shows the new link
</verification>

<success_criteria>
- New file `CrossCompareView.vue` exists with TUIC banner and empty #crosscompareMapBox div
- `/crosscompare` route registered in router/index.js with eager import, between /dashboard and /mapview
- NavBar shows `跨區比較` link between 儀表板總覽 and 地圖交叉比對
- No 404 on `/crosscompare`
- No edits to `mapStore.js`, `mapConfig.js`, or any of the four `router.beforeEach` blocks (per D-16)
- ROADMAP success criteria #1 ("Visiting /crosscompare resolves a new view") + #2 ("NavBar shows a new entry") are achievable; full sign-off in Plan 02-06.
- Requirement CC-01 implemented (per D-15 file layout)
</success_criteria>

<output>
After completion, create `.planning/phases/02-fe-cross-compare-page/02-01-SUMMARY.md` documenting:
- Files touched (3) + line numbers
- Confirmation that no other guards / stores / mapConfig were touched
- Browser smoke result
- Blockers for Plan 02-04 (none expected — the empty div is ready for Mapbox attachment)
</output>
