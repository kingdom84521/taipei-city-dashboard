--
-- Food Inspection Component Configuration
-- Target database: dashboardmanager
--
-- Tables: components, component_charts, component_maps, query_charts, dashboards
--
-- Data source:
--   新北市衛生局、臺北市衛生局、衛生福利部食品藥物管理署
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
VALUES (20, 'food_inspection_metro', '食品業者抽驗紀錄')
ON CONFLICT (id) DO UPDATE SET
    index = EXCLUDED.index,
    name  = EXCLUDED.name;

SELECT setval('public.components_id_seq', GREATEST((SELECT MAX(id) FROM public.components), nextval('public.components_id_seq') - 1));

-- -----------------------------------------------
-- component_charts
-- -----------------------------------------------

INSERT INTO public.component_charts (index, color, types, unit)
VALUES ('food_inspection_metro', '{#4DB464,#E53935}', '{DistrictChart,ColumnChart}', '家')
ON CONFLICT (index) DO UPDATE SET
    color = EXCLUDED.color,
    types = EXCLUDED.types,
    unit  = EXCLUDED.unit;

-- -----------------------------------------------
-- component_maps
-- -----------------------------------------------

INSERT INTO public.component_maps (id, index, title, type, source, size, icon, paint, property)
VALUES
(
    20,
    'food_inspection_tp',
    '食品業者抽驗結果',
    'circle',
    'geojson',
    NULL,
    NULL,
    '{"circle-color":["match",["get","result"],"通過","#4DB464","未通過","#E53935","#9E9E9E"],"circle-radius":6,"circle-opacity":0.85,"circle-stroke-width":1,"circle-stroke-color":"#ffffff"}',
    '[{"key":"name","name":"業者名稱"},{"key":"address","name":"地址"},{"key":"district","name":"行政區"},{"key":"city","name":"縣市"},{"key":"result","name":"抽驗結果"},{"key":"types","name":"抽驗種類"},{"key":"grade","name":"衛生分級"}]'
),
(
    21,
    'food_inspection_metro',
    '食品業者抽驗結果（雙北）',
    'circle',
    'geojson',
    NULL,
    NULL,
    '{"circle-color":["match",["get","result"],"通過","#4DB464","未通過","#E53935","#9E9E9E"],"circle-radius":6,"circle-opacity":0.85,"circle-stroke-width":1,"circle-stroke-color":"#ffffff"}',
    '[{"key":"name","name":"業者名稱"},{"key":"address","name":"地址"},{"key":"district","name":"行政區"},{"key":"city","name":"縣市"},{"key":"result","name":"抽驗結果"},{"key":"types","name":"抽驗種類"},{"key":"grade","name":"衛生分級"}]'
)
ON CONFLICT (id) DO UPDATE SET
    index    = EXCLUDED.index,
    title    = EXCLUDED.title,
    type     = EXCLUDED.type,
    source   = EXCLUDED.source,
    size     = EXCLUDED.size,
    icon     = EXCLUDED.icon,
    paint    = EXCLUDED.paint,
    property = EXCLUDED.property;

SELECT setval('public.component_maps_id_seq', GREATEST((SELECT MAX(id) FROM public.component_maps), nextval('public.component_maps_id_seq') - 1));

-- -----------------------------------------------
-- query_charts
-- -----------------------------------------------

DELETE FROM public.query_charts WHERE index = 'food_inspection_metro';

INSERT INTO public.query_charts
    (index, city, history_config, map_config_ids, map_filter,
     time_from, time_to, update_freq, update_freq_unit,
     source, short_desc, long_desc, use_case, links, contributors,
     created_at, updated_at, query_type, query_chart, query_history)
VALUES
(
    'food_inspection_metro',
    'taipei',
    NULL,
    '{20}',
    '{}',
    'static', NULL, 0, '',
    '衛生福利部食品藥物管理署、臺北市衛生局',
    '顯示臺北市食品業者抽驗紀錄，依行政區與抽驗結果（通過/未通過）統計。',
    '整合臺北市食品稽查及餐飲衛生分級評核資料，呈現各業者的食安抽驗履歷與結果。',
    '可協助衛生局掌握各行政區食品業者抽驗通過率，作為食安稽查資源分配依據，並提供民眾查詢食安紀錄。',
    '{https://www.fda.gov.tw/TC/siteContent.aspx?sid=13591}',
    '{doit}',
    NOW(), NOW(),
    'three_d',
    'SELECT d.district AS x_axis, r.result AS y_axis, COALESCE(COUNT(t.id), 0) AS data
FROM (SELECT DISTINCT district FROM public.food_inspection WHERE city = ''臺北市'' AND district <> '''') d
CROSS JOIN (VALUES (''通過''), (''未通過'')) r(result)
LEFT JOIN public.food_inspection t
  ON t.district = d.district
 AND t.result   = r.result
 AND t.city     = ''臺北市''
GROUP BY d.district, r.result
ORDER BY d.district, r.result',
    NULL
),
(
    'food_inspection_metro',
    'metrotaipei',
    NULL,
    '{21}',
    '{}',
    'static', NULL, 0, '',
    '衛生福利部食品藥物管理署、臺北市衛生局、新北市衛生局',
    '顯示雙北地區食品業者抽驗紀錄，依行政區與抽驗結果（通過/未通過）統計。',
    '整合新北市抽驗（販售端/製造端）、餐飲衛生分級評核、第二級品管驗證及臺北市稽查等多來源資料，呈現雙北食品業者食安履歷。',
    '可協助雙北衛生局共同掌握各行政區食品業者抽驗通過率，提升大台北地區食品安全管理水準，並提供民眾查詢食安紀錄。',
    '{https://www.fda.gov.tw/TC/siteContent.aspx?sid=13591}',
    '{doit}',
    NOW(), NOW(),
    'three_d',
    'SELECT d.district AS x_axis, r.result AS y_axis, COALESCE(COUNT(t.id), 0) AS data
FROM (SELECT DISTINCT district FROM public.food_inspection WHERE district <> '''') d
CROSS JOIN (VALUES (''通過''), (''未通過'')) r(result)
LEFT JOIN public.food_inspection t
  ON t.district = d.district
 AND t.result   = r.result
GROUP BY d.district, r.result
ORDER BY d.district, r.result',
    NULL
)
;

-- -----------------------------------------------
-- dashboards（將元件加入食安健康儀表板）
-- -----------------------------------------------

UPDATE public.dashboards
SET components = array_append(components, 20),
    updated_at = NOW()
WHERE index = 'food_safety_health_metrotaipei'
  AND NOT (20 = ANY(COALESCE(components, '{}'::integer[])));
