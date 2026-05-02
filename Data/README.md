# 餐飲衛生與 HACCP 課程資料

## 資料來源

| 資料集 | 來源 |
|--------|------|
| 餐飲衛生管理分級評核 | [衛生福利部食品藥物管理署](https://www.fda.gov.tw/TC/siteContent.aspx?sid=13591) |
| 臺北市 HACCP 及衛生講習課程 | [政府資料開放平台 dataset/9007](https://data.gov.tw/dataset/9007) |
| 新北市 HACCP 及衛生講習課程 | [政府資料開放平台 dataset/9006](https://data.gov.tw/dataset/9006) |

## 檔案說明

| 檔案 | 說明 |
|------|------|
| `台北市114年度通過餐飲衛生管理分級評核名單(Excel).xlsx` | 臺北市 114 年度評核資料 |
| `新北市114年度通過餐飲衛生管理分級評核名單(Excel).xlsx` | 新北市 114 年度評核資料 |
| `../台北新北_115年_課程資料.json` | 雙北 115 年度 HACCP 及衛生講習課程（332 筆，含臺北市 314 筆、新北市 18 筆） |

## 匯入資料庫

將資料匯入本機 Docker 環境，需執行以下指令：

```bash
# 1. 匯入食安評核資料表（food_hygiene_tp、food_hygiene_nt）
docker exec -i postgres-data psql -U postgres -d dashboard \
  < db-sample-data/food_hygiene_dashboard.sql

# 2. 匯入 HACCP 課程資料表（haccp_course）
docker exec -i postgres-data psql -U postgres -d dashboard \
  < db-sample-data/haccp_course_dashboard.sql

# 3. 匯入食安評核元件設定（components、component_maps、query_charts 等）
docker exec -i postgres-manager psql -U postgres -d dashboardmanager \
  < db-sample-data/food_hygiene_manager.sql

# 4. 匯入 HACCP 課程元件設定
docker exec -i postgres-manager psql -U postgres -d dashboardmanager \
  < db-sample-data/haccp_course_manager.sql
```

> 指令需在專案根目錄下執行，且 Docker 容器須已啟動。
