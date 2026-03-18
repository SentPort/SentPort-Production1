/*
  # Create HuTube Tracking and Metrics Schema

  ## Overview
  This migration creates tracking tables and engagement metrics for the HuTube platform.
  It enables quality-focused algorithmic ranking based on 30-day engagement velocity and 
  interaction quality.

  ## New Tables

  ### 1. hutube_video_views
  Tracks individual view events for videos
  - `id` (uuid, primary key)
  - `video_id` (uuid, references hutube_videos)
  - `user_id` (uuid, references auth.users)
  - `viewed_at` (timestamptz)

  ### 2. hutube_video_watch_time
  Tracks watch completion for quality metrics
  - `id` (uuid, primary key)
  - `video_id` (uuid, references hutube_videos)
  - `user_id` (uuid, references auth.users)
  - `seconds_watched` (integer)
  - `completion_percentage` (numeric)
  - `watched_at` (timestamptz)

  ### 3. hutube_feed_metrics
  Stores calculated engagement scores for video ranking
  - `video_id` (uuid, primary key, references hutube_videos)
  - `total_views_30d` (integer) - Views in last 30 days
  - `total_comments_30d` (integer) - Comments in last 30 days
  - `total_likes_30d` (integer) - Likes in last 30 days
  - `total_shares_30d` (integer) - Shares in last 30 days
  - `view_velocity` (numeric) - Views per day
  - `comment_velocity` (numeric) - Comments per day
  - `share_velocity` (numeric) - Shares per day
  - `like_ratio` (numeric) - Likes / (likes + dislikes)
  - `engagement_balance` (numeric) - Quality score for interaction depth
  - `engagement_score` (numeric) - Final ranking score
  - `last_calculated` (timestamptz)

  ### 4. hutube_channel_interests
  Tags channels with interest categories for discovery
  - `id` (uuid, primary key)
  - `channel_id` (uuid, references hutube_channels)
  - `interest` (text) - Category like 'technology', 'science', 'arts', etc.
  - `created_at` (timestamptz)

  ### 5. hutube_discovery_injections
  Tracks discovery videos shown to users
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `video_id` (uuid, references hutube_videos)
  - `shown_at` (timestamptz)
  - `clicked` (boolean)

  ## Security
  - Enable RLS on all new tables
  - Users can view all public metrics
  - Only authenticated users can create views/watch events
  - System functions update metrics automatically

  ## Performance
  - Indexes on video_id, user_id, and timestamps for fast queries
  - Indexes on engagement_score for feed sorting
*/

-- ============================================================================
-- CREATE TRACKING TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS hutube_video_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES hutube_videos(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  viewed_at timestamptz DEFAULT now(),
  UNIQUE(video_id, user_id)
);

CREATE TABLE IF NOT EXISTS hutube_video_watch_time (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES hutube_videos(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  seconds_watched integer DEFAULT 0,
  completion_percentage numeric DEFAULT 0,
  watched_at timestamptz DEFAULT now(),
  UNIQUE(video_id, user_id)
);

CREATE TABLE IF NOT EXISTS hutube_feed_metrics (
  video_id uuid PRIMARY KEY REFERENCES hutube_videos(id) ON DELETE CASCADE,
  total_views_30d integer DEFAULT 0,
  total_comments_30d integer DEFAULT 0,
  total_likes_30d integer DEFAULT 0,
  total_dislikes_30d integer DEFAULT 0,
  total_shares_30d integer DEFAULT 0,
  view_velocity numeric DEFAULT 0,
  comment_velocity numeric DEFAULT 0,
  share_velocity numeric DEFAULT 0,
  like_ratio numeric DEFAULT 0,
  engagement_balance numeric DEFAULT 0,
  engagement_score numeric DEFAULT 0,
  last_calculated timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hutube_channel_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES hutube_channels(id) ON DELETE CASCADE NOT NULL,
  interest text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(channel_id, interest)
);

CREATE TABLE IF NOT EXISTS hutube_discovery_injections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_id uuid REFERENCES hutube_videos(id) ON DELETE CASCADE NOT NULL,
  shown_at timestamptz DEFAULT now(),
  clicked boolean DEFAULT false
);

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

ALTER TABLE hutube_video_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE hutube_video_watch_time ENABLE ROW LEVEL SECURITY;
ALTER TABLE hutube_feed_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE hutube_channel_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE hutube_discovery_injections ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

CREATE POLICY "Anyone can view video views"
  ON hutube_video_views FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can record video views"
  ON hutube_video_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view watch time stats"
  ON hutube_video_watch_time FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can record watch time"
  ON hutube_video_watch_time FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watch time"
  ON hutube_video_watch_time FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view feed metrics"
  ON hutube_feed_metrics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can view channel interests"
  ON hutube_channel_interests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Channel owners can set interests"
  ON hutube_channel_interests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hutube_channels
      WHERE hutube_channels.id = channel_id
      AND hutube_channels.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view discovery injections"
  ON hutube_discovery_injections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can create discovery injections"
  ON hutube_discovery_injections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own discovery injection clicks"
  ON hutube_discovery_injections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_hutube_views_video ON hutube_video_views(video_id);
CREATE INDEX IF NOT EXISTS idx_hutube_views_user ON hutube_video_views(user_id);
CREATE INDEX IF NOT EXISTS idx_hutube_views_date ON hutube_video_views(viewed_at);

CREATE INDEX IF NOT EXISTS idx_hutube_watch_time_video ON hutube_video_watch_time(video_id);
CREATE INDEX IF NOT EXISTS idx_hutube_watch_time_user ON hutube_video_watch_time(user_id);

CREATE INDEX IF NOT EXISTS idx_hutube_metrics_score ON hutube_feed_metrics(engagement_score DESC);

CREATE INDEX IF NOT EXISTS idx_hutube_channel_interests ON hutube_channel_interests(channel_id);
CREATE INDEX IF NOT EXISTS idx_hutube_interest_category ON hutube_channel_interests(interest);

CREATE INDEX IF NOT EXISTS idx_hutube_discovery_user ON hutube_discovery_injections(user_id);
CREATE INDEX IF NOT EXISTS idx_hutube_discovery_video ON hutube_discovery_injections(video_id);
CREATE INDEX IF NOT EXISTS idx_hutube_discovery_date ON hutube_discovery_injections(shown_at);
