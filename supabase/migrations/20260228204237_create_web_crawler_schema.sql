/*
  # Web Crawler System Schema

  1. New Tables
    - `crawler_queue`
      - `id` (uuid, primary key)
      - `url` (text, unique, required) - The URL to crawl
      - `priority` (integer, 1-10) - Higher priority URLs crawled first
      - `status` (text) - pending/processing/completed/failed
      - `source_type` (text) - internal/external
      - `attempts` (integer) - Number of crawl attempts
      - `scheduled_at` (timestamptz) - When to crawl this URL
      - `last_error` (text) - Last error message if failed
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `crawled_pages`
      - `id` (uuid, primary key)
      - `url` (text, unique, required) - The crawled URL
      - `title` (text) - Page title
      - `meta_description` (text) - Meta description
      - `content` (text) - Extracted page content
      - `domain` (text) - Domain name
      - `is_internal` (boolean) - True if sentport.com subdomain
      - `http_status` (integer) - HTTP status code
      - `response_time_ms` (integer) - Response time in milliseconds
      - `last_crawled_at` (timestamptz)
      - `created_at` (timestamptz)

    - `crawler_links`
      - `id` (uuid, primary key)
      - `source_url` (text, required) - URL where link was found
      - `destination_url` (text, required) - Discovered link URL
      - `discovered_at` (timestamptz)

    - `crawler_stats`
      - `id` (uuid, primary key)
      - `total_crawled` (integer) - Total URLs crawled
      - `successful` (integer) - Successful crawls
      - `failed` (integer) - Failed crawls
      - `in_queue` (integer) - URLs pending crawl
      - `last_crawl_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `crawler_settings`
      - `key` (text, primary key) - Setting name
      - `value` (text) - Setting value
      - `updated_at` (timestamptz)

    - `crawler_history`
      - `id` (uuid, primary key)
      - `crawl_type` (text) - manual/automatic
      - `batch_size` (integer) - Number of URLs processed
      - `successful_count` (integer) - Successfully crawled
      - `failed_count` (integer) - Failed crawls
      - `triggered_by` (uuid) - Admin user who triggered (null for cron)
      - `started_at` (timestamptz)
      - `completed_at` (timestamptz)

    - `search_index`
      - `id` (uuid, primary key)
      - `url` (text, unique, required)
      - `title` (text)
      - `description` (text)
      - `content_snippet` (text)
      - `relevance_score` (numeric) - Base relevance score
      - `is_internal` (boolean) - Internal subdomain flag
      - `last_indexed_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for admin-only access to crawler system
    - Add public read access to search_index for search queries

  3. Indexes
    - Add indexes on url, status, priority for fast queue processing
    - Add indexes on is_internal for search ranking
    - Add full-text search indexes on title, description, content
*/

-- Create crawler_queue table
CREATE TABLE IF NOT EXISTS crawler_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text UNIQUE NOT NULL,
  priority integer NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  source_type text NOT NULL DEFAULT 'external' CHECK (source_type IN ('internal', 'external')),
  attempts integer NOT NULL DEFAULT 0,
  scheduled_at timestamptz DEFAULT now(),
  last_error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create crawled_pages table
CREATE TABLE IF NOT EXISTS crawled_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text UNIQUE NOT NULL,
  title text,
  meta_description text,
  content text,
  domain text,
  is_internal boolean DEFAULT false,
  http_status integer,
  response_time_ms integer,
  last_crawled_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create crawler_links table
CREATE TABLE IF NOT EXISTS crawler_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url text NOT NULL,
  destination_url text NOT NULL,
  discovered_at timestamptz DEFAULT now()
);

-- Create crawler_stats table
CREATE TABLE IF NOT EXISTS crawler_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_crawled integer DEFAULT 0,
  successful integer DEFAULT 0,
  failed integer DEFAULT 0,
  in_queue integer DEFAULT 0,
  last_crawl_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- Create crawler_settings table
CREATE TABLE IF NOT EXISTS crawler_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Create crawler_history table
CREATE TABLE IF NOT EXISTS crawler_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crawl_type text NOT NULL CHECK (crawl_type IN ('manual', 'automatic')),
  batch_size integer NOT NULL,
  successful_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  triggered_by uuid REFERENCES user_profiles(id),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create search_index table
CREATE TABLE IF NOT EXISTS search_index (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text UNIQUE NOT NULL,
  title text,
  description text,
  content_snippet text,
  relevance_score numeric DEFAULT 0,
  is_internal boolean DEFAULT false,
  last_indexed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_crawler_queue_status ON crawler_queue(status);
CREATE INDEX IF NOT EXISTS idx_crawler_queue_priority ON crawler_queue(priority DESC);
CREATE INDEX IF NOT EXISTS idx_crawler_queue_scheduled ON crawler_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_crawled_pages_domain ON crawled_pages(domain);
CREATE INDEX IF NOT EXISTS idx_crawled_pages_is_internal ON crawled_pages(is_internal);
CREATE INDEX IF NOT EXISTS idx_search_index_is_internal ON search_index(is_internal);

-- Enable Row Level Security
ALTER TABLE crawler_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawled_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawler_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawler_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawler_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawler_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_index ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin-only access to crawler management
CREATE POLICY "Admin users can manage crawler queue"
  ON crawler_queue FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admin users can view crawled pages"
  ON crawled_pages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admin users can manage crawler links"
  ON crawler_links FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admin users can view crawler stats"
  ON crawler_stats FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admin users can manage crawler settings"
  ON crawler_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admin users can view crawler history"
  ON crawler_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Public read access to search_index for search functionality
CREATE POLICY "Anyone can search the index"
  ON search_index FOR SELECT
  TO public
  USING (true);

-- Insert initial stats record
INSERT INTO crawler_stats (total_crawled, successful, failed, in_queue)
VALUES (0, 0, 0, 0)
ON CONFLICT DO NOTHING;

-- Insert default settings
INSERT INTO crawler_settings (key, value) VALUES
  ('auto_crawl_enabled', 'false'),
  ('crawl_interval_minutes', '5'),
  ('max_urls_per_batch', '100'),
  ('user_agent', 'SentPort-Crawler/1.0 (Human-Verified Content)')
ON CONFLICT (key) DO NOTHING;