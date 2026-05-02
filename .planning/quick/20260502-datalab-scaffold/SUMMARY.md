---
slug: datalab-scaffold
date: 2026-05-02
status: complete
revision: 2
---

# Summary — DataLab Scaffold(修正版)

## What changed

DataLab 不再是獨立 route,而是 `/mapview` 下的 synthetic index `datalab`。
進入點是 SideBar 上的「工具 → DataLab」固定連結,點下去走 `/mapview?index=datalab`。
NavBar 與 SideBar 一直在,只有右側內容區換成乾淨的 DataLabPanel。

## Files

| Action | Path |
|---|---|
| created | `Taipei-City-Dashboard-FE/src/datalab/DataLabPanel.vue`(N components 容器) |
| created | `Taipei-City-Dashboard-FE/src/datalab/components/`(空目錄) |
| created | `Taipei-City-Dashboard-FE/src/components/utilities/miscellaneous/SideBarLink.vue`(SideBar 直連元件,支援 query) |
| updated | `Taipei-City-Dashboard-FE/src/datalab/README.md`(改寫為 MapView synthetic index 模式) |
| edited | `Taipei-City-Dashboard-FE/src/views/MapView.vue`(最頂層加 `v-if="isDataLab"` 分支) |
| edited | `Taipei-City-Dashboard-FE/src/components/utilities/bars/SideBar.vue`(新增「工具」section + DataLab 連結) |
| edited | `Taipei-City-Dashboard-FE/src/store/contentStore.js`(`setRouteParams` 對 `datalab` early-return,擋掉 auto-redirect) |
| reverted | `Taipei-City-Dashboard-FE/src/views/DataLabView.vue`(刪除) |
| reverted | `Taipei-City-Dashboard-FE/src/router/index.js`(移除 datalab route + mobile allow-list) |
| reverted | `Taipei-City-Dashboard-FE/src/App.vue`(回到原狀,殼層保留) |
| reverted | `Taipei-City-Dashboard-FE/src/components/utilities/miscellaneous/SideBarTab.vue`(無需 basePath 修正) |

## Verification

- ESLint: pass on all touched files
- Vite HMR reloaded cleanly,`GET /mapview?index=datalab` → `200 OK`
- contentStore early-return 擋住了「找不到 dashboard 自動 redirect」的副作用
- DataLabPanel 為空(等待 user 加 component)— 符合「乾淨」要求

## Future steps

- 把 N 個實際功能元件放在 `src/datalab/components/` 並 import 進 `DataLabPanel.vue`
- 若日後想做「DataLab 內部分頁」(像 `?index=datalab&section=foo`),在 DataLabPanel 內處理 `route.query.section` 即可,不需要動 router
