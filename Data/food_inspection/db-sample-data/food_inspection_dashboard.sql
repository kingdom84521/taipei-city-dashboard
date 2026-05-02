--
-- PostgreSQL database dump
-- Target database: dashboard
--
-- Data source:
--   新北市衛生局抽驗資料（販售端/製造端）
--   臺北市、新北市餐飲衛生管理分級評核（衛福部食藥署）
--   衛福部第二級品管驗證
--   臺北市衛生局稽查紀錄
--
-- 使用方式：
--   1. 執行本檔建立資料表
--   2. 執行 Data/food_inspection/process_food_inspection.py 產生座標與 GeoJSON
--   3. 執行產出的 food_inspection_data.sql 寫入資料
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

SET default_tablespace = '';
SET default_table_access_method = heap;

--
-- Name: food_inspection; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.food_inspection;

CREATE TABLE public.food_inspection (
    id               SERIAL PRIMARY KEY,
    company_name     CHARACTER VARYING(200),
    tax_id           CHARACTER VARYING(20),
    address          CHARACTER VARYING(300),
    district         CHARACTER VARYING(20),
    city             CHARACTER VARYING(20),
    result           CHARACTER VARYING(10),
    inspection_types CHARACTER VARYING(200),
    hygiene_grade    CHARACTER VARYING(5)
);

--
-- 欄位說明
--   company_name     業者名稱
--   tax_id           統一編號
--   address          登記地址
--   district         行政區（從地址解析）
--   city             縣市（臺北市 / 新北市）
--   result           抽驗結果：通過 / 未通過
--   inspection_types 抽驗種類（以頓號分隔）
--   hygiene_grade    衛生分級評核結果：優 / 良（無則為 NULL）
--
-- 座標（lat/lng）不存入資料庫，由 process_food_inspection.py 產生 GeoJSON
--
