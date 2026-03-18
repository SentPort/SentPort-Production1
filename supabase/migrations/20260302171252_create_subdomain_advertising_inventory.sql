/*
  # Create Subdomain Advertising Inventory System

  1. New Tables
    - `subdomain_advertising_metrics`
      - `id` (uuid, primary key)
      - `metric_date` (date, unique)
      - `total_subdomains` (integer)
      - `active_subdomains` (integer)
      - `total_subdomain_visits` (integer)
      - `unique_subdomain_visitors` (integer)
      - `total_subdomain_pageviews` (bigint)
      - `avg_traffic_per_subdomain` (decimal)
      - `subdomain_growth_rate` (decimal) - percentage
      - `created_at` (timestamptz)

  2. Functions
    - `aggregate_subdomain_metrics()` - Daily subdomain metrics rollup
    - `calculate_subdomain_dau()` - Daily active users across subdomains
    - `get_subdomain_inventory_stats()` - Comprehensive subdomain stats
    - `calculate_digital_real_estate_value()` - Estimated ad revenue potential

  3. Security
    - Enable RLS
    - Only admins can view metrics
*/

-- Create subdomain_advertising_metrics table
CREATE TABLE IF NOT EXISTS subdomain_advertising_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date UNIQUE NOT NULL,
  total_subdomains integer DEFAULT 0,
  active_subdomains integer DEFAULT 0,
  total_subdomain_visits integer DEFAULT 0,
  unique_subdomain_visitors integer DEFAULT 0,
  total_subdomain_pageviews bigint DEFAULT 0,
  avg_traffic_per_subdomain decimal(10,2) DEFAULT 0,
  subdomain_growth_rate decimal(5,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subdomain_advertising_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view subdomain metrics"
  ON subdomain_advertising_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Function to aggregate subdomain metrics
CREATE OR REPLACE FUNCTION aggregate_subdomain_metrics(p_date date DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_subdomains integer;
  v_active_subdomains integer;
  v_total_visits integer;
  v_unique_visitors integer;
  v_total_pageviews bigint;
  v_avg_traffic decimal(10,2);
  v_growth_rate decimal(5,2);
  v_previous_total integer;
BEGIN
  -- Count total subdomains ever created
  SELECT COUNT(*)
  INTO v_total_subdomains
  FROM user_subdomains;

  -- Count active subdomains (with visits in last 30 days or status = 'active')
  SELECT COUNT(DISTINCT us.id)
  INTO v_active_subdomains
  FROM user_subdomains us
  WHERE us.status = 'active'
    AND (
      us.last_accessed_at >= p_date - INTERVAL '30 days'
      OR EXISTS (
        SELECT 1 FROM analytics_subdomain_visits asv
        WHERE asv.subdomain_id = us.id
        AND DATE(asv.visited_at) >= p_date - INTERVAL '30 days'
      )
    );

  -- Total visits on this date
  SELECT COUNT(*)
  INTO v_total_visits
  FROM analytics_subdomain_visits
  WHERE DATE(visited_at) = p_date;

  -- Unique visitors on this date
  SELECT COUNT(DISTINCT visitor_id)
  INTO v_unique_visitors
  FROM analytics_subdomain_visits
  WHERE DATE(visited_at) = p_date
    AND visitor_id IS NOT NULL;

  -- Total pageviews from subdomain_analytics_daily
  SELECT COALESCE(SUM(page_views), 0)
  INTO v_total_pageviews
  FROM subdomain_analytics_daily
  WHERE date = p_date;

  -- Average traffic per subdomain
  IF v_active_subdomains > 0 THEN
    v_avg_traffic := v_total_visits::decimal / v_active_subdomains::decimal;
  ELSE
    v_avg_traffic := 0;
  END IF;

  -- Calculate growth rate (compare to 30 days ago)
  SELECT total_subdomains INTO v_previous_total
  FROM subdomain_advertising_metrics
  WHERE metric_date = p_date - INTERVAL '30 days';

  IF v_previous_total IS NOT NULL AND v_previous_total > 0 THEN
    v_growth_rate := ((v_total_subdomains - v_previous_total)::decimal / v_previous_total::decimal) * 100;
  ELSE
    v_growth_rate := 0;
  END IF;

  -- Insert or update metrics
  INSERT INTO subdomain_advertising_metrics (
    metric_date,
    total_subdomains,
    active_subdomains,
    total_subdomain_visits,
    unique_subdomain_visitors,
    total_subdomain_pageviews,
    avg_traffic_per_subdomain,
    subdomain_growth_rate
  )
  VALUES (
    p_date,
    v_total_subdomains,
    v_active_subdomains,
    v_total_visits,
    v_unique_visitors,
    v_total_pageviews,
    v_avg_traffic,
    v_growth_rate
  )
  ON CONFLICT (metric_date)
  DO UPDATE SET
    total_subdomains = EXCLUDED.total_subdomains,
    active_subdomains = EXCLUDED.active_subdomains,
    total_subdomain_visits = EXCLUDED.total_subdomain_visits,
    unique_subdomain_visitors = EXCLUDED.unique_subdomain_visitors,
    total_subdomain_pageviews = EXCLUDED.total_subdomain_pageviews,
    avg_traffic_per_subdomain = EXCLUDED.avg_traffic_per_subdomain,
    subdomain_growth_rate = EXCLUDED.subdomain_growth_rate;
END;
$$;

-- Function to calculate subdomain DAU
CREATE OR REPLACE FUNCTION calculate_subdomain_dau(p_date date DEFAULT CURRENT_DATE)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subdomain_dau integer;
BEGIN
  SELECT COUNT(DISTINCT visitor_id)
  INTO v_subdomain_dau
  FROM analytics_subdomain_visits
  WHERE DATE(visited_at) = p_date
    AND visitor_id IS NOT NULL;
  
  RETURN COALESCE(v_subdomain_dau, 0);
END;
$$;

-- Function to get comprehensive subdomain inventory stats
CREATE OR REPLACE FUNCTION get_subdomain_inventory_stats(
  p_days integer DEFAULT 30
)
RETURNS TABLE (
  total_subdomains_current integer,
  active_subdomains_current integer,
  avg_daily_visits numeric,
  total_monthly_pageviews bigint,
  avg_growth_rate_percent numeric,
  estimated_ad_impressions_monthly bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT total_subdomains FROM subdomain_advertising_metrics ORDER BY metric_date DESC LIMIT 1) as total_subdomains_current,
    (SELECT active_subdomains FROM subdomain_advertising_metrics ORDER BY metric_date DESC LIMIT 1) as active_subdomains_current,
    AVG(total_subdomain_visits)::numeric as avg_daily_visits,
    SUM(total_subdomain_pageviews)::bigint as total_monthly_pageviews,
    AVG(subdomain_growth_rate)::numeric as avg_growth_rate_percent,
    (SUM(total_subdomain_pageviews) * 3)::bigint as estimated_ad_impressions_monthly -- 3 ads per page average
  FROM subdomain_advertising_metrics
  WHERE metric_date >= CURRENT_DATE - p_days;
END;
$$;

-- Function to calculate digital real estate value
CREATE OR REPLACE FUNCTION calculate_digital_real_estate_value()
RETURNS TABLE (
  total_inventory integer,
  monthly_pageviews bigint,
  estimated_monthly_impressions bigint,
  estimated_cpm_revenue_low decimal,
  estimated_cpm_revenue_mid decimal,
  estimated_cpm_revenue_high decimal
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_subdomains integer;
  v_monthly_pageviews bigint;
  v_estimated_impressions bigint;
BEGIN
  -- Get latest subdomain count
  SELECT total_subdomains INTO v_total_subdomains
  FROM subdomain_advertising_metrics
  ORDER BY metric_date DESC
  LIMIT 1;

  -- Get monthly pageviews (last 30 days)
  SELECT COALESCE(SUM(total_subdomain_pageviews), 0)
  INTO v_monthly_pageviews
  FROM subdomain_advertising_metrics
  WHERE metric_date >= CURRENT_DATE - INTERVAL '30 days';

  -- Estimate ad impressions (3 ads per pageview)
  v_estimated_impressions := v_monthly_pageviews * 3;

  RETURN QUERY
  SELECT
    COALESCE(v_total_subdomains, 0),
    v_monthly_pageviews,
    v_estimated_impressions,
    (v_estimated_impressions / 1000.0) * 1.0 as estimated_cpm_revenue_low, -- $1 CPM
    (v_estimated_impressions / 1000.0) * 5.0 as estimated_cpm_revenue_mid, -- $5 CPM
    (v_estimated_impressions / 1000.0) * 15.0 as estimated_cpm_revenue_high; -- $15 CPM
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subdomain_metrics_date ON subdomain_advertising_metrics(metric_date DESC);
