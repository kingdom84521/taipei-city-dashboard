--
-- PostgreSQL database dump
-- Target database: dashboard
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

SET default_tablespace = '';
SET default_table_access_method = heap;

--
-- Name: screening_stats; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.screening_stats;

CREATE TABLE public.screening_stats (
    id          SERIAL PRIMARY KEY,
    district    CHARACTER VARYING(20),
    city        CHARACTER VARYING(20),
    screen_type CHARACTER VARYING(30),
    count       INTEGER
);

--
-- 欄位說明
--   district    行政區
--   city        縣市（臺北市 / 新北市）
--   screen_type 篩檢項目（子宮頸癌 / 口腔癌 / 大腸癌 / 乳癌 / 肺癌 / 幽門螺旋桿菌）
--   count       該行政區該篩檢項目之院所數
--
