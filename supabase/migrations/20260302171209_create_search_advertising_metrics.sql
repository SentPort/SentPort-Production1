/*
  # Create Search Advertising Metrics System

  1. New Tables
    - `search_advertising_metrics`
      - `id` (uuid, primary key)
      - `metric_date` (date, unique)
      - `total_searches` (integer)
      - `unique_searchers` (integer)
      - `main_search_count` (integer)
      - `heddit_search_count` (integer)
      - `hubook_search_count` (integer)
      - `blog_search_count` (integer)
      - `zero_result_searches` (integer)
      - `avg_results_per_search` (decimal)
      - `search_engagement_rate` (decimal) - percentage
      - `created_at` (timestamptz)

    - `top_search_queries`
      - `id` (uuid, primary key)
      - `query_text` (text)
      - `search_count` (integer)
      - `platform` (text)
      - `last_searched_at` (timestamptz)
      - `avg_result_count` (integer)
      - Unique constraint on (query_text, platform)

    - `search_hourly_distribution`
      - `id` (uuid, primary key)
      - `hour_of_day` (integer) - 0-23
      - `total_searches` (integer)
      - `updated_at` (timestamptz)

  2. Functions
    - `aggregate_search_metrics()` - Daily search metrics rollup
    - `update_top_search_queries()` - Updates trending searches
    - `calculate_search_engagement()` - Tracks search to click rate
    - `get_search_advertising_stats()` - Returns comprehensive stats

  3. Security
    - Enable RLS on all tables
    - Only admins can view search metrics
*/

-- Create search_advertising_metrics table
CREATE TABLE IF NOT EXISTS search_advertising_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date UNIQUE NOT NULL,
  total_searches integer DEFAULT 0,
  unique_searchers integer DEFAULT 0,
  main_search_count integer DEFAULT 0,
  heddit_search_count integer DEFAULT 0,
  hubook_search_count integer DEFAULT 0,
  blog_search_count integer DEFAULT 0,
  zero_result_searches integer DEFAULT 0,
  avg_results_per_search decimal(10,2) DEFAULT 0,
  search_engagement_rate decimal(5,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE search_advertising_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view search metrics"
  ON search_advertising_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Create top_search_queries table
CREATE TABLE IF NOT EXISTS top_search_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text text NOT NULL,
  search_count integer DEFAULT 1,
  platform text DEFAULT 'main',
  last_searched_at timestamptz DEFAULT now(),
  avg_result_count integer DEFAULT 0,
  UNIQUE(query_text, platform)
);

ALTER TABLE top_search_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view top searches"
  ON top_search_queries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Create search_hourly_distribution table
CREATE TABLE IF NOT EXISTS search_hourly_distribution (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hour_of_day integer CHECK (hour_of_day >= 0 AND hour_of_day <= 23),
  total_searches integer DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(hour_of_day)
);

ALTER TABLE search_hourly_distribution ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view hourly distribution"
  ON search_hourly_distribution FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Function to aggregate daily search metrics
CREATE OR REPLACE FUNCTION aggregate_search_metrics(p_date date DEFAULT CURRENT_DATE)
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
  -- Count total searches for the date
  SELECT COUNT(*)
  INTO v_total_searches
  FROM analytics_searches
  WHERE DATE(created_at) = p_date;

  -- Count unique searchers (by session_id or user_id)
  SELECT COUNT(DISTINCT COALESCE(user_id::text, session_id))
  INTO v_unique_searchers
  FROM analytics_searches
  WHERE DATE(created_at) = p_date;

  -- Platform-specific counts
  SELECT
    COUNT(*) FILTER (WHERE platform = 'main') as main_count,
    COUNT(*) FILTER (WHERE platform = 'heddit') as heddit_count
  INTO v_main_count, v_heddit_count
  FROM analytics_searches
  WHERE DATE(created_at) = p_date;

  -- Average results per search
  SELECT AVG(result_count)
  INTO v_avg_results
  FROM analytics_searches
  WHERE DATE(created_at) = p_date
    AND result_count IS NOT NULL;

  -- Insert or update metrics
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
END;
$$;

-- Function to update top search queries
CREATE OR REPLACE FUNCTION update_top_search_query(
  p_query text,
  p_platform text DEFAULT 'main',
  p_result_count integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO top_search_queries (query_text, platform, search_count, avg_result_count, last_searched_at)
  VALUES (p_query, p_platform, 1, p_result_count, now())
  ON CONFLICT (query_text, platform)
  DO UPDATE SET
    search_count = top_search_queries.search_count + 1,
    last_searched_at = now(),
    avg_result_count = ((top_search_queries.avg_result_count * top_search_queries.search_count) + p_result_count) / (top_search_queries.search_count + 1);
END;
$$;

-- Function to track search by hour
CREATE OR REPLACE FUNCTION track_search_hour()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hour integer;
BEGIN
  v_hour := EXTRACT(HOUR FROM CURRENT_TIMESTAMP);
  
  INSERT INTO search_hourly_distribution (hour_of_day, total_searches, updated_at)
  VALUES (v_hour, 1, now())
  ON CONFLICT (hour_of_day)
  DO UPDATE SET
    total_searches = search_hourly_distribution.total_searches + 1,
    updated_at = now();
END;
$$;

-- Function to get comprehensive search advertising stats
CREATE OR REPLACE FUNCTION get_search_advertising_stats(
  p_days integer DEFAULT 30
)
RETURNS TABLE (
  total_searches_period bigint,
  avg_daily_searches numeric,
  unique_searchers_period bigint,
  top_platform text,
  estimated_monthly_searches bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    SUM(total_searches)::bigint as total_searches_period,
    AVG(total_searches)::numeric as avg_daily_searches,
    SUM(unique_searchers)::bigint as unique_searchers_period,
    (
      SELECT 
        CASE 
          WHEN SUM(main_search_count) >= SUM(heddit_search_count) THEN 'main'
          ELSE 'heddit'
        END
      FROM search_advertising_metrics
      WHERE metric_date >= CURRENT_DATE - p_days
    ) as top_platform,
    (AVG(total_searches) * 30)::bigint as estimated_monthly_searches
  FROM search_advertising_metrics
  WHERE metric_date >= CURRENT_DATE - p_days;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_search_metrics_date ON search_advertising_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_top_queries_count ON top_search_queries(search_count DESC);
CREATE INDEX IF NOT EXISTS idx_top_queries_platform ON top_search_queries(platform);
CREATE INDEX IF NOT EXISTS idx_hourly_dist_hour ON search_hourly_distribution(hour_of_day);
