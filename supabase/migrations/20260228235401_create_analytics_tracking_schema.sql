/*
  # Analytics Tracking System

  1. New Tables
    - `analytics_page_views`
      - Tracks every page view across the entire site
      - `id` (uuid, primary key)
      - `user_id` (uuid, nullable - for authenticated users)
      - `session_id` (text - browser session identifier)
      - `page_path` (text - URL path visited)
      - `platform` (text - which platform: hubook, switter, hinsta, hutube, blog, heddit, homepage, search, subdomain)
      - `subdomain` (text, nullable - if visiting a user's subdomain)
      - `referrer` (text, nullable)
      - `user_agent` (text, nullable)
      - `created_at` (timestamptz)
      
    - `analytics_searches`
      - Tracks all search queries
      - `id` (uuid, primary key)
      - `user_id` (uuid, nullable)
      - `session_id` (text)
      - `query` (text - search term)
      - `results_count` (integer - how many results returned)
      - `created_at` (timestamptz)
      
    - `analytics_platform_actions`
      - Tracks user actions across platforms (posts, likes, comments, shares, etc.)
      - `id` (uuid, primary key)
      - `user_id` (uuid, nullable)
      - `session_id` (text)
      - `platform` (text)
      - `action_type` (text - post_created, comment_created, like, share, follow, etc.)
      - `content_id` (uuid, nullable - reference to the content)
      - `created_at` (timestamptz)
      
    - `analytics_subdomain_visits`
      - Tracks visits to user subdomains
      - `id` (uuid, primary key)
      - `subdomain` (text - the subdomain visited)
      - `visitor_session_id` (text)
      - `page_path` (text - path within subdomain)
      - `referrer` (text, nullable)
      - `created_at` (timestamptz)
      
    - `analytics_daily_summary`
      - Daily aggregated statistics for performance
      - `id` (uuid, primary key)
      - `date` (date, unique)
      - `total_page_views` (bigint, default 0)
      - `unique_visitors` (bigint, default 0)
      - `total_searches` (bigint, default 0)
      - `total_actions` (bigint, default 0)
      - `platform_breakdown` (jsonb - breakdown by platform)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Indexes
    - Performance indexes for common queries
    - Time-based indexes for date range queries

  3. Security
    - Enable RLS on all tables
    - Only admins can read analytics data
    - Analytics tracking inserts are allowed for all users

  4. Functions
    - Helper functions for aggregating analytics data
*/

-- Analytics Page Views Table
CREATE TABLE IF NOT EXISTS analytics_page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  page_path text NOT NULL,
  platform text NOT NULL,
  subdomain text,
  referrer text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Analytics Searches Table
CREATE TABLE IF NOT EXISTS analytics_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  query text NOT NULL,
  results_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Analytics Platform Actions Table
CREATE TABLE IF NOT EXISTS analytics_platform_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  platform text NOT NULL,
  action_type text NOT NULL,
  content_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Analytics Subdomain Visits Table
CREATE TABLE IF NOT EXISTS analytics_subdomain_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subdomain text NOT NULL,
  visitor_session_id text NOT NULL,
  page_path text NOT NULL,
  referrer text,
  created_at timestamptz DEFAULT now()
);

-- Analytics Daily Summary Table
CREATE TABLE IF NOT EXISTS analytics_daily_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  total_page_views bigint DEFAULT 0,
  unique_visitors bigint DEFAULT 0,
  total_searches bigint DEFAULT 0,
  total_actions bigint DEFAULT 0,
  platform_breakdown jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON analytics_page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_platform ON analytics_page_views(platform);
CREATE INDEX IF NOT EXISTS idx_page_views_session ON analytics_page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_user ON analytics_page_views(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_searches_created_at ON analytics_searches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_searches_query ON analytics_searches(query);

CREATE INDEX IF NOT EXISTS idx_actions_created_at ON analytics_platform_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_actions_platform ON analytics_platform_actions(platform);
CREATE INDEX IF NOT EXISTS idx_actions_type ON analytics_platform_actions(action_type);

CREATE INDEX IF NOT EXISTS idx_subdomain_visits_created_at ON analytics_subdomain_visits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subdomain_visits_subdomain ON analytics_subdomain_visits(subdomain);

CREATE INDEX IF NOT EXISTS idx_daily_summary_date ON analytics_daily_summary(date DESC);

-- Enable RLS
ALTER TABLE analytics_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_platform_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_subdomain_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only admins can read, anyone can insert for tracking
CREATE POLICY "Admins can view all page views"
  ON analytics_page_views FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Anyone can insert page views"
  ON analytics_page_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all searches"
  ON analytics_searches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Anyone can insert searches"
  ON analytics_searches FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all platform actions"
  ON analytics_platform_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Anyone can insert platform actions"
  ON analytics_platform_actions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all subdomain visits"
  ON analytics_subdomain_visits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Anyone can insert subdomain visits"
  ON analytics_subdomain_visits FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view daily summary"
  ON analytics_daily_summary FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Helper function to get or create session ID (will be used client-side)
-- Function to aggregate daily stats (run via cron or manually)
CREATE OR REPLACE FUNCTION aggregate_daily_analytics(target_date date DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  page_views_count bigint;
  unique_visitors_count bigint;
  searches_count bigint;
  actions_count bigint;
  platform_stats jsonb;
BEGIN
  -- Count page views
  SELECT COUNT(*) INTO page_views_count
  FROM analytics_page_views
  WHERE DATE(created_at) = target_date;

  -- Count unique visitors
  SELECT COUNT(DISTINCT session_id) INTO unique_visitors_count
  FROM analytics_page_views
  WHERE DATE(created_at) = target_date;

  -- Count searches
  SELECT COUNT(*) INTO searches_count
  FROM analytics_searches
  WHERE DATE(created_at) = target_date;

  -- Count actions
  SELECT COUNT(*) INTO actions_count
  FROM analytics_platform_actions
  WHERE DATE(created_at) = target_date;

  -- Platform breakdown
  SELECT jsonb_object_agg(platform, cnt) INTO platform_stats
  FROM (
    SELECT platform, COUNT(*) as cnt
    FROM analytics_page_views
    WHERE DATE(created_at) = target_date
    GROUP BY platform
  ) sub;

  -- Upsert daily summary
  INSERT INTO analytics_daily_summary (
    date, total_page_views, unique_visitors, total_searches, total_actions, platform_breakdown, updated_at
  )
  VALUES (
    target_date, page_views_count, unique_visitors_count, searches_count, actions_count, COALESCE(platform_stats, '{}'::jsonb), now()
  )
  ON CONFLICT (date)
  DO UPDATE SET
    total_page_views = EXCLUDED.total_page_views,
    unique_visitors = EXCLUDED.unique_visitors,
    total_searches = EXCLUDED.total_searches,
    total_actions = EXCLUDED.total_actions,
    platform_breakdown = EXCLUDED.platform_breakdown,
    updated_at = now();
END;
$$;
