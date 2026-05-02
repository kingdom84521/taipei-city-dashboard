---
slug: make-new-thing-here-scaffold
date: 2026-05-02
status: complete
revision: 3
---

# Summary — Make New Thing Here Scaffold

## What changed

入口名稱定為 `make-new-thing-here`,是 `/mapview` 下的 synthetic index。
進入點是 SideBar 上的「工具 → Make New Thing Here」固定連結,點下去走
`/mapview?index=make-new-thing-here`。NavBar 與 SideBar 一直在,只有右側內容區
換成乾淨的 MakeNewThingHerePanel。

## Files

| Action | Path |
|---|---|
| created | `Taipei-City-Dashboard-FE/src/make-new-thing-here/MakeNewThingHerePanel.vue`(N components 容器) |
| created | `Taipei-City-Dashboard-FE/src/make-new-thing-here/components/`(空目錄) |
| created | `Taipei-City-Dashboard-FE/src/make-new-thing-here/README.md` |
| created | `Taipei-City-Dashboard-FE/src/components/utilities/miscellaneous/SideBarLink.vue` |
| edited | `Taipei-City-Dashboard-FE/src/views/MapView.vue`(最頂層加 `v-if="isMakeNewThingHere"` 分支) |
| edited | `Taipei-City-Dashboard-FE/src/components/utilities/bars/SideBar.vue`(新增「工具」section + Make New Thing Here 連結) |
| edited | `Taipei-City-Dashboard-FE/src/store/contentStore.js`(`setRouteParams` 對 `make-new-thing-here` early-return,擋掉 auto-redirect) |

## Verification

- ESLint: pass on all touched files
- Vite HMR reloaded cleanly,`GET /mapview?index=make-new-thing-here` → `200 OK`
- contentStore early-return 擋住了「找不到 dashboard 自動 redirect」的副作用
- MakeNewThingHerePanel 為空(等待加 component)— 符合「乾淨」要求

## Future steps

- 把 N 個實際功能元件放在 `src/make-new-thing-here/components/` 並 import 進
  `MakeNewThingHerePanel.vue`
- 若日後想做內部分頁(像 `?index=make-new-thing-here&section=foo`),
  在 MakeNewThingHerePanel 內處理 `route.query.section` 即可,不需要動 router
