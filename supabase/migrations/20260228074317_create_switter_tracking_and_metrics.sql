/*
  # Create Switter Tracking and Metrics Schema

  ## Overview
  This migration creates tracking tables and engagement metrics for the Switter platform.
  It enables a "Top Sweets" feature that surfaces trending, high-quality tweets based on
  recent engagement velocity with strong time decay.

  ## New Tables

  ### 1. switter_tweet_views
  Tracks individual tweet impressions/views
  - `id` (uuid, primary key)
  - `tweet_id` (uuid, references switter_tweets)
  - `user_id` (uuid, references auth.users)
  - `viewed_at` (timestamptz)

  ### 2. switter_feed_metrics
  Stores calculated engagement scores for tweet ranking
  - `tweet_id` (uuid, primary key, references switter_tweets)
  - `total_views_30d` (integer) - Impressions in last 30 days
  - `total_engagements_30d` (integer) - Likes + comments + retweets in last 30 days
  - `total_likes_30d` (integer) - Likes in last 30 days
  - `total_dislikes_30d` (integer) - Dislikes in last 30 days
  - `total_replies_30d` (integer) - Replies in last 30 days
  - `total_retweets_30d` (integer) - Retweets in last 30 days
  - `view_velocity` (numeric) - Views per day
  - `engagement_velocity` (numeric) - Total engagements per day
  - `share_velocity` (numeric) - Retweets per day
  - `like_ratio` (numeric) - Likes / (likes + dislikes)
  - `reply_quality_score` (numeric) - Ratio of replies indicating discussion
  - `time_decay_factor` (numeric) - Exponential decay based on tweet age
  - `engagement_score` (numeric) - Final ranking score with time decay
  - `last_calculated` (timestamptz)

  ## Algorithm Philosophy

  Switter's "Top Sweets" algorithm prioritizes:
  - **Freshness**: Strong exponential decay after 48 hours (tweets are timely)
  - **Engagement depth**: Replies and retweets indicate meaningful content
  - **Positive reception**: Like ratio filters out controversial/negative content
  - **Viral potential**: Share velocity indicates spreading content

  Unlike HuBlog (long-form, evergreen) or HuTube (video, longer shelf life),
  Switter content is ephemeral and time-sensitive, hence the aggressive time decay.

  ## Security
  - Enable RLS on all new tables
  - Users can view all public metrics
  - Only authenticated users can create view events
  - System functions update metrics automatically

  ## Performance
  - Indexes on tweet_id, user_id, and timestamps for fast queries
  - Indexes on engagement_score for Top Sweets sorting
  - Index on time_decay_factor for time-sensitive queries
*/

-- ============================================================================
-- CREATE TRACKING TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS switter_tweet_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id uuid REFERENCES switter_tweets(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  viewed_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS switter_feed_metrics (
  tweet_id uuid PRIMARY KEY REFERENCES switter_tweets(id) ON DELETE CASCADE,
  total_views_30d integer DEFAULT 0,
  total_engagements_30d integer DEFAULT 0,
  total_likes_30d integer DEFAULT 0,
  total_dislikes_30d integer DEFAULT 0,
  total_replies_30d integer DEFAULT 0,
  total_retweets_30d integer DEFAULT 0,
  view_velocity numeric DEFAULT 0,
  engagement_velocity numeric DEFAULT 0,
  share_velocity numeric DEFAULT 0,
  like_ratio numeric DEFAULT 0,
  reply_quality_score numeric DEFAULT 0,
  time_decay_factor numeric DEFAULT 0,
  engagement_score numeric DEFAULT 0,
  last_calculated timestamptz DEFAULT now()
);

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

ALTER TABLE switter_tweet_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE switter_feed_metrics ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

CREATE POLICY "Anyone can view tweet views"
  ON switter_tweet_views FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can record tweet views"
  ON switter_tweet_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view tweet metrics"
  ON switter_feed_metrics FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_switter_views_tweet ON switter_tweet_views(tweet_id);
CREATE INDEX IF NOT EXISTS idx_switter_views_user ON switter_tweet_views(user_id);
CREATE INDEX IF NOT EXISTS idx_switter_views_date ON switter_tweet_views(viewed_at);

CREATE INDEX IF NOT EXISTS idx_switter_metrics_score ON switter_feed_metrics(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_switter_metrics_decay ON switter_feed_metrics(time_decay_factor DESC);
CREATE INDEX IF NOT EXISTS idx_switter_metrics_calculated ON switter_feed_metrics(last_calculated DESC);
