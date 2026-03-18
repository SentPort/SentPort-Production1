/*
  # Create All Social Platforms Schema

  ## Overview
  Creates database schemas for Heddit (Reddit-style), HuTube (YouTube-style), 
  Hinsta (Instagram-style), and Switter (Twitter-style) platforms.

  ## New Tables

  ### Heddit Tables
  - `heddit_accounts` - User accounts for Heddit platform
    - id, user_id, username, display_name, bio, avatar_url, karma, created_at
  - `heddit_subreddits` - Community forums (like subreddits)
    - id, name, display_name, description, creator_id, member_count, created_at
  - `heddit_posts` - Posts in subreddits
    - id, subreddit_id, author_id, title, content, type (text/link/image), url, created_at
  - `heddit_subreddit_members` - Membership tracking

  ### HuTube Tables
  - `hutube_channels` - Video creator channels
    - id, user_id, handle, display_name, description, avatar_url, banner_url, subscriber_count, created_at
  - `hutube_videos` - Video content
    - id, channel_id, title, description, thumbnail_url, video_url, duration, view_count, created_at
  - `hutube_subscriptions` - Channel subscriptions

  ### Hinsta Tables
  - `hinsta_accounts` - User accounts for Hinsta platform
    - id, user_id, username, display_name, bio, avatar_url, follower_count, following_count, created_at
  - `hinsta_posts` - Photo/video posts
    - id, author_id, caption, media_url, media_type (image/video), created_at
  - `hinsta_follows` - Follow relationships

  ### Switter Tables
  - `switter_accounts` - User accounts for Switter platform
    - id, user_id, handle, display_name, bio, avatar_url, banner_url, follower_count, following_count, verified_badge, created_at
  - `switter_tweets` - Tweets/posts
    - id, author_id, content, media_url, reply_to_id, retweet_of_id, created_at
  - `switter_follows` - Follow relationships

  ### Shared Engagement Tables
  - `platform_likes` - Universal like tracking
    - id, user_id, platform, content_type, content_id, created_at
  - `platform_dislikes` - Universal dislike tracking
  - `platform_comments` - Universal comment system
    - id, user_id, platform, content_type, content_id, content, parent_id, created_at
  - `platform_shares` - Universal share tracking
  - `platform_reports` - Universal fake content reports
    - id, user_id, platform, content_type, content_id, reason, description, status, created_at

  ## Security
  - Enable RLS on all tables
  - Policies require authentication AND verification
  - Users can only create one account per platform
  - Content creators control their own content
  - All users can engage with content (like, comment, share, report)
*/

-- ============================================================================
-- HEDDIT PLATFORM (Reddit-style)
-- ============================================================================

CREATE TABLE IF NOT EXISTS heddit_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  username text UNIQUE NOT NULL,
  display_name text NOT NULL,
  bio text DEFAULT '',
  avatar_url text,
  karma integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS heddit_subreddits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text DEFAULT '',
  creator_id uuid REFERENCES heddit_accounts(id) ON DELETE SET NULL,
  member_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS heddit_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subreddit_id uuid REFERENCES heddit_subreddits(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES heddit_accounts(id) ON DELETE SET NULL,
  title text NOT NULL,
  content text DEFAULT '',
  type text DEFAULT 'text' CHECK (type IN ('text', 'link', 'image')),
  url text,
  like_count integer DEFAULT 0,
  dislike_count integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  share_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS heddit_subreddit_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subreddit_id uuid REFERENCES heddit_subreddits(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES heddit_accounts(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(subreddit_id, user_id)
);

-- ============================================================================
-- HUTUBE PLATFORM (YouTube-style)
-- ============================================================================

CREATE TABLE IF NOT EXISTS hutube_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  handle text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text DEFAULT '',
  avatar_url text,
  banner_url text,
  subscriber_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hutube_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES hutube_channels(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  thumbnail_url text,
  video_url text NOT NULL,
  duration integer DEFAULT 0,
  view_count integer DEFAULT 0,
  like_count integer DEFAULT 0,
  dislike_count integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  share_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hutube_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES hutube_channels(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

-- ============================================================================
-- HINSTA PLATFORM (Instagram-style)
-- ============================================================================

CREATE TABLE IF NOT EXISTS hinsta_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  username text UNIQUE NOT NULL,
  display_name text NOT NULL,
  bio text DEFAULT '',
  avatar_url text,
  follower_count integer DEFAULT 0,
  following_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hinsta_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid REFERENCES hinsta_accounts(id) ON DELETE CASCADE NOT NULL,
  caption text DEFAULT '',
  media_url text NOT NULL,
  media_type text DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  like_count integer DEFAULT 0,
  dislike_count integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  share_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hinsta_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid REFERENCES hinsta_accounts(id) ON DELETE CASCADE NOT NULL,
  following_id uuid REFERENCES hinsta_accounts(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- ============================================================================
-- SWITTER PLATFORM (Old Twitter-style)
-- ============================================================================

CREATE TABLE IF NOT EXISTS switter_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  handle text UNIQUE NOT NULL,
  display_name text NOT NULL,
  bio text DEFAULT '',
  avatar_url text,
  banner_url text,
  follower_count integer DEFAULT 0,
  following_count integer DEFAULT 0,
  verified_badge boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS switter_tweets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid REFERENCES switter_accounts(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  media_url text,
  reply_to_id uuid REFERENCES switter_tweets(id) ON DELETE SET NULL,
  retweet_of_id uuid REFERENCES switter_tweets(id) ON DELETE CASCADE,
  like_count integer DEFAULT 0,
  dislike_count integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  share_count integer DEFAULT 0,
  retweet_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS switter_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid REFERENCES switter_accounts(id) ON DELETE CASCADE NOT NULL,
  following_id uuid REFERENCES switter_accounts(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- ============================================================================
-- SHARED ENGAGEMENT TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS platform_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL CHECK (platform IN ('hubook', 'heddit', 'hutube', 'hinsta', 'switter')),
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, platform, content_type, content_id)
);

CREATE TABLE IF NOT EXISTS platform_dislikes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL CHECK (platform IN ('hubook', 'heddit', 'hutube', 'hinsta', 'switter')),
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, platform, content_type, content_id)
);

CREATE TABLE IF NOT EXISTS platform_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL CHECK (platform IN ('hubook', 'heddit', 'hutube', 'hinsta', 'switter')),
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  content text NOT NULL,
  parent_id uuid REFERENCES platform_comments(id) ON DELETE CASCADE,
  like_count integer DEFAULT 0,
  dislike_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL CHECK (platform IN ('hubook', 'heddit', 'hutube', 'hinsta', 'switter')),
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL CHECK (platform IN ('hubook', 'heddit', 'hutube', 'hinsta', 'switter')),
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  reason text NOT NULL,
  description text DEFAULT '',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

ALTER TABLE heddit_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE heddit_subreddits ENABLE ROW LEVEL SECURITY;
ALTER TABLE heddit_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE heddit_subreddit_members ENABLE ROW LEVEL SECURITY;

ALTER TABLE hutube_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE hutube_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE hutube_subscriptions ENABLE ROW LEVEL SECURITY;

ALTER TABLE hinsta_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE hinsta_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE hinsta_follows ENABLE ROW LEVEL SECURITY;

ALTER TABLE switter_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE switter_tweets ENABLE ROW LEVEL SECURITY;
ALTER TABLE switter_follows ENABLE ROW LEVEL SECURITY;

ALTER TABLE platform_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_dislikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_reports ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - HEDDIT
-- ============================================================================

CREATE POLICY "Anyone can view Heddit accounts"
  ON heddit_accounts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Verified users can create Heddit account"
  ON heddit_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_verified = true
    )
  );

CREATE POLICY "Users can update own Heddit account"
  ON heddit_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view subreddits"
  ON heddit_subreddits FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Verified Heddit users can create subreddits"
  ON heddit_subreddits FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM heddit_accounts
      WHERE heddit_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view Heddit posts"
  ON heddit_posts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Verified Heddit users can create posts"
  ON heddit_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM heddit_accounts
      WHERE heddit_accounts.id = author_id
      AND heddit_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Authors can update own Heddit posts"
  ON heddit_posts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM heddit_accounts
      WHERE heddit_accounts.id = author_id
      AND heddit_accounts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM heddit_accounts
      WHERE heddit_accounts.id = author_id
      AND heddit_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view subreddit members"
  ON heddit_subreddit_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Verified Heddit users can join subreddits"
  ON heddit_subreddit_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM heddit_accounts
      WHERE heddit_accounts.id = user_id
      AND heddit_accounts.user_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES - HUTUBE
-- ============================================================================

CREATE POLICY "Anyone can view HuTube channels"
  ON hutube_channels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Verified users can create HuTube channel"
  ON hutube_channels FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_verified = true
    )
  );

CREATE POLICY "Users can update own HuTube channel"
  ON hutube_channels FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view HuTube videos"
  ON hutube_videos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Channel owners can upload videos"
  ON hutube_videos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hutube_channels
      WHERE hutube_channels.id = channel_id
      AND hutube_channels.user_id = auth.uid()
    )
  );

CREATE POLICY "Channel owners can update own videos"
  ON hutube_videos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hutube_channels
      WHERE hutube_channels.id = channel_id
      AND hutube_channels.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hutube_channels
      WHERE hutube_channels.id = channel_id
      AND hutube_channels.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view subscriptions"
  ON hutube_subscriptions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Verified users can subscribe to channels"
  ON hutube_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_verified = true
    )
  );

-- ============================================================================
-- RLS POLICIES - HINSTA
-- ============================================================================

CREATE POLICY "Anyone can view Hinsta accounts"
  ON hinsta_accounts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Verified users can create Hinsta account"
  ON hinsta_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_verified = true
    )
  );

CREATE POLICY "Users can update own Hinsta account"
  ON hinsta_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view Hinsta posts"
  ON hinsta_posts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Verified Hinsta users can create posts"
  ON hinsta_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hinsta_accounts
      WHERE hinsta_accounts.id = author_id
      AND hinsta_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Authors can update own Hinsta posts"
  ON hinsta_posts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hinsta_accounts
      WHERE hinsta_accounts.id = author_id
      AND hinsta_accounts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hinsta_accounts
      WHERE hinsta_accounts.id = author_id
      AND hinsta_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view Hinsta follows"
  ON hinsta_follows FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Verified Hinsta users can follow others"
  ON hinsta_follows FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hinsta_accounts
      WHERE hinsta_accounts.id = follower_id
      AND hinsta_accounts.user_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES - SWITTER
-- ============================================================================

CREATE POLICY "Anyone can view Switter accounts"
  ON switter_accounts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Verified users can create Switter account"
  ON switter_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_verified = true
    )
  );

CREATE POLICY "Users can update own Switter account"
  ON switter_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view tweets"
  ON switter_tweets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Verified Switter users can create tweets"
  ON switter_tweets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM switter_accounts
      WHERE switter_accounts.id = author_id
      AND switter_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Authors can update own tweets"
  ON switter_tweets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM switter_accounts
      WHERE switter_accounts.id = author_id
      AND switter_accounts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM switter_accounts
      WHERE switter_accounts.id = author_id
      AND switter_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view Switter follows"
  ON switter_follows FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Verified Switter users can follow others"
  ON switter_follows FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM switter_accounts
      WHERE switter_accounts.id = follower_id
      AND switter_accounts.user_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES - SHARED ENGAGEMENT
-- ============================================================================

CREATE POLICY "Anyone can view likes"
  ON platform_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Verified users can like content"
  ON platform_likes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_verified = true
    )
  );

CREATE POLICY "Users can remove own likes"
  ON platform_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view dislikes"
  ON platform_dislikes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Verified users can dislike content"
  ON platform_dislikes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_verified = true
    )
  );

CREATE POLICY "Users can remove own dislikes"
  ON platform_dislikes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view comments"
  ON platform_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Verified users can comment on content"
  ON platform_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_verified = true
    )
  );

CREATE POLICY "Authors can update own comments"
  ON platform_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view shares"
  ON platform_shares FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Verified users can share content"
  ON platform_shares FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_verified = true
    )
  );

CREATE POLICY "Anyone can view reports"
  ON platform_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Verified users can report fake content"
  ON platform_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_verified = true
    )
  );

CREATE POLICY "Moderators can update reports"
  ON platform_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN hubook_profiles hp ON hp.id = up.id
      WHERE up.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN hubook_profiles hp ON hp.id = up.id
      WHERE up.id = auth.uid()
    )
  );

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_heddit_posts_subreddit ON heddit_posts(subreddit_id);
CREATE INDEX IF NOT EXISTS idx_heddit_posts_author ON heddit_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_hutube_videos_channel ON hutube_videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_hinsta_posts_author ON hinsta_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_switter_tweets_author ON switter_tweets(author_id);
CREATE INDEX IF NOT EXISTS idx_platform_likes_content ON platform_likes(platform, content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_platform_comments_content ON platform_comments(platform, content_type, content_id);