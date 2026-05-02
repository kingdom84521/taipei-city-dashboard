---
slug: datalab-scaffold
date: 2026-05-02
status: in-progress
type: investigation+scaffold
---

# DataLab — 全新 dataview 注入點

## 目標

找出一個可以放入「完全不同意義的功能組件集」的位置,並建立外部進入點。需求:

1. 專案架構下允許寫入 N 個 component
2. 可獨立或巢狀放置一個 router,導向到看得到這些頁面的總 view route
3. View 上必須乾淨,不得有其他顯示其他資料的 component

## 關鍵架構發現

`Taipei-City-Dashboard-FE/src/App.vue` 是全局殼層控制器,依 `authStore.currentPath`(由 `router.beforeEach` 設為 `route.name`)分支渲染不同 layout:

| currentPath | 渲染內容 |
|---|---|
| `dashboard` / `mapview` | NavBar + SideBar + SettingsBar |
| `admin*` | NavBar + AdminSideBar |
| `component` / `component-info` | NavBar + ComponentSideBar |
| `embed` | **僅** `<router-view />`(NavBar 被 `v-if` 排除)|
| 其他 | NavBar + 裸 `<router-view />` |

只有 `embed` 是真正乾淨的(無 NavBar/SideBar/SettingsBar)。

「N 個 component 子套件」的既有先例是 `src/dashboardComponent/`:獨立目錄、有獨立 `LICENSE`、~20 個圖表元件,由 `EmbedView.vue` 透過 `/embed/:id/:city` 掛載。

## 候選路線

### 路線 A — 純 view + flat route(最少改動)
路由 name 不在 App.vue 認得的清單裡 → 落到裸 `<router-view />` 分支 — **但 NavBar 還在**。不符合「乾淨」要求。**淘汰。**

### 路線 B — 鏡射 embed pattern(採用)✅
1. 新增子套件目錄 `src/datalab/`
2. 新增 view `src/views/DataLabView.vue`
3. `src/router/index.js` 加 1 條 route(name `datalab`)+ 加入 mobile allow-list
4. 改 `src/App.vue:224` 的 NavBar `v-if` 排除 `datalab`

外部進入點 = URL `/datalab`。第三個 `beforeEach`(line 138-161)只 gate `admin*` / `component` / `component-info`,新 route 不會被擋,可未登入訪問。

### 路線 C — 巢狀子路由(預留升級空間)
若之後會長出 `/datalab/:section`,改用 Vue Router children + `<router-view />` 在 `DataLabView.vue` 內。**本 scaffold 預留:** `DataLabView.vue` 留 `<router-view />` 掛載點 + 註解說明轉換方式,不限制日後 flat 或 nested。

## 為什麼不選其他位置

- ❌ `src/views/admin/` — 受 `is_admin` 鎖,不是「外部進入點」
- ❌ 直接擴充 `src/dashboardComponent/` — 它有獨立 LICENSE 是給 `/embed` iframe 用的發布套件
- ❌ 沿用 `EmbedView.vue` — 寫死從 `/component/:id/all` 取資料,重用會被既有資料流綁住

## Scaffold 實作清單(本次執行)

| 動作 | 檔案 |
|---|---|
| 新建目錄 | `Taipei-City-Dashboard-FE/src/datalab/`(放 N 個 components 用)|
| 新建檔 | `Taipei-City-Dashboard-FE/src/datalab/README.md`(說明此目錄用途)|
| 新建檔 | `Taipei-City-Dashboard-FE/src/views/DataLabView.vue`(空殼,內含 `<router-view />` 預留巢狀)|
| 編輯 | `Taipei-City-Dashboard-FE/src/router/index.js`:加 `datalab` route + mobile allow-list |
| 編輯 | `Taipei-City-Dashboard-FE/src/App.vue`:NavBar `v-if` 加入 `datalab` 排除 |

## 驗收條件

- 啟動 dev server 後,瀏覽 `/datalab` 頁面 → 200 OK,無 NavBar/SideBar/SettingsBar
- 頁面上沒有任何顯示其他資料的 component(空 view)
- 後續可在 `src/datalab/` 內加任意 N 個 component 並 import 進 `DataLabView.vue`
- 後續可改用 children 改成巢狀 routes 而不需動其他結構

## 後續(本 scaffold 不做)

- 實際的功能組件 — 等使用者決定要做什麼
- 是否進一步排除 LogIn 對話框 / ChatBot 浮動按鈕 / NotificationBar(目前 embed 也保留這些,維持 embed-parity)
- 若需要嚴格無任何 overlay,後續可在 App.vue 把對應 v-if 條件擴充
