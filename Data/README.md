# 食安相關資料

## 資料來源

| 資料集 | 來源 |
|--------|------|
| 餐飲衛生管理分級評核 | [衛生福利部食品藥物管理署](https://www.fda.gov.tw/TC/siteContent.aspx?sid=13591) |
| 臺北市 HACCP 及衛生講習課程 | [政府資料開放平台 dataset/9007](https://data.gov.tw/dataset/9007) |
| 新北市 HACCP 及衛生講習課程 | [政府資料開放平台 dataset/9006](https://data.gov.tw/dataset/9006) |
| 食品業者抽驗紀錄（整合版） | 新北市衛生局、臺北市衛生局、衛福部食藥署多來源整合 |

## 檔案說明

| 檔案 | 說明 |
|------|------|
| `food_hygiene/台北市114年度通過餐飲衛生管理分級評核名單(Excel).xlsx` | 臺北市 114 年度評核資料 |
| `food_hygiene/新北市114年度通過餐飲衛生管理分級評核名單(Excel).xlsx` | 新北市 114 年度評核資料 |
| `haccp_course/台北新北_115年_課程資料.json` | 雙北 115 年度 HACCP 及衛生講習課程（332 筆） |
| `merged_with_testings.jsonl` | 食品業者登記資料與多來源抽驗結果整合（229,012 筆） |

## 匯入資料庫

將資料匯入本機 Docker 環境，需執行以下指令（於**專案根目錄**下執行，Docker 容器須已啟動）：

```bash
# 1. 匯入食安評核資料表（food_hygiene_tp、food_hygiene_nt）
docker exec -i postgres-data psql -U postgres -d dashboard < Data/food_hygiene/db-sample-data/food_hygiene_dashboard.sql

# 2. 匯入 HACCP 課程資料表（haccp_course）
docker exec -i postgres-data psql -U postgres -d dashboard < Data/haccp_course/db-sample-data/haccp_course_dashboard.sql

# 3. 建立食品業者抽驗資料表 schema（food_inspection）
docker exec -i postgres-data psql -U postgres -d dashboard < Data/food_inspection/db-sample-data/food_inspection_dashboard.sql

# 4. 寫入食品業者抽驗資料（11,484 筆）
docker exec -i postgres-data psql -U postgres -d dashboard < Data/food_inspection/db-sample-data/food_inspection_data.sql

# 5. 匯入食安評核元件設定（components、component_maps、query_charts 等）
docker exec -i postgres-manager psql -U postgres -d dashboardmanager < Data/food_hygiene/db-sample-data/food_hygiene_manager.sql

# 6. 匯入 HACCP 課程元件設定
docker exec -i postgres-manager psql -U postgres -d dashboardmanager < Data/haccp_course/db-sample-data/haccp_course_manager.sql

# 7. 匯入食品業者抽驗元件設定（新增元件至儀表板）
docker exec -i postgres-manager psql -U postgres -d dashboardmanager < Data/food_inspection/db-sample-data/food_inspection_manager.sql
```

---

## 食品業者抽驗 GeoJSON 生成（地圖點位）

資料庫匯入**不需座標**，GeoJSON 由獨立腳本 geocoding 後產生。

### 生成 GeoJSON

```bash
# 安裝依賴
pip install requests

# 使用 Nominatim（免費，每秒 1 次，11,484 筆約需 3~4 小時）
py -3 Data/food_inspection/process_food_inspection.py --geocoder nominatim

# 使用 TGOS（台灣政府 API，需申請 key，速度較快）
py -3 Data/food_inspection/process_food_inspection.py --geocoder tgos --key YOUR_KEY

# 使用 Google Maps（需付費 key）
py -3 Data/food_inspection/process_food_inspection.py --geocoder google --key YOUR_KEY

# 測試用（只 geocode 前 50 筆）
py -3 Data/food_inspection/process_food_inspection.py --limit 50
```

腳本輸出（完成後複製至 FE 靜態資源即可）：
- `Taipei-City-Dashboard-FE/public/mapData/food_inspection_tp.geojson` — 臺北市地圖點位
- `Taipei-City-Dashboard-FE/public/mapData/food_inspection_metro.geojson` — 雙北地圖點位
- `Data/food_inspection/geocode_cache.csv` — 快取，中斷後重執行可斷點續傳

> 若需重新產生資料庫 SQL（例如重新整合 JSONL），執行：
> ```bash
> py -3 Data/food_inspection/generate_sql.py
> ```
