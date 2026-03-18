/*
  # Create Heddit Topics and Cross-Posting System

  ## Overview
  Adds topic categorization and cross-posting capabilities to the Heddit platform.

  ## New Tables

  ### Topic System
  - `heddit_topics` - Predefined interest/topic categories
    - `id` (uuid, primary key)
    - `name` (text, unique) - Topic name (e.g., "Technology", "Gaming")
    - `slug` (text, unique) - URL-friendly slug
    - `description` (text) - Topic description
    - `icon` (text) - Lucide icon name
    - `color` (text) - Display color for UI
    - `created_at` (timestamptz)

  - `heddit_subreddit_topics` - Links SubHeddits to topics
    - `id` (uuid, primary key)
    - `subreddit_id` (uuid, foreign key)
    - `topic_id` (uuid, foreign key)
    - `created_at` (timestamptz)
    - Unique constraint on (subreddit_id, topic_id)

  ### Cross-Posting System
  - `heddit_post_subreddits` - Junction table for multi-subreddit posts
    - `id` (uuid, primary key)
    - `post_id` (uuid, foreign key)
    - `subreddit_id` (uuid, foreign key)
    - `is_primary` (boolean) - Original posting location
    - `created_at` (timestamptz)
    - Unique constraint on (post_id, subreddit_id)

  ## Schema Modifications
  - Add `topics` text[] column to `heddit_subreddits` for quick filtering
  - Add indexes on search-relevant columns for performance

  ## Security
  - Enable RLS on all new tables
  - Authenticated users can read all topics
  - Only admins can create/modify topics (using is_admin column)
  - Users can link topics when creating SubHeddits
  - Cross-posting respects existing post creation permissions

  ## Predefined Topics
  Seeds initial topic categories for immediate use
*/

-- ============================================================================
-- TOPIC CATEGORIZATION SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS heddit_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  icon text DEFAULT 'Tag',
  color text DEFAULT '#6366f1',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS heddit_subreddit_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subreddit_id uuid REFERENCES heddit_subreddits(id) ON DELETE CASCADE NOT NULL,
  topic_id uuid REFERENCES heddit_topics(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(subreddit_id, topic_id)
);

-- Add topics array to subreddits for quick filtering
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'heddit_subreddits' AND column_name = 'topics'
  ) THEN
    ALTER TABLE heddit_subreddits ADD COLUMN topics text[] DEFAULT '{}';
  END IF;
END $$;

-- ============================================================================
-- CROSS-POSTING SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS heddit_post_subreddits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES heddit_posts(id) ON DELETE CASCADE NOT NULL,
  subreddit_id uuid REFERENCES heddit_subreddits(id) ON DELETE CASCADE NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, subreddit_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Search indexes
CREATE INDEX IF NOT EXISTS idx_heddit_subreddits_name_search
  ON heddit_subreddits USING gin(to_tsvector('english', name));

CREATE INDEX IF NOT EXISTS idx_heddit_subreddits_description_search
  ON heddit_subreddits USING gin(to_tsvector('english', description));

CREATE INDEX IF NOT EXISTS idx_heddit_subreddits_topics
  ON heddit_subreddits USING gin(topics);

-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_heddit_subreddit_topics_subreddit
  ON heddit_subreddit_topics(subreddit_id);

CREATE INDEX IF NOT EXISTS idx_heddit_subreddit_topics_topic
  ON heddit_subreddit_topics(topic_id);

CREATE INDEX IF NOT EXISTS idx_heddit_post_subreddits_post
  ON heddit_post_subreddits(post_id);

CREATE INDEX IF NOT EXISTS idx_heddit_post_subreddits_subreddit
  ON heddit_post_subreddits(subreddit_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE heddit_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE heddit_subreddit_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE heddit_post_subreddits ENABLE ROW LEVEL SECURITY;

-- Topics: Everyone can read, only admins can modify
CREATE POLICY "Anyone can view topics"
  ON heddit_topics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert topics"
  ON heddit_topics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update topics"
  ON heddit_topics FOR UPDATE
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

-- Subreddit Topics: Everyone can read, SubHeddit creators can manage
CREATE POLICY "Anyone can view subreddit topics"
  ON heddit_subreddit_topics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "SubHeddit creators can add topics"
  ON heddit_subreddit_topics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM heddit_subreddits
      JOIN heddit_accounts ON heddit_subreddits.creator_id = heddit_accounts.id
      WHERE heddit_subreddits.id = subreddit_id
      AND heddit_accounts.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "SubHeddit creators can remove topics"
  ON heddit_subreddit_topics FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM heddit_subreddits
      JOIN heddit_accounts ON heddit_subreddits.creator_id = heddit_accounts.id
      WHERE heddit_subreddits.id = subreddit_id
      AND heddit_accounts.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Post Subreddits: Everyone can read, post authors manage
CREATE POLICY "Anyone can view post subreddits"
  ON heddit_post_subreddits FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Post authors can cross-post"
  ON heddit_post_subreddits FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM heddit_posts
      JOIN heddit_accounts ON heddit_posts.author_id = heddit_accounts.id
      WHERE heddit_posts.id = post_id
      AND heddit_accounts.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Post authors can remove cross-posts"
  ON heddit_post_subreddits FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM heddit_posts
      JOIN heddit_accounts ON heddit_posts.author_id = heddit_accounts.id
      WHERE heddit_posts.id = post_id
      AND heddit_accounts.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- ============================================================================
-- SEED PREDEFINED TOPICS
-- ============================================================================

INSERT INTO heddit_topics (name, slug, description, icon, color) VALUES
  ('Technology', 'technology', 'Computers, gadgets, software, and tech news', 'Cpu', '#3b82f6'),
  ('Gaming', 'gaming', 'Video games, esports, and gaming culture', 'Gamepad2', '#8b5cf6'),
  ('Sports', 'sports', 'Athletics, competitions, and sports teams', 'Trophy', '#10b981'),
  ('Entertainment', 'entertainment', 'Movies, TV shows, music, and celebrities', 'Film', '#f59e0b'),
  ('Science', 'science', 'Scientific discoveries, research, and discussion', 'FlaskConical', '#06b6d4'),
  ('Art & Design', 'art-design', 'Visual arts, graphic design, and creativity', 'Palette', '#ec4899'),
  ('Food & Cooking', 'food-cooking', 'Recipes, restaurants, and culinary arts', 'UtensilsCrossed', '#f97316'),
  ('Fitness & Health', 'fitness-health', 'Exercise, nutrition, and wellness', 'Dumbbell', '#14b8a6'),
  ('Business & Finance', 'business-finance', 'Economics, investing, and entrepreneurship', 'TrendingUp', '#6366f1'),
  ('Education', 'education', 'Learning, teaching, and academic discussions', 'GraduationCap', '#8b5cf6'),
  ('News & Politics', 'news-politics', 'Current events, political discussion, and world news', 'Newspaper', '#ef4444'),
  ('DIY & Crafts', 'diy-crafts', 'Do-it-yourself projects and handmade creations', 'Hammer', '#eab308'),
  ('Travel', 'travel', 'Destinations, trip planning, and travel experiences', 'Plane', '#0ea5e9'),
  ('Fashion & Beauty', 'fashion-beauty', 'Style, cosmetics, and personal appearance', 'Sparkles', '#d946ef'),
  ('Pets & Animals', 'pets-animals', 'Pet care, wildlife, and animal lovers', 'PawPrint', '#84cc16'),
  ('Photography', 'photography', 'Photo techniques, gear, and showcasing work', 'Camera', '#64748b'),
  ('Books & Literature', 'books-literature', 'Reading, writing, and literary discussion', 'BookOpen', '#7c3aed'),
  ('Music', 'music', 'All genres, instruments, and music production', 'Music', '#ec4899'),
  ('Automotive', 'automotive', 'Cars, motorcycles, and vehicle enthusiasts', 'Car', '#737373'),
  ('Home & Garden', 'home-garden', 'Interior design, gardening, and home improvement', 'Home', '#22c55e'),
  ('Humor & Memes', 'humor-memes', 'Jokes, funny content, and internet culture', 'Laugh', '#facc15'),
  ('Relationships', 'relationships', 'Dating, friendships, and relationship advice', 'Heart', '#f43f5e'),
  ('Career & Jobs', 'career-jobs', 'Professional development and workplace topics', 'Briefcase', '#3b82f6'),
  ('Hobbies', 'hobbies', 'Various interests, collections, and pastimes', 'Puzzle', '#a855f7'),
  ('Philosophy', 'philosophy', 'Deep thoughts, ethics, and philosophical debates', 'Brain', '#6366f1')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- HELPER FUNCTION: Update subreddit topics array
-- ============================================================================

CREATE OR REPLACE FUNCTION update_subreddit_topics_array()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE heddit_subreddits
  SET topics = (
    SELECT ARRAY_AGG(t.slug)
    FROM heddit_subreddit_topics st
    JOIN heddit_topics t ON st.topic_id = t.id
    WHERE st.subreddit_id = COALESCE(NEW.subreddit_id, OLD.subreddit_id)
  )
  WHERE id = COALESCE(NEW.subreddit_id, OLD.subreddit_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_subreddit_topics_array ON heddit_subreddit_topics;
CREATE TRIGGER sync_subreddit_topics_array
  AFTER INSERT OR DELETE ON heddit_subreddit_topics
  FOR EACH ROW
  EXECUTE FUNCTION update_subreddit_topics_array();