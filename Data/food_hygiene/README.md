# 餐飲衛生管理分級評核資料

資料來源：[衛生福利部食品藥物管理署](https://www.fda.gov.tw/TC/siteContent.aspx?sid=13591)

## 檔案說明

| 檔案 | 說明 |
|------|------|
| `台北市114年度通過餐飲衛生管理分級評核名單(Excel).xlsx` | 臺北市 114 年度評核資料 |
| `新北市114年度通過餐飲衛生管理分級評核名單(Excel).xlsx` | 新北市 114 年度評核資料 |

## 匯入資料庫

將資料匯入本機 Docker 環境，需執行以下兩道指令：

```bash
# 1. 匯入食安資料表（food_hygiene_tp、food_hygiene_nt）
docker exec -i postgres-data psql -U postgres -d dashboard \
  < db-sample-data/food_hygiene_dashboard.sql

# 2. 匯入元件設定（components、component_maps、query_charts 等）
docker exec -i postgres-manager psql -U postgres -d dashboardmanager \
  < db-sample-data/food_hygiene_manager.sql
```

> 指令需在專案根目錄下執行，且 Docker 容器須已啟動。
