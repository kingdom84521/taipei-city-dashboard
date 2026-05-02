---
slug: make-new-thing-here-scaffold
date: 2026-05-02
status: in-progress
type: investigation+scaffold
revision: 3
---

# Make New Thing Here — 全新 dataview 注入點

## 目標(修正後)

在 MapView 路由下開出一個 synthetic `index=make-new-thing-here`,
從左側 SideBar 進入,NavBar 與 SideBar 一直保留(殼層不變),
只把右側內容區整個換成 Make New Thing Here 元件集。

需求:
1. 專案架構下允許寫入 N 個 component(放 `src/make-new-thing-here/components/`)
2. 進入點 = SideBar 上的固定 entry,連結到 `/mapview?index=make-new-thing-here`
3. 右側內容區乾淨,不顯示任何其他 dashboard 的資料 component

## 設計決策

**不新增 route。** 沿用 `/mapview` route name,Make New Thing Here 是該 route 上的
synthetic index(類似既有 `map-layers` 那個特殊 index 的處理模式)。好處:

- NavBar / SideBar / `App.vue` layout 分支完全不動 — 殼層自然保留
- 不需要新的 route 守門邏輯、mobile allow-list、auth gate
- `MapView.vue` 已存在按 index 分支 render 內容的 pattern,只是再加一個前置分支
- BE 不需要新 dashboard 資料

## 變更檔案

| 動作 | 檔案 | 用途 |
|---|---|---|
| 新增 | `src/make-new-thing-here/MakeNewThingHerePanel.vue` | 內容容器,N 個 component 掛這裡 |
| 新增 | `src/make-new-thing-here/components/`(目錄) | 放各個 component |
| 新增 | `src/make-new-thing-here/README.md` | 使用指南 |
| 新增 | `src/components/utilities/miscellaneous/SideBarLink.vue` | SideBar 直接連結用元件,支援含 query 的 to |
| 編輯 | `src/views/MapView.vue` | 最頂層加 `v-if="isMakeNewThingHere"`(`route.query.index === 'make-new-thing-here'`),render `MakeNewThingHerePanel`,搶在所有 dashboard 分支前 |
| 編輯 | `src/components/utilities/bars/SideBar.vue` | 在「公共儀表板」上方加「工具」section + Make New Thing Here `SideBarLink` |
| 編輯 | `src/store/contentStore.js` | `setRouteParams` 內偵測 `index === "make-new-thing-here"` 時 early-return,**避免 `setCurrentDashboardAllContent` 找不到 dashboard 而 router.replace 把 user 踢回第一個真實 dashboard** |

## 為何加 contentStore 那條 early-return

未處理會發生:
1. User 點連結 → URL 變 `/mapview?index=make-new-thing-here`
2. `App.vue` watch route.query 觸發 setRouteParams → setCurrentDashboardAllContent
3. dashboards Map 找不到 index `make-new-thing-here` → 線 227-248 自動 `router.replace` 到第一個 dashboard
4. User 被踢走,入口進不去

加 early-return 後 setRouteParams 直接帶過,不啟動 redirect 邏輯。

## 驗收條件

- 點 SideBar 的「Make New Thing Here」→ URL 變 `/mapview?index=make-new-thing-here`,不被 redirect
- 內容區只渲染 MakeNewThingHerePanel(目前空白),NavBar 與 SideBar 仍在
- 切回其他 dashboard 後再回來,行為一致
- ESLint pass(已驗證)
- Vite HMR reload 全部清乾淨,無 console error
