/*
  # Create DAU/MAU User Activity Tracking System

  1. New Tables
    - `user_daily_activity`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `activity_date` (date)
      - `platform` (text) - which platform: 'main', 'hubook', 'blog', 'heddit', 'hinsta', 'switter', 'hutube', 'subdomain'
      - `activity_count` (integer) - number of activities that day
      - `created_at` (timestamptz)
      - Unique constraint on (user_id, activity_date, platform)

    - `daily_active_users_summary`
      - `id` (uuid, primary key)
      - `summary_date` (date, unique)
      - `total_dau` (integer) - distinct users across all platforms
      - `hubook_dau` (integer)
      - `blog_dau` (integer)
      - `heddit_dau` (integer)
      - `hinsta_dau` (integer)
      - `switter_dau` (integer)
      - `hutube_dau` (integer)
      - `subdomain_dau` (integer)
      - `total_mau` (integer) - 30-day rolling MAU
      - `dau_mau_ratio` (decimal) - stickiness metric
      - `created_at` (timestamptz)

  2. Functions
    - `track_user_activity()` - Records user activity
    - `calculate_dau()` - Calculates daily active users
    - `calculate_mau()` - Calculates monthly active users
    - `aggregate_daily_metrics()` - Daily rollup job

  3. Security
    - Enable RLS on both tables
    - Only authenticated users can track their own activity
    - Only admins can view aggregated metrics
*/

-- Create user_daily_activity table
CREATE TABLE IF NOT EXISTS user_daily_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date date NOT NULL DEFAULT CURRENT_DATE,
  platform text NOT NULL,
  activity_count integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, activity_date, platform)
);

ALTER TABLE user_daily_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can track own activity"
  ON user_daily_activity FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity"
  ON user_daily_activity FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Create daily_active_users_summary table
CREATE TABLE IF NOT EXISTS daily_active_users_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_date date UNIQUE NOT NULL,
  total_dau integer DEFAULT 0,
  hubook_dau integer DEFAULT 0,
  blog_dau integer DEFAULT 0,
  heddit_dau integer DEFAULT 0,
  hinsta_dau integer DEFAULT 0,
  switter_dau integer DEFAULT 0,
  hutube_dau integer DEFAULT 0,
  subdomain_dau integer DEFAULT 0,
  total_mau integer DEFAULT 0,
  dau_mau_ratio decimal(5,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE daily_active_users_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view DAU/MAU summary"
  ON daily_active_users_summary FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert DAU/MAU summary"
  ON daily_active_users_summary FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Function to track user activity
CREATE OR REPLACE FUNCTION track_user_activity(
  p_user_id uuid,
  p_platform text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_daily_activity (user_id, activity_date, platform, activity_count)
  VALUES (p_user_id, CURRENT_DATE, p_platform, 1)
  ON CONFLICT (user_id, activity_date, platform)
  DO UPDATE SET activity_count = user_daily_activity.activity_count + 1;
END;
$$;

-- Function to calculate DAU for a specific date
CREATE OR REPLACE FUNCTION calculate_dau(p_date date DEFAULT CURRENT_DATE)
RETURNS TABLE (
  total_dau bigint,
  hubook_dau bigint,
  blog_dau bigint,
  heddit_dau bigint,
  hinsta_dau bigint,
  switter_dau bigint,
  hutube_dau bigint,
  subdomain_dau bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT user_id) as total_dau,
    COUNT(DISTINCT CASE WHEN platform = 'hubook' THEN user_id END) as hubook_dau,
    COUNT(DISTINCT CASE WHEN platform = 'blog' THEN user_id END) as blog_dau,
    COUNT(DISTINCT CASE WHEN platform = 'heddit' THEN user_id END) as heddit_dau,
    COUNT(DISTINCT CASE WHEN platform = 'hinsta' THEN user_id END) as hinsta_dau,
    COUNT(DISTINCT CASE WHEN platform = 'switter' THEN user_id END) as switter_dau,
    COUNT(DISTINCT CASE WHEN platform = 'hutube' THEN user_id END) as hutube_dau,
    COUNT(DISTINCT CASE WHEN platform = 'subdomain' THEN user_id END) as subdomain_dau
  FROM user_daily_activity
  WHERE activity_date = p_date;
END;
$$;

-- Function to calculate MAU (30-day rolling window)
CREATE OR REPLACE FUNCTION calculate_mau(p_end_date date DEFAULT CURRENT_DATE)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mau bigint;
BEGIN
  SELECT COUNT(DISTINCT user_id)
  INTO v_mau
  FROM user_daily_activity
  WHERE activity_date >= (p_end_date - INTERVAL '29 days')
    AND activity_date <= p_end_date;
  
  RETURN v_mau;
END;
$$;

-- Function to aggregate daily metrics
CREATE OR REPLACE FUNCTION aggregate_daily_metrics(p_date date DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_dau_record RECORD;
  v_mau bigint;
  v_ratio decimal(5,2);
BEGIN
  -- Get DAU metrics
  SELECT * INTO v_dau_record FROM calculate_dau(p_date);
  
  -- Get MAU
  v_mau := calculate_mau(p_date);
  
  -- Calculate DAU/MAU ratio (stickiness)
  IF v_mau > 0 THEN
    v_ratio := (v_dau_record.total_dau::decimal / v_mau::decimal) * 100;
  ELSE
    v_ratio := 0;
  END IF;
  
  -- Insert or update summary
  INSERT INTO daily_active_users_summary (
    summary_date,
    total_dau,
    hubook_dau,
    blog_dau,
    heddit_dau,
    hinsta_dau,
    switter_dau,
    hutube_dau,
    subdomain_dau,
    total_mau,
    dau_mau_ratio
  )
  VALUES (
    p_date,
    v_dau_record.total_dau,
    v_dau_record.hubook_dau,
    v_dau_record.blog_dau,
    v_dau_record.heddit_dau,
    v_dau_record.hinsta_dau,
    v_dau_record.switter_dau,
    v_dau_record.hutube_dau,
    v_dau_record.subdomain_dau,
    v_mau,
    v_ratio
  )
  ON CONFLICT (summary_date)
  DO UPDATE SET
    total_dau = EXCLUDED.total_dau,
    hubook_dau = EXCLUDED.hubook_dau,
    blog_dau = EXCLUDED.blog_dau,
    heddit_dau = EXCLUDED.heddit_dau,
    hinsta_dau = EXCLUDED.hinsta_dau,
    switter_dau = EXCLUDED.switter_dau,
    hutube_dau = EXCLUDED.hutube_dau,
    subdomain_dau = EXCLUDED.subdomain_dau,
    total_mau = EXCLUDED.total_mau,
    dau_mau_ratio = EXCLUDED.dau_mau_ratio;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_activity_date ON user_daily_activity(activity_date);
CREATE INDEX IF NOT EXISTS idx_user_activity_user ON user_daily_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_platform ON user_daily_activity(platform);
CREATE INDEX IF NOT EXISTS idx_dau_summary_date ON daily_active_users_summary(summary_date DESC);
