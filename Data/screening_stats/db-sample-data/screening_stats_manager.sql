--
-- Screening Stats Component Configuration
-- Target database: dashboardmanager
--
-- Tables: components, component_charts, query_charts, dashboards
--
-- Data source:
--   臺北市衛生局篩檢院所統計
--   新北市衛生局篩檢院所統計
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- -----------------------------------------------
-- components
-- -----------------------------------------------

INSERT INTO public.components (id, index, name)
VALUES (30, 'screening_stats_metro', '篩檢院所統計')
ON CONFLICT (id) DO UPDATE SET
    index = EXCLUDED.index,
    name  = EXCLUDED.name;

SELECT setval('public.components_id_seq', GREATEST((SELECT MAX(id) FROM public.components), nextval('public.components_id_seq') - 1));

-- -----------------------------------------------
-- component_charts
-- -----------------------------------------------

-- 6 色對應 6 個篩檢項目（series 順序由 query_chart ORDER BY screen_type 決定）
-- color[0] 同時作為 DistrictChart 的 choropleth 填色基準
INSERT INTO public.component_charts (index, color, types, unit)
VALUES (
    'screening_stats_metro',
    '{#5B8DEF,#E91E63,#4CAF50,#FF9800,#9C27B0,#FF5722}',
    '{PolarAreaChart,ColumnChart,DistrictChart}',
    '間'
)
ON CONFLICT (index) DO UPDATE SET
    color = EXCLUDED.color,
    types = EXCLUDED.types,
    unit  = EXCLUDED.unit;

-- -----------------------------------------------
-- query_charts
-- -----------------------------------------------

DELETE FROM public.query_charts WHERE index = 'screening_stats_metro';

INSERT INTO public.query_charts
    (index, city, history_config, map_config_ids, map_filter,
     time_from, time_to, update_freq, update_freq_unit,
     source, short_desc, long_desc, use_case, links, contributors,
     created_at, updated_at, query_type, query_chart, query_history)
VALUES
(
    'screening_stats_metro',
    'taipei',
    NULL,
    '{}',
    '{}',
    'static', NULL, 0, '',
    '臺北市政府資料開放平台',
    '顯示臺北市各行政區篩檢院所依篩檢項目（子宮頸癌、口腔癌、大腸癌、乳癌、肺癌、幽門螺旋桿菌）之院所數統計。',
    '本資料來源為臺北市政府資料開放平台，統計各行政區提供六大癌症及幽門螺旋桿菌篩檢服務之院所數，供民眾查詢就近篩檢資源。',
    '可協助衛生局掌握各行政區篩檢資源分布，作為篩檢服務擴充或資源補強之依據，並提供民眾查詢所在區域可用篩檢項目。',
    '{https://data.taipei}',
    '{doit}',
    NOW(), NOW(),
    'three_d',
    'SELECT district AS x_axis, screen_type AS y_axis, count AS data
FROM public.screening_stats
WHERE city = ''臺北市''
ORDER BY district, screen_type',
    NULL
),
(
    'screening_stats_metro',
    'metrotaipei',
    NULL,
    '{}',
    '{}',
    'static', NULL, 0, '',
    '臺北市政府資料開放平台、新北市政府資料開放平台',
    '顯示雙北地區各行政區篩檢院所依篩檢項目（子宮頸癌、口腔癌、大腸癌、乳癌、肺癌、幽門螺旋桿菌）之院所數統計。',
    '本資料整合臺北市及新北市政府資料開放平台，統計雙北各行政區提供六大癌症及幽門螺旋桿菌篩檢服務之院所數，供民眾查詢就近篩檢資源。',
    '可協助雙北衛生局共同掌握大台北地區篩檢資源分布，提升整體癌症早期篩檢覆蓋率，並提供民眾跨縣市查詢篩檢資源。',
    '{https://data.taipei,https://data.ntpc.gov.tw}',
    '{doit}',
    NOW(), NOW(),
    'three_d',
    'SELECT district AS x_axis, screen_type AS y_axis, count AS data
FROM public.screening_stats
ORDER BY district, screen_type',
    NULL
)
;

-- -----------------------------------------------
-- dashboards（將元件加入食安健康儀表板）
-- -----------------------------------------------

UPDATE public.dashboards
SET components = array_append(components, 30),
    updated_at = NOW()
WHERE index = 'food_safety_health_metrotaipei'
  AND NOT (30 = ANY(COALESCE(components, '{}'::integer[])));
