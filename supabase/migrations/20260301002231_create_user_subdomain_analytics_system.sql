/*
  # User Subdomain Analytics System

  ## Overview
  This migration creates a comprehensive analytics tracking system for user-owned subdomains
  and their individual pages. Users can track traffic, engagement, and performance metrics
  for their published subdomain websites.

  ## 1. New Tables

  ### `subdomain_pages`
  Tracks individual pages within each subdomain website
  - `id` (uuid, primary key)
  - `subdomain_id` (uuid, references subdomains)
  - `page_path` (text) - URL path for the page (e.g., "/about", "/contact")
  - `page_title` (text) - Title of the page
  - `page_type` (text) - Type: homepage, content_page, blog_post
  - `is_published` (boolean) - Whether page is live
  - `published_at` (timestamptz) - When page went live
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `subdomain_analytics_daily`
  Daily aggregated analytics for subdomains and their pages
  - `id` (uuid, primary key)
  - `subdomain_id` (uuid, references subdomains)
  - `page_id` (uuid, nullable, references subdomain_pages) - null = main domain stats
  - `date` (date) - Date of analytics
  - `unique_visitors` (integer) - Count of unique sessions
  - `page_views` (integer) - Total page views
  - `total_session_duration_seconds` (bigint) - Sum of all session durations
  - `bounce_count` (integer) - Sessions with single page view
  - `referrer_breakdown` (jsonb) - {"direct": 100, "google": 50, "social": 25}
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `subdomain_page_visits`
  Real-time tracking of individual page visits
  - `id` (uuid, primary key)
  - `subdomain_id` (uuid, references subdomains)
  - `page_id` (uuid, nullable, references subdomain_pages)
  - `session_id` (text) - Unique session identifier
  - `page_path` (text) - Full page path visited
  - `referrer` (text, nullable) - Where visitor came from
  - `user_agent` (text, nullable) - Browser/device info
  - `session_duration_seconds` (integer, nullable) - Time spent on page
  - `is_bounce` (boolean) - Single page visit in session
  - `created_at` (timestamptz)

  ### `subdomain_publish_events`
  Tracks when subdomains and pages go live
  - `id` (uuid, primary key)
  - `subdomain_id` (uuid, references subdomains)
  - `page_id` (uuid, nullable, references subdomain_pages)
  - `event_type` (text) - site_published, page_published, page_updated, page_unpublished
  - `metadata` (jsonb) - Additional event data
  - `published_at` (timestamptz)

  ## 2. Enhanced Tables
  
  Updates to `analytics_subdomain_visits` to link with page tracking

  ## 3. Security
  - Enable RLS on all new tables
  - Users can only view analytics for subdomains they own
  - Admins can view all analytics

  ## 4. Indexes
  - Performance indexes for common query patterns
  - Composite indexes for subdomain + date range queries

  ## 5. Functions
  - Function to calculate daily analytics aggregations
  - Function to automatically track page publish events
*/

-- Create subdomain_pages table
CREATE TABLE IF NOT EXISTS subdomain_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subdomain_id uuid NOT NULL REFERENCES subdomains(id) ON DELETE CASCADE,
  page_path text NOT NULL,
  page_title text NOT NULL,
  page_type text NOT NULL DEFAULT 'content_page',
  is_published boolean DEFAULT false,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT page_type_check CHECK (page_type IN ('homepage', 'content_page', 'blog_post', 'custom')),
  CONSTRAINT unique_subdomain_page_path UNIQUE (subdomain_id, page_path)
);

-- Create subdomain_analytics_daily table
CREATE TABLE IF NOT EXISTS subdomain_analytics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subdomain_id uuid NOT NULL REFERENCES subdomains(id) ON DELETE CASCADE,
  page_id uuid REFERENCES subdomain_pages(id) ON DELETE CASCADE,
  date date NOT NULL,
  unique_visitors integer DEFAULT 0,
  page_views integer DEFAULT 0,
  total_session_duration_seconds bigint DEFAULT 0,
  bounce_count integer DEFAULT 0,
  referrer_breakdown jsonb DEFAULT '{}'::jsonb,
  device_breakdown jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_subdomain_page_date UNIQUE (subdomain_id, page_id, date)
);

-- Create subdomain_page_visits table
CREATE TABLE IF NOT EXISTS subdomain_page_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subdomain_id uuid NOT NULL REFERENCES subdomains(id) ON DELETE CASCADE,
  page_id uuid REFERENCES subdomain_pages(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  page_path text NOT NULL,
  referrer text,
  user_agent text,
  session_duration_seconds integer,
  is_bounce boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create subdomain_publish_events table
CREATE TABLE IF NOT EXISTS subdomain_publish_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subdomain_id uuid NOT NULL REFERENCES subdomains(id) ON DELETE CASCADE,
  page_id uuid REFERENCES subdomain_pages(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  published_at timestamptz DEFAULT now(),
  CONSTRAINT event_type_check CHECK (event_type IN ('site_published', 'page_published', 'page_updated', 'page_unpublished'))
);

-- Add page_id reference to analytics_subdomain_visits if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analytics_subdomain_visits' AND column_name = 'page_id'
  ) THEN
    ALTER TABLE analytics_subdomain_visits ADD COLUMN page_id uuid REFERENCES subdomain_pages(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subdomain_pages_subdomain ON subdomain_pages(subdomain_id);
CREATE INDEX IF NOT EXISTS idx_subdomain_pages_published ON subdomain_pages(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_subdomain_analytics_subdomain_date ON subdomain_analytics_daily(subdomain_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_subdomain_analytics_page ON subdomain_analytics_daily(page_id) WHERE page_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subdomain_visits_subdomain ON subdomain_page_visits(subdomain_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subdomain_visits_session ON subdomain_page_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_subdomain_publish_events_subdomain ON subdomain_publish_events(subdomain_id, published_at DESC);

-- Enable RLS on all tables
ALTER TABLE subdomain_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE subdomain_analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE subdomain_page_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE subdomain_publish_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subdomain_pages
CREATE POLICY "Users can view their own subdomain pages"
  ON subdomain_pages FOR SELECT
  TO authenticated
  USING (
    subdomain_id IN (
      SELECT id FROM subdomains WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own subdomain pages"
  ON subdomain_pages FOR INSERT
  TO authenticated
  WITH CHECK (
    subdomain_id IN (
      SELECT id FROM subdomains WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own subdomain pages"
  ON subdomain_pages FOR UPDATE
  TO authenticated
  USING (
    subdomain_id IN (
      SELECT id FROM subdomains WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    subdomain_id IN (
      SELECT id FROM subdomains WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own subdomain pages"
  ON subdomain_pages FOR DELETE
  TO authenticated
  USING (
    subdomain_id IN (
      SELECT id FROM subdomains WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all subdomain pages"
  ON subdomain_pages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- RLS Policies for subdomain_analytics_daily
CREATE POLICY "Users can view their own subdomain analytics"
  ON subdomain_analytics_daily FOR SELECT
  TO authenticated
  USING (
    subdomain_id IN (
      SELECT id FROM subdomains WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all subdomain analytics"
  ON subdomain_analytics_daily FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- RLS Policies for subdomain_page_visits
CREATE POLICY "Users can view their own subdomain visits"
  ON subdomain_page_visits FOR SELECT
  TO authenticated
  USING (
    subdomain_id IN (
      SELECT id FROM subdomains WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "System can insert visit records"
  ON subdomain_page_visits FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all subdomain visits"
  ON subdomain_page_visits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- RLS Policies for subdomain_publish_events
CREATE POLICY "Users can view their own publish events"
  ON subdomain_publish_events FOR SELECT
  TO authenticated
  USING (
    subdomain_id IN (
      SELECT id FROM subdomains WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create publish events for their subdomains"
  ON subdomain_publish_events FOR INSERT
  TO authenticated
  WITH CHECK (
    subdomain_id IN (
      SELECT id FROM subdomains WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all publish events"
  ON subdomain_publish_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Function to aggregate daily analytics
CREATE OR REPLACE FUNCTION aggregate_subdomain_analytics(target_date date DEFAULT CURRENT_DATE)
RETURNS void AS $$
BEGIN
  INSERT INTO subdomain_analytics_daily (
    subdomain_id,
    page_id,
    date,
    unique_visitors,
    page_views,
    total_session_duration_seconds,
    bounce_count,
    referrer_breakdown,
    updated_at
  )
  SELECT
    subdomain_id,
    page_id,
    target_date,
    COUNT(DISTINCT session_id) as unique_visitors,
    COUNT(*) as page_views,
    COALESCE(SUM(session_duration_seconds), 0) as total_session_duration_seconds,
    COUNT(*) FILTER (WHERE is_bounce = true) as bounce_count,
    jsonb_object_agg(
      COALESCE(NULLIF(referrer, ''), 'direct'),
      referrer_count
    ) as referrer_breakdown,
    now()
  FROM (
    SELECT
      subdomain_id,
      page_id,
      session_id,
      session_duration_seconds,
      is_bounce,
      CASE
        WHEN referrer IS NULL OR referrer = '' THEN 'direct'
        WHEN referrer LIKE '%google%' THEN 'google'
        WHEN referrer LIKE '%facebook%' OR referrer LIKE '%twitter%' OR referrer LIKE '%linkedin%' THEN 'social'
        ELSE 'other'
      END as referrer,
      COUNT(*) OVER (PARTITION BY subdomain_id, page_id, 
        CASE
          WHEN referrer IS NULL OR referrer = '' THEN 'direct'
          WHEN referrer LIKE '%google%' THEN 'google'
          WHEN referrer LIKE '%facebook%' OR referrer LIKE '%twitter%' OR referrer LIKE '%linkedin%' THEN 'social'
          ELSE 'other'
        END
      ) as referrer_count
    FROM subdomain_page_visits
    WHERE DATE(created_at) = target_date
  ) grouped_visits
  GROUP BY subdomain_id, page_id
  ON CONFLICT (subdomain_id, page_id, date)
  DO UPDATE SET
    unique_visitors = EXCLUDED.unique_visitors,
    page_views = EXCLUDED.page_views,
    total_session_duration_seconds = EXCLUDED.total_session_duration_seconds,
    bounce_count = EXCLUDED.bounce_count,
    referrer_breakdown = EXCLUDED.referrer_breakdown,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create analytics record when page is published
CREATE OR REPLACE FUNCTION handle_page_publish()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_published = true AND (OLD.is_published IS NULL OR OLD.is_published = false) THEN
    NEW.published_at = now();
    
    INSERT INTO subdomain_publish_events (subdomain_id, page_id, event_type, metadata)
    VALUES (
      NEW.subdomain_id,
      NEW.id,
      'page_published',
      jsonb_build_object('page_title', NEW.page_title, 'page_path', NEW.page_path)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for page publish
DROP TRIGGER IF EXISTS trigger_page_publish ON subdomain_pages;
CREATE TRIGGER trigger_page_publish
  BEFORE UPDATE ON subdomain_pages
  FOR EACH ROW
  EXECUTE FUNCTION handle_page_publish();
