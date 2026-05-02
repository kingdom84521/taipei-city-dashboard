--
-- HACCP 及衛生講習課程 Component Configuration
-- Target database: dashboardmanager
--
-- Tables: components, component_charts, component_maps, query_charts
--
-- Data source:
--   臺北市: https://data.gov.tw/dataset/9007
--   新北市: https://data.gov.tw/dataset/9006
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
VALUES (10, 'haccp_course_tp', 'HACCP及衛生講習課程')
ON CONFLICT (id) DO UPDATE SET
    index = EXCLUDED.index,
    name  = EXCLUDED.name;

SELECT setval('public.components_id_seq', GREATEST((SELECT MAX(id) FROM public.components), nextval('public.components_id_seq') - 1));

-- -----------------------------------------------
-- component_charts
-- -----------------------------------------------

INSERT INTO public.component_charts (index, color, types, unit)
VALUES ('haccp_course_tp', '{#5B8DEF,#F5A623}', '{ColumnChart}', '堂')
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
    11,
    'haccp_course_tp',
    '食安課程實體地點',
    'circle',
    'geojson',
    NULL,
    NULL,
    '{"circle-color":["match",["get","type"],"HACCP課程","#5B8DEF","衛生講習課程","#F5A623","混合課程","#9C27B0","#9E9E9E"],"circle-radius":8,"circle-opacity":0.85,"circle-stroke-width":1.5,"circle-stroke-color":"#ffffff"}',
    '[{"key":"type","name":"課程種類"},{"key":"city","name":"縣市"},{"key":"district","name":"行政區"},{"key":"address","name":"上課地點"},{"key":"organizer","name":"承辦單位"}]'
),
(
    12,
    'haccp_course_metro',
    '食安課程實體地點（雙北）',
    'circle',
    'geojson',
    NULL,
    NULL,
    '{"circle-color":["match",["get","type"],"HACCP課程","#5B8DEF","衛生講習課程","#F5A623","混合課程","#9C27B0","#9E9E9E"],"circle-radius":8,"circle-opacity":0.85,"circle-stroke-width":1.5,"circle-stroke-color":"#ffffff"}',
    '[{"key":"type","name":"課程種類"},{"key":"city","name":"縣市"},{"key":"district","name":"行政區"},{"key":"address","name":"上課地點"},{"key":"organizer","name":"承辦單位"}]'
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

DELETE FROM public.query_charts WHERE index = 'haccp_course_tp';

INSERT INTO public.query_charts
    (index, city, history_config, map_config_ids, map_filter,
     time_from, time_to, update_freq, update_freq_unit,
     source, short_desc, long_desc, use_case, links, contributors,
     created_at, updated_at, query_type, query_chart, query_history)
VALUES
(
    'haccp_course_tp',
    'taipei',
    NULL,
    '{11}',
    '{}',
    'static', NULL, 0, '',
    '政府資料開放平台（data.gov.tw）',
    '顯示臺北市115年度HACCP及衛生講習課程課堂數，依課程種類與上課方式（線上/實體）分布。',
    '本資料來源為政府資料開放平台，收錄臺北市115年度衛生福利部核備之HACCP課程及衛生講習課程。圖表依課程種類與上課方式統計課堂數，地圖顯示有實體場地之課程地點。',
    '可供衛生局掌握食安培訓資源分布與線上/實體比例，協助規劃課程配置與資源補強。',
    '{https://data.gov.tw/dataset/9007}',
    '{doit}',
    NOW(), NOW(),
    'three_d',
    'SELECT t.type AS x_axis, l.loc AS y_axis, COALESCE(COUNT(c.id), 0) AS data
FROM (SELECT DISTINCT type FROM public.haccp_course) t
CROSS JOIN (VALUES (''線上''), (''實體'')) l(loc)
LEFT JOIN public.haccp_course c
  ON c.type = t.type
  AND c.city = ''臺北市''
  AND (CASE WHEN c.lat IS NOT NULL THEN ''實體'' ELSE ''線上'' END) = l.loc
GROUP BY t.type, l.loc
ORDER BY t.type, l.loc',
    NULL
),
(
    'haccp_course_tp',
    'metrotaipei',
    NULL,
    '{12}',
    '{}',
    'static', NULL, 0, '',
    '政府資料開放平台（data.gov.tw）',
    '顯示雙北地區115年度HACCP及衛生講習課程課堂數，依課程種類與上課方式（線上/實體）分布。',
    '本資料來源為政府資料開放平台，收錄臺北市及新北市115年度衛生福利部核備之HACCP課程及衛生講習課程。圖表依課程種類與上課方式統計課堂數，地圖顯示有實體場地之課程地點。',
    '可供雙北衛生局共同掌握食安培訓資源分布與線上/實體比例，提升大台北地區餐飲業食品安全管理水準。',
    '{https://data.gov.tw/dataset/9007,https://data.gov.tw/dataset/9006}',
    '{doit}',
    NOW(), NOW(),
    'three_d',
    'SELECT t.type AS x_axis, l.loc AS y_axis, COALESCE(COUNT(c.id), 0) AS data
FROM (SELECT DISTINCT type FROM public.haccp_course) t
CROSS JOIN (VALUES (''線上''), (''實體'')) l(loc)
LEFT JOIN public.haccp_course c
  ON c.type = t.type
  AND (CASE WHEN c.lat IS NOT NULL THEN ''實體'' ELSE ''線上'' END) = l.loc
GROUP BY t.type, l.loc
ORDER BY t.type, l.loc',
    NULL
)
;

-- -----------------------------------------------
-- dashboards（將元件加入食安健康儀表板）
-- -----------------------------------------------

UPDATE public.dashboards
SET components = array_append(components, 10),
    updated_at = NOW()
WHERE index = 'food_safety_health_metrotaipei'
  AND NOT (10 = ANY(COALESCE(components, '{}'::integer[])));
