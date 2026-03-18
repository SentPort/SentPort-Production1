/*
  # Create Blog Platform Schema

  ## Overview
  This migration creates a comprehensive blogging platform with personalized content discovery,
  engagement-based feed algorithms, and verification requirements.

  ## New Tables

  ### 1. blog_accounts
  User blogging accounts with interest preferences
  - `id` (uuid, primary key) - Links to user_profiles.id
  - `username` (text, unique, required) - Unique blog username
  - `display_name` (text, required) - Display name for blog
  - `bio` (text, optional) - Author biography
  - `avatar_url` (text, optional) - Avatar image URL
  - `interests` (text[], required) - Array of selected interest categories
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. blog_interests
  Predefined interest categories for content organization
  - `id` (uuid, primary key)
  - `name` (text, unique, required) - Interest category name
  - `description` (text, optional) - Category description
  - `created_at` (timestamptz)

  ### 3. blog_posts
  Individual blog posts with privacy and engagement tracking
  - `id` (uuid, primary key)
  - `account_id` (uuid) - Author's blog account
  - `title` (text, required) - Post title
  - `content` (text, required) - Post content
  - `privacy` (text) - private/public
  - `status` (text) - draft/published/archived
  - `view_count` (integer) - Total views
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. blog_post_interests
  Junction table linking posts to interest categories
  - `id` (uuid, primary key)
  - `post_id` (uuid) - Associated blog post
  - `interest_id` (uuid) - Associated interest category
  - `created_at` (timestamptz)

  ### 5. blog_views
  Individual view events for tracking engagement velocity
  - `id` (uuid, primary key)
  - `post_id` (uuid) - Viewed post
  - `viewer_id` (uuid, optional) - User who viewed (null for anonymous)
  - `viewed_at` (timestamptz) - View timestamp

  ### 6. blog_comments
  Comments on blog posts
  - `id` (uuid, primary key)
  - `post_id` (uuid) - Associated post
  - `account_id` (uuid) - Comment author
  - `content` (text, required) - Comment text
  - `parent_comment_id` (uuid, optional) - For nested replies
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 7. blog_feed_metrics
  Materialized view for pre-calculated engagement scores
  - `post_id` (uuid, primary key)
  - `total_views_30d` (integer) - Views in last 30 days
  - `total_comments_30d` (integer) - Comments in last 30 days
  - `view_velocity` (numeric) - Views per day
  - `comment_velocity` (numeric) - Comments per day
  - `engagement_balance` (numeric) - 50/50 balance score
  - `engagement_score` (numeric) - Final ranking score
  - `last_calculated` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Blog account creation restricted to verified users only
  - Public posts viewable by all, private posts only by author
  - Comments restricted to authenticated users

  ## Indexes
  - Performance indexes on foreign keys
  - Index on blog_posts for feed queries
  - Index on blog_views for velocity calculations
  - Index on engagement scores for ranking
*/

CREATE TABLE IF NOT EXISTS blog_accounts (
  id uuid PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text NOT NULL,
  bio text,
  avatar_url text,
  interests text[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (array_length(interests, 1) > 0)
);

CREATE TABLE IF NOT EXISTS blog_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

INSERT INTO blog_interests (name, description) VALUES
  ('Technology', 'Tech news, programming, software, and gadgets'),
  ('Sports', 'Athletics, fitness, games, and competitions'),
  ('Music', 'Songs, instruments, concerts, and artists'),
  ('Art', 'Visual arts, design, creativity, and exhibitions'),
  ('Politics', 'Government, policy, elections, and civic issues'),
  ('Science', 'Research, discoveries, experiments, and theories'),
  ('Health', 'Wellness, medicine, nutrition, and mental health'),
  ('Food', 'Cooking, recipes, restaurants, and culinary experiences'),
  ('Travel', 'Destinations, adventures, cultures, and journeys'),
  ('Fashion', 'Style, clothing, trends, and design'),
  ('Gaming', 'Video games, esports, and gaming culture'),
  ('Movies', 'Films, cinema, reviews, and entertainment'),
  ('Books', 'Literature, reading, authors, and reviews'),
  ('Photography', 'Photos, cameras, techniques, and visual storytelling'),
  ('Nature', 'Wildlife, environment, outdoors, and conservation'),
  ('Fitness', 'Exercise, training, sports nutrition, and wellness'),
  ('Business', 'Entrepreneurship, finance, markets, and careers'),
  ('Education', 'Learning, teaching, schools, and knowledge')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES blog_accounts(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  privacy text NOT NULL DEFAULT 'public' CHECK (privacy IN ('private', 'public')),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  view_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blog_post_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  interest_id uuid NOT NULL REFERENCES blog_interests(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, interest_id)
);

CREATE TABLE IF NOT EXISTS blog_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  viewed_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blog_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES blog_accounts(id) ON DELETE CASCADE,
  content text NOT NULL,
  parent_comment_id uuid REFERENCES blog_comments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blog_feed_metrics (
  post_id uuid PRIMARY KEY REFERENCES blog_posts(id) ON DELETE CASCADE,
  total_views_30d integer DEFAULT 0,
  total_comments_30d integer DEFAULT 0,
  view_velocity numeric DEFAULT 0,
  comment_velocity numeric DEFAULT 0,
  engagement_balance numeric DEFAULT 0,
  engagement_score numeric DEFAULT 0,
  last_calculated timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_accounts_username ON blog_accounts(username);
CREATE INDEX IF NOT EXISTS idx_blog_posts_account ON blog_posts(account_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_privacy ON blog_posts(privacy);
CREATE INDEX IF NOT EXISTS idx_blog_posts_created ON blog_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_post_interests_post ON blog_post_interests(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_interests_interest ON blog_post_interests(interest_id);
CREATE INDEX IF NOT EXISTS idx_blog_views_post ON blog_views(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_views_viewed_at ON blog_views(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_comments_post ON blog_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_account ON blog_comments(account_id);
CREATE INDEX IF NOT EXISTS idx_blog_feed_metrics_score ON blog_feed_metrics(engagement_score DESC);

ALTER TABLE blog_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_feed_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view blog interests"
  ON blog_interests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Verified users can view all blog accounts"
  ON blog_accounts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Verified users can create their blog account"
  ON blog_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_verified = true
    )
  );

CREATE POLICY "Users can update their own blog account"
  ON blog_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view public published posts"
  ON blog_posts FOR SELECT
  TO authenticated
  USING (
    (privacy = 'public' AND status = 'published')
    OR (account_id IN (
      SELECT id FROM blog_accounts WHERE id = auth.uid()
    ))
  );

CREATE POLICY "Blog account owners can create posts"
  ON blog_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    account_id IN (
      SELECT id FROM blog_accounts WHERE id = auth.uid()
    )
  );

CREATE POLICY "Authors can update their own posts"
  ON blog_posts FOR UPDATE
  TO authenticated
  USING (
    account_id IN (
      SELECT id FROM blog_accounts WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    account_id IN (
      SELECT id FROM blog_accounts WHERE id = auth.uid()
    )
  );

CREATE POLICY "Authors can delete their own posts"
  ON blog_posts FOR DELETE
  TO authenticated
  USING (
    account_id IN (
      SELECT id FROM blog_accounts WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view post interests for visible posts"
  ON blog_post_interests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = blog_post_interests.post_id
      AND (
        (blog_posts.privacy = 'public' AND blog_posts.status = 'published')
        OR blog_posts.account_id IN (
          SELECT id FROM blog_accounts WHERE id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Authors can manage their post interests"
  ON blog_post_interests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = blog_post_interests.post_id
      AND blog_posts.account_id IN (
        SELECT id FROM blog_accounts WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = blog_post_interests.post_id
      AND blog_posts.account_id IN (
        SELECT id FROM blog_accounts WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Anyone can view blog views for visible posts"
  ON blog_views FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = blog_views.post_id
      AND (
        (blog_posts.privacy = 'public' AND blog_posts.status = 'published')
        OR blog_posts.account_id IN (
          SELECT id FROM blog_accounts WHERE id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Anyone can create blog views"
  ON blog_views FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view comments on visible posts"
  ON blog_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = blog_comments.post_id
      AND (
        (blog_posts.privacy = 'public' AND blog_posts.status = 'published')
        OR blog_posts.account_id IN (
          SELECT id FROM blog_accounts WHERE id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Blog account owners can create comments"
  ON blog_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    account_id IN (
      SELECT id FROM blog_accounts WHERE id = auth.uid()
    )
  );

CREATE POLICY "Authors can update their own comments"
  ON blog_comments FOR UPDATE
  TO authenticated
  USING (
    account_id IN (
      SELECT id FROM blog_accounts WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    account_id IN (
      SELECT id FROM blog_accounts WHERE id = auth.uid()
    )
  );

CREATE POLICY "Authors can delete their own comments"
  ON blog_comments FOR DELETE
  TO authenticated
  USING (
    account_id IN (
      SELECT id FROM blog_accounts WHERE id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view feed metrics"
  ON blog_feed_metrics FOR SELECT
  TO authenticated
  USING (true);