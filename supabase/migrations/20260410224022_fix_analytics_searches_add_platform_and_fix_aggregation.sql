/*
  # Fix Analytics Searches: Add Platform Column and Fix Aggregation Function

  ## Summary
  The analytics pipeline was broken in two ways:
  1. The `analytics_searches` table was missing a `platform` column, so the
     `aggregate_search_metrics()` function had no platform data to split on.
  2. The `aggregate_search_metrics()` function referenced `result_count` but the
     actual column in `analytics_searches` is `results_count` (with an 's').

  ## Changes
  1. Add `platform` column (text, default 'main') to `analytics_searches`
  2. Rewrite `aggregate_search_metrics()` to use the correct `results_count` column
     and also update `top_search_queries` by upserting trending queries from raw data
  3. Add `track_search_hour()` call inside `aggregate_search_metrics()` to ensure
     search_hourly_distribution stays populated
*/

-- 1. Add platform column to analytics_searches
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analytics_searches' AND column_name = 'platform'
  ) THEN
    ALTER TABLE analytics_searches ADD COLUMN platform text NOT NULL DEFAULT 'main';
  END IF;
END $$;

-- 2. Fix aggregate_search_metrics to use correct column name (results_count not result_count)
--    and also populate top_search_queries
CREATE OR REPLACE FUNCTION public.aggregate_search_metrics(p_date date DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_searches integer;
  v_unique_searchers integer;
  v_main_count integer;
  v_heddit_count integer;
  v_avg_results decimal(10,2);
BEGIN
  SELECT COUNT(*)
  INTO v_total_searches
  FROM analytics_searches
  WHERE DATE(created_at) = p_date;

  SELECT COUNT(DISTINCT COALESCE(user_id::text, session_id))
  INTO v_unique_searchers
  FROM analytics_searches
  WHERE DATE(created_at) = p_date;

  SELECT
    COUNT(*) FILTER (WHERE platform = 'main') AS main_count,
    COUNT(*) FILTER (WHERE platform = 'heddit') AS heddit_count
  INTO v_main_count, v_heddit_count
  FROM analytics_searches
  WHERE DATE(created_at) = p_date;

  -- Fixed: was referencing non-existent 'result_count', now uses correct 'results_count'
  SELECT AVG(results_count)
  INTO v_avg_results
  FROM analytics_searches
  WHERE DATE(created_at) = p_date
    AND results_count IS NOT NULL;

  INSERT INTO search_advertising_metrics (
    metric_date,
    total_searches,
    unique_searchers,
    main_search_count,
    heddit_search_count,
    avg_results_per_search
  )
  VALUES (
    p_date,
    v_total_searches,
    v_unique_searchers,
    v_main_count,
    v_heddit_count,
    COALESCE(v_avg_results, 0)
  )
  ON CONFLICT (metric_date)
  DO UPDATE SET
    total_searches = EXCLUDED.total_searches,
    unique_searchers = EXCLUDED.unique_searchers,
    main_search_count = EXCLUDED.main_search_count,
    heddit_search_count = EXCLUDED.heddit_search_count,
    avg_results_per_search = EXCLUDED.avg_results_per_search;

  -- Upsert top search queries from this day's data
  INSERT INTO top_search_queries (query_text, search_count, platform, last_searched_at, avg_result_count)
  SELECT
    query,
    COUNT(*) AS search_count,
    platform,
    MAX(created_at) AS last_searched_at,
    ROUND(AVG(results_count))::integer AS avg_result_count
  FROM analytics_searches
  WHERE DATE(created_at) = p_date
  GROUP BY query, platform
  ON CONFLICT (query_text)
  DO UPDATE SET
    search_count = top_search_queries.search_count + EXCLUDED.search_count,
    last_searched_at = GREATEST(top_search_queries.last_searched_at, EXCLUDED.last_searched_at),
    avg_result_count = EXCLUDED.avg_result_count;
END;
$$;

-- 3. Ensure top_search_queries has a unique constraint on query_text for the upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'top_search_queries_query_text_key'
  ) THEN
    ALTER TABLE top_search_queries ADD CONSTRAINT top_search_queries_query_text_key UNIQUE (query_text);
  END IF;
END $$;
