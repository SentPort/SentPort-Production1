/*
  # Create Custom Tags System for Heddit

  ## Overview
  This migration creates a comprehensive custom tagging system allowing users to add specific tags
  to both SubHeddits and posts. Tags are independent, user-editable, and support discovery through
  search and autocomplete.

  ## 1. New Tables

  ### `heddit_custom_tags`
  - `id` (uuid, primary key) - Unique tag identifier
  - `tag_name` (text, unique) - Normalized tag name (lowercase, hyphenated)
  - `display_name` (text) - Original display format of the tag
  - `usage_count` (integer) - Total times this tag has been used (SubHeddits + Posts)
  - `subreddit_usage_count` (integer) - Times used on SubHeddits
  - `post_usage_count` (integer) - Times used on posts
  - `created_at` (timestamptz) - When tag was first created
  - `last_used_at` (timestamptz) - Most recent usage for trending calculations

  ### `heddit_subreddit_custom_tags`
  - `id` (uuid, primary key) - Junction table identifier
  - `subreddit_id` (uuid, foreign key) - References heddit_subreddits
  - `tag_id` (uuid, foreign key) - References heddit_custom_tags
  - `created_at` (timestamptz) - When tag was added to SubHeddit
  - Unique constraint on (subreddit_id, tag_id)

  ### `heddit_post_tags`
  - `id` (uuid, primary key) - Junction table identifier
  - `post_id` (uuid, foreign key) - References heddit_posts
  - `tag_id` (uuid, foreign key) - References heddit_custom_tags
  - `created_at` (timestamptz) - When tag was added to post
  - Unique constraint on (post_id, tag_id)

  ### `heddit_trending_tags`
  - `id` (uuid, primary key) - Trending tag record identifier
  - `tag_id` (uuid, foreign key) - References heddit_custom_tags
  - `trend_score` (numeric) - Calculated trending score based on recent usage
  - `recent_usage_count` (integer) - Usage in last 7 days
  - `velocity` (numeric) - Rate of growth
  - `calculated_at` (timestamptz) - When trend was last calculated
  - `rank` (integer) - Position in trending list

  ## 2. Indexes
  - Index on tag_name for fast text search and autocomplete
  - Index on usage_count for popular tag queries
  - Index on last_used_at for trending calculations
  - Composite indexes on junction tables for fast lookups

  ## 3. Security
  - Enable RLS on all tables
  - Authenticated users can read all tags
  - Only post/SubHeddit owners can add/remove tags from their content
  - Tag usage counts update automatically via triggers

  ## 4. Functions
  - Function to normalize tag names (lowercase, trim, replace spaces with hyphens)
  - Function to get or create tags by name
  - Trigger to update usage counts when tags are added/removed
  - Function to calculate trending tags daily
  - Function to search tags with autocomplete
*/

-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create custom tags table
CREATE TABLE IF NOT EXISTS heddit_custom_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  usage_count integer DEFAULT 0,
  subreddit_usage_count integer DEFAULT 0,
  post_usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz DEFAULT now()
);

-- Create SubHeddit tags junction table
CREATE TABLE IF NOT EXISTS heddit_subreddit_custom_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subreddit_id uuid NOT NULL REFERENCES heddit_subreddits(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES heddit_custom_tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(subreddit_id, tag_id)
);

-- Create post tags junction table
CREATE TABLE IF NOT EXISTS heddit_post_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES heddit_posts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES heddit_custom_tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, tag_id)
);

-- Create trending tags table
CREATE TABLE IF NOT EXISTS heddit_trending_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id uuid NOT NULL REFERENCES heddit_custom_tags(id) ON DELETE CASCADE,
  trend_score numeric DEFAULT 0,
  recent_usage_count integer DEFAULT 0,
  velocity numeric DEFAULT 0,
  calculated_at timestamptz DEFAULT now(),
  rank integer,
  UNIQUE(tag_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_heddit_custom_tags_name ON heddit_custom_tags USING gin(tag_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_heddit_custom_tags_usage ON heddit_custom_tags(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_heddit_custom_tags_last_used ON heddit_custom_tags(last_used_at DESC);
CREATE INDEX IF NOT EXISTS idx_heddit_subreddit_tags_subreddit ON heddit_subreddit_custom_tags(subreddit_id);
CREATE INDEX IF NOT EXISTS idx_heddit_subreddit_tags_tag ON heddit_subreddit_custom_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_heddit_post_tags_post ON heddit_post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_heddit_post_tags_tag ON heddit_post_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_heddit_trending_tags_rank ON heddit_trending_tags(rank);

-- Enable RLS
ALTER TABLE heddit_custom_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE heddit_subreddit_custom_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE heddit_post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE heddit_trending_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for heddit_custom_tags
CREATE POLICY "Anyone can view custom tags"
  ON heddit_custom_tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create tags"
  ON heddit_custom_tags FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for heddit_subreddit_custom_tags
CREATE POLICY "Anyone can view SubHeddit tags"
  ON heddit_subreddit_custom_tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "SubHeddit creator can add tags"
  ON heddit_subreddit_custom_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM heddit_subreddits
      WHERE id = subreddit_id
      AND creator_id = auth.uid()
    )
  );

CREATE POLICY "SubHeddit creator can remove tags"
  ON heddit_subreddit_custom_tags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM heddit_subreddits
      WHERE id = subreddit_id
      AND creator_id = auth.uid()
    )
  );

-- RLS Policies for heddit_post_tags
CREATE POLICY "Anyone can view post tags"
  ON heddit_post_tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Post author can add tags"
  ON heddit_post_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM heddit_posts
      WHERE id = post_id
      AND author_id = auth.uid()
    )
  );

CREATE POLICY "Post author can remove tags"
  ON heddit_post_tags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM heddit_posts
      WHERE id = post_id
      AND author_id = auth.uid()
    )
  );

-- RLS Policies for heddit_trending_tags
CREATE POLICY "Anyone can view trending tags"
  ON heddit_trending_tags FOR SELECT
  TO authenticated
  USING (true);

-- Function to normalize tag names
CREATE OR REPLACE FUNCTION normalize_tag_name(input_tag text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN lower(trim(regexp_replace(input_tag, '\s+', '-', 'g')));
END;
$$;

-- Function to get or create a tag
CREATE OR REPLACE FUNCTION get_or_create_tag(input_tag text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  normalized_name text;
  tag_id uuid;
BEGIN
  normalized_name := normalize_tag_name(input_tag);
  
  -- Try to find existing tag
  SELECT id INTO tag_id
  FROM heddit_custom_tags
  WHERE tag_name = normalized_name;
  
  -- Create if doesn't exist
  IF tag_id IS NULL THEN
    INSERT INTO heddit_custom_tags (tag_name, display_name)
    VALUES (normalized_name, input_tag)
    RETURNING id INTO tag_id;
  END IF;
  
  RETURN tag_id;
END;
$$;

-- Trigger function to update tag usage counts when SubHeddit tag added
CREATE OR REPLACE FUNCTION update_tag_counts_on_subreddit_tag()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE heddit_custom_tags
    SET 
      usage_count = usage_count + 1,
      subreddit_usage_count = subreddit_usage_count + 1,
      last_used_at = now()
    WHERE id = NEW.tag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE heddit_custom_tags
    SET 
      usage_count = GREATEST(usage_count - 1, 0),
      subreddit_usage_count = GREATEST(subreddit_usage_count - 1, 0)
    WHERE id = OLD.tag_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger function to update tag usage counts when post tag added
CREATE OR REPLACE FUNCTION update_tag_counts_on_post_tag()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE heddit_custom_tags
    SET 
      usage_count = usage_count + 1,
      post_usage_count = post_usage_count + 1,
      last_used_at = now()
    WHERE id = NEW.tag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE heddit_custom_tags
    SET 
      usage_count = GREATEST(usage_count - 1, 0),
      post_usage_count = GREATEST(post_usage_count - 1, 0)
    WHERE id = OLD.tag_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_tag_counts_subreddit ON heddit_subreddit_custom_tags;
CREATE TRIGGER trigger_update_tag_counts_subreddit
  AFTER INSERT OR DELETE ON heddit_subreddit_custom_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_tag_counts_on_subreddit_tag();

DROP TRIGGER IF EXISTS trigger_update_tag_counts_post ON heddit_post_tags;
CREATE TRIGGER trigger_update_tag_counts_post
  AFTER INSERT OR DELETE ON heddit_post_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_tag_counts_on_post_tag();

-- Function to search tags with autocomplete
CREATE OR REPLACE FUNCTION search_tags_autocomplete(search_query text, result_limit integer DEFAULT 10)
RETURNS TABLE (
  id uuid,
  tag_name text,
  display_name text,
  usage_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.tag_name,
    t.display_name,
    t.usage_count
  FROM heddit_custom_tags t
  WHERE t.tag_name ILIKE search_query || '%'
     OR t.display_name ILIKE '%' || search_query || '%'
  ORDER BY t.usage_count DESC, t.tag_name
  LIMIT result_limit;
END;
$$;

-- Function to get popular tags for a SubHeddit
CREATE OR REPLACE FUNCTION get_subreddit_popular_tags(subreddit_uuid uuid, result_limit integer DEFAULT 10)
RETURNS TABLE (
  id uuid,
  tag_name text,
  display_name text,
  usage_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    t.id,
    t.tag_name,
    t.display_name,
    COUNT(pt.id)::integer as tag_usage_count
  FROM heddit_custom_tags t
  INNER JOIN heddit_post_tags pt ON pt.tag_id = t.id
  INNER JOIN heddit_posts p ON p.id = pt.post_id
  WHERE p.subreddit_id = subreddit_uuid
  GROUP BY t.id, t.tag_name, t.display_name
  ORDER BY tag_usage_count DESC, t.tag_name
  LIMIT result_limit;
END;
$$;

-- Function to calculate trending tags (to be run daily)
CREATE OR REPLACE FUNCTION calculate_trending_tags()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clear existing trending data
  DELETE FROM heddit_trending_tags;
  
  -- Calculate new trending scores based on recent activity
  INSERT INTO heddit_trending_tags (tag_id, trend_score, recent_usage_count, velocity, rank)
  SELECT 
    t.id,
    -- Trend score: weighted combination of recent usage and velocity
    (recent_count * 0.7 + velocity * 0.3) as trend_score,
    recent_count,
    velocity,
    ROW_NUMBER() OVER (ORDER BY (recent_count * 0.7 + velocity * 0.3) DESC) as rank
  FROM heddit_custom_tags t
  CROSS JOIN LATERAL (
    -- Count usage in last 7 days
    SELECT 
      (
        (SELECT COUNT(*) FROM heddit_post_tags pt WHERE pt.tag_id = t.id AND pt.created_at > now() - interval '7 days') +
        (SELECT COUNT(*) FROM heddit_subreddit_custom_tags st WHERE st.tag_id = t.id AND st.created_at > now() - interval '7 days')
      ) as recent_count
  ) recent
  CROSS JOIN LATERAL (
    -- Calculate velocity (change in usage rate)
    SELECT 
      CASE 
        WHEN older_count > 0 THEN ((recent_count::numeric - older_count::numeric) / older_count::numeric) * 100
        WHEN recent_count > 0 THEN 100
        ELSE 0
      END as velocity
    FROM (
      SELECT 
        (
          (SELECT COUNT(*) FROM heddit_post_tags pt WHERE pt.tag_id = t.id AND pt.created_at BETWEEN now() - interval '14 days' AND now() - interval '7 days') +
          (SELECT COUNT(*) FROM heddit_subreddit_custom_tags st WHERE st.tag_id = t.id AND st.created_at BETWEEN now() - interval '14 days' AND now() - interval '7 days')
        ) as older_count
    ) previous_period
  ) vel
  WHERE recent_count > 0
  ORDER BY trend_score DESC
  LIMIT 50;
  
  -- Update calculated timestamp
  UPDATE heddit_trending_tags SET calculated_at = now();
END;
$$;

-- Function to get trending tags
CREATE OR REPLACE FUNCTION get_trending_tags(result_limit integer DEFAULT 10)
RETURNS TABLE (
  id uuid,
  tag_name text,
  display_name text,
  usage_count integer,
  trend_score numeric,
  recent_usage_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.tag_name,
    t.display_name,
    t.usage_count,
    tt.trend_score,
    tt.recent_usage_count
  FROM heddit_trending_tags tt
  INNER JOIN heddit_custom_tags t ON t.id = tt.tag_id
  ORDER BY tt.rank
  LIMIT result_limit;
END;
$$;
