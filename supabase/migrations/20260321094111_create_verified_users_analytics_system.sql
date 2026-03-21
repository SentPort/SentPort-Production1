/*
  # Create Verified Users Analytics System

  1. New Functions
    - `get_verified_users_summary()`: Returns total verified users, total users, and verification rate
    - `get_daily_verified_users(p_start_date, p_end_date)`: Returns daily verification counts for trend analysis
    - `get_verification_growth_stats(p_days)`: Returns verification growth statistics for a given period

  2. Security
    - All RPC functions use SECURITY DEFINER to bypass RLS
    - Functions are designed for admin-only use (caller must verify admin status separately)

  3. Implementation Notes
    - Leverages existing `user_profiles` table with `is_verified` and `last_verification_at` columns
    - Aggregates data by day for trend visualization
    - Handles NULL verification dates appropriately
    - Returns zero counts for days with no verifications
*/

-- Function to get overall verified users summary
CREATE OR REPLACE FUNCTION get_verified_users_summary()
RETURNS TABLE (
  total_users bigint,
  total_verified_users bigint,
  verification_rate numeric
) 
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint AS total_users,
    COUNT(*) FILTER (WHERE is_verified = true)::bigint AS total_verified_users,
    ROUND(
      (COUNT(*) FILTER (WHERE is_verified = true)::numeric / NULLIF(COUNT(*)::numeric, 0)) * 100, 
      2
    ) AS verification_rate
  FROM user_profiles;
END;
$$;

-- Function to get daily verified user counts for trend chart
CREATE OR REPLACE FUNCTION get_daily_verified_users(
  p_start_date date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  verification_date date,
  new_verified_count bigint
) 
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      p_start_date::timestamp,
      p_end_date::timestamp,
      '1 day'::interval
    )::date AS date
  ),
  daily_verifications AS (
    SELECT 
      DATE(last_verification_at) AS verified_date,
      COUNT(*) AS count
    FROM user_profiles
    WHERE is_verified = true 
      AND last_verification_at IS NOT NULL
      AND DATE(last_verification_at) >= p_start_date
      AND DATE(last_verification_at) <= p_end_date
    GROUP BY DATE(last_verification_at)
  )
  SELECT 
    ds.date AS verification_date,
    COALESCE(dv.count, 0)::bigint AS new_verified_count
  FROM date_series ds
  LEFT JOIN daily_verifications dv ON ds.date = dv.verified_date
  ORDER BY ds.date;
END;
$$;

-- Function to get verification growth statistics
CREATE OR REPLACE FUNCTION get_verification_growth_stats(p_days integer DEFAULT 30)
RETURNS TABLE (
  period_new_verifications bigint,
  previous_period_verifications bigint,
  growth_rate numeric,
  avg_daily_verifications numeric
) 
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_start_date date;
  v_previous_start_date date;
BEGIN
  v_start_date := CURRENT_DATE - p_days;
  v_previous_start_date := v_start_date - p_days;
  
  RETURN QUERY
  WITH current_period AS (
    SELECT COUNT(*)::bigint AS count
    FROM user_profiles
    WHERE is_verified = true 
      AND last_verification_at IS NOT NULL
      AND DATE(last_verification_at) >= v_start_date
      AND DATE(last_verification_at) < CURRENT_DATE
  ),
  previous_period AS (
    SELECT COUNT(*)::bigint AS count
    FROM user_profiles
    WHERE is_verified = true 
      AND last_verification_at IS NOT NULL
      AND DATE(last_verification_at) >= v_previous_start_date
      AND DATE(last_verification_at) < v_start_date
  )
  SELECT 
    cp.count AS period_new_verifications,
    pp.count AS previous_period_verifications,
    CASE 
      WHEN pp.count > 0 THEN 
        ROUND(((cp.count - pp.count)::numeric / pp.count::numeric) * 100, 2)
      WHEN cp.count > 0 THEN 100.0
      ELSE 0.0
    END AS growth_rate,
    ROUND(cp.count::numeric / NULLIF(p_days, 0), 2) AS avg_daily_verifications
  FROM current_period cp, previous_period pp;
END;
$$;