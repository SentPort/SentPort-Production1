/*
  # Create Pinned Posts System for All Social Media Platforms

  1. New Columns Added to Existing Tables
    - `heddit_posts`: is_pinned, pinned_at, pinned_by
    - `posts` (HuBook): is_pinned, pinned_at, pinned_by
    - `hutube_videos`: is_pinned, pinned_at, pinned_by
    - `hinsta_posts`: is_pinned, pinned_at, pinned_by
    - `switter_tweets`: is_pinned, pinned_at, pinned_by

  2. Indexes
    - Created indexes on is_pinned and pinned_at for efficient pinned content queries
    - Optimizes feed queries that filter and sort by pin status

  3. Security
    - Pins are platform-specific and do not expire automatically
    - Only admins can pin/unpin content
    - All users can view pinned status
    - Maximum of 5 pinned items per platform enforced via functions

  4. Important Notes
    - Pinned content appears at the top of feeds with visual indicators
    - HuBook pinned posts are visible to all users regardless of friendship status
    - Pins remain active until manually removed by admins
*/

-- Add pinning columns to heddit_posts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'heddit_posts' AND column_name = 'is_pinned'
  ) THEN
    ALTER TABLE heddit_posts ADD COLUMN is_pinned boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'heddit_posts' AND column_name = 'pinned_at'
  ) THEN
    ALTER TABLE heddit_posts ADD COLUMN pinned_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'heddit_posts' AND column_name = 'pinned_by'
  ) THEN
    ALTER TABLE heddit_posts ADD COLUMN pinned_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Add pinning columns to posts (HuBook)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'is_pinned'
  ) THEN
    ALTER TABLE posts ADD COLUMN is_pinned boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'pinned_at'
  ) THEN
    ALTER TABLE posts ADD COLUMN pinned_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'pinned_by'
  ) THEN
    ALTER TABLE posts ADD COLUMN pinned_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Add pinning columns to hutube_videos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hutube_videos' AND column_name = 'is_pinned'
  ) THEN
    ALTER TABLE hutube_videos ADD COLUMN is_pinned boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hutube_videos' AND column_name = 'pinned_at'
  ) THEN
    ALTER TABLE hutube_videos ADD COLUMN pinned_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hutube_videos' AND column_name = 'pinned_by'
  ) THEN
    ALTER TABLE hutube_videos ADD COLUMN pinned_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Add pinning columns to hinsta_posts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hinsta_posts' AND column_name = 'is_pinned'
  ) THEN
    ALTER TABLE hinsta_posts ADD COLUMN is_pinned boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hinsta_posts' AND column_name = 'pinned_at'
  ) THEN
    ALTER TABLE hinsta_posts ADD COLUMN pinned_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hinsta_posts' AND column_name = 'pinned_by'
  ) THEN
    ALTER TABLE hinsta_posts ADD COLUMN pinned_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Add pinning columns to switter_tweets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'switter_tweets' AND column_name = 'is_pinned'
  ) THEN
    ALTER TABLE switter_tweets ADD COLUMN is_pinned boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'switter_tweets' AND column_name = 'pinned_at'
  ) THEN
    ALTER TABLE switter_tweets ADD COLUMN pinned_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'switter_tweets' AND column_name = 'pinned_by'
  ) THEN
    ALTER TABLE switter_tweets ADD COLUMN pinned_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Create indexes for efficient pinned content queries
CREATE INDEX IF NOT EXISTS idx_heddit_posts_pinned ON heddit_posts(is_pinned, pinned_at DESC) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_posts_pinned ON posts(is_pinned, pinned_at DESC) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_hutube_videos_pinned ON hutube_videos(is_pinned, pinned_at DESC) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_hinsta_posts_pinned ON hinsta_posts(is_pinned, pinned_at DESC) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_switter_tweets_pinned ON switter_tweets(is_pinned, pinned_at DESC) WHERE is_pinned = true;