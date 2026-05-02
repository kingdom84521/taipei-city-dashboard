--
-- Food Hygiene Component Configuration
-- Target database: dashboardmanager
--
-- Tables: components, component_charts, component_maps, query_charts
--
-- Data source: 衛生福利部食品藥物管理署
-- URL: https://www.fda.gov.tw/TC/siteContent.aspx?sid=13591
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
VALUES (2, 'food_hygiene_tp', '餐飲衛生管理分級評核')
ON CONFLICT (id) DO UPDATE SET
    index = EXCLUDED.index,
    name  = EXCLUDED.name;

SELECT setval('public.components_id_seq', GREATEST((SELECT MAX(id) FROM public.components), nextval('public.components_id_seq') - 1));

-- -----------------------------------------------
-- component_charts
-- -----------------------------------------------

INSERT INTO public.component_charts (index, color, types, unit)
VALUES ('food_hygiene_tp', '{#4DB464,#F5C860}', '{DistrictChart,ColumnChart}', '家')
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
    2,
    'food_hygiene_tp',
    '餐飲衛生評核業者',
    'circle',
    'geojson',
    NULL,
    NULL,
    '{"circle-color":["match",["get","result"],"優","#4DB464","良","#F5C860","#9E9E9E"],"circle-radius":6,"circle-opacity":0.85,"circle-stroke-width":1,"circle-stroke-color":"#ffffff"}',
    '[{"key":"name","name":"業者名稱"},{"key":"address","name":"地址"},{"key":"district","name":"行政區"},{"key":"result","name":"評核結果"}]'
),
(
    5,
    'food_hygiene_metro',
    '餐飲衛生評核業者（雙北）',
    'circle',
    'geojson',
    NULL,
    NULL,
    '{"circle-color":["match",["get","result"],"優","#4DB464","良","#F5C860","#9E9E9E"],"circle-radius":6,"circle-opacity":0.85,"circle-stroke-width":1,"circle-stroke-color":"#ffffff"}',
    '[{"key":"name","name":"業者名稱"},{"key":"address","name":"地址"},{"key":"district","name":"行政區"},{"key":"result","name":"評核結果"}]'
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

DELETE FROM public.query_charts WHERE index = 'food_hygiene_tp';

INSERT INTO public.query_charts
    (index, city, history_config, map_config_ids, map_filter,
     time_from, time_to, update_freq, update_freq_unit,
     source, short_desc, long_desc, use_case, links, contributors,
     created_at, updated_at, query_type, query_chart, query_history)
VALUES
(
    'food_hygiene_tp',
    'taipei',
    NULL,
    '{2}',
    '{}',
    'static', NULL, 0, '',
    '衛生福利部食品藥物管理署',
    '顯示臺北市114年度通過餐飲衛生管理分級評核業者之行政區分布。',
    '本資料來源為衛生福利部食品藥物管理署，收錄114年度通過餐飲衛生管理分級評核之業者。評核分為「優」與「良」兩個等級，可供民眾查詢及作為食安資源分配依據。',
    '可與人口密度、商業聚落圖資疊加，協助市府進行餐飲衛生稽查資源配置，並提供民眾食安查詢服務。',
    '{https://www.fda.gov.tw/TC/siteContent.aspx?sid=13591}',
    '{doit}',
    NOW(), NOW(),
    'three_d',
    'SELECT d.district AS x_axis, r.result AS y_axis, COALESCE(COUNT(t.id), 0) AS data
FROM (SELECT DISTINCT district FROM public.food_hygiene_tp) d
CROSS JOIN (SELECT DISTINCT result FROM public.food_hygiene_tp) r
LEFT JOIN public.food_hygiene_tp t ON t.district = d.district AND t.result = r.result
GROUP BY d.district, r.result
ORDER BY d.district, r.result',
    NULL
),
(
    'food_hygiene_tp',
    'metrotaipei',
    NULL,
    '{5}',
    '{}',
    'static', NULL, 0, '',
    '衛生福利部食品藥物管理署',
    '顯示雙北地區114年度通過餐飲衛生管理分級評核業者之行政區分布。',
    '本資料來源為衛生福利部食品藥物管理署，收錄臺北市及新北市114年度通過餐飲衛生管理分級評核之業者。評核分為「優」與「良」兩個等級，可供民眾查詢及作為食安資源分配依據。',
    '可與人口密度、商業聚落圖資疊加，協助市府進行餐飲衛生稽查資源配置，並提供民眾食安查詢服務。',
    '{https://www.fda.gov.tw/TC/siteContent.aspx?sid=13591}',
    '{doit}',
    NOW(), NOW(),
    'three_d',
    'SELECT d.district AS x_axis, r.result AS y_axis, COALESCE(COUNT(t.id), 0) AS data
FROM (
  SELECT DISTINCT district FROM public.food_hygiene_tp
  UNION
  SELECT DISTINCT district FROM public.food_hygiene_nt
) d
CROSS JOIN (SELECT unnest(ARRAY[''優'',''良'']) AS result) r
LEFT JOIN (
  SELECT id, district, result FROM public.food_hygiene_tp
  UNION ALL
  SELECT id, district, result FROM public.food_hygiene_nt
) t ON t.district = d.district AND t.result = r.result
GROUP BY d.district, r.result
ORDER BY d.district, r.result',
    NULL
)
;
