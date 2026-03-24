/*
  # Fix Pin Functions - Correct Column References

  1. Changes
    - Fix all pin functions to use `is_admin` instead of `admin`
    - Fix all pin functions to use `id` instead of `user_id` for user_profiles lookup
    - This fixes the "column admin does not exist" error

  2. Functions Fixed
    - `pin_heddit_post`
    - `pin_hubook_post`
    - `pin_hutube_video`
    - `pin_hinsta_post`
    - `pin_switter_tweet`

  3. Security
    - Maintains admin-only access control
    - Maintains 5-pin limit per platform
*/

-- Drop existing functions
DROP FUNCTION IF EXISTS pin_heddit_post(uuid, boolean);
DROP FUNCTION IF EXISTS pin_hubook_post(uuid, boolean);
DROP FUNCTION IF EXISTS pin_hutube_video(uuid, boolean);
DROP FUNCTION IF EXISTS pin_hinsta_post(uuid, boolean);
DROP FUNCTION IF EXISTS pin_switter_tweet(uuid, boolean);

-- Function to pin/unpin Heddit posts
CREATE FUNCTION pin_heddit_post(post_id uuid, should_pin boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pinned_count integer;
  is_admin boolean;
BEGIN
  -- Check if user is admin (fixed: use is_admin column and id primary key)
  SELECT user_profiles.is_admin INTO is_admin 
  FROM user_profiles 
  WHERE user_profiles.id = auth.uid();
  
  IF NOT COALESCE(is_admin, false) THEN
    RAISE EXCEPTION 'Only admins can pin posts';
  END IF;

  IF should_pin THEN
    -- Check current pinned count
    SELECT COUNT(*) INTO pinned_count
    FROM heddit_posts
    WHERE is_pinned = true;

    IF pinned_count >= 5 THEN
      RAISE EXCEPTION 'Maximum of 5 posts can be pinned at once';
    END IF;

    -- Pin the post
    UPDATE heddit_posts
    SET is_pinned = true,
        pinned_at = now(),
        pinned_by = auth.uid()
    WHERE id = post_id;
  ELSE
    -- Unpin the post
    UPDATE heddit_posts
    SET is_pinned = false,
        pinned_at = NULL,
        pinned_by = NULL
    WHERE id = post_id;
  END IF;
END;
$$;

-- Function to pin/unpin HuBook posts
CREATE FUNCTION pin_hubook_post(post_id uuid, should_pin boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pinned_count integer;
  is_admin boolean;
BEGIN
  -- Check if user is admin (fixed: use is_admin column and id primary key)
  SELECT user_profiles.is_admin INTO is_admin 
  FROM user_profiles 
  WHERE user_profiles.id = auth.uid();
  
  IF NOT COALESCE(is_admin, false) THEN
    RAISE EXCEPTION 'Only admins can pin posts';
  END IF;

  IF should_pin THEN
    -- Check current pinned count
    SELECT COUNT(*) INTO pinned_count
    FROM posts
    WHERE is_pinned = true;

    IF pinned_count >= 5 THEN
      RAISE EXCEPTION 'Maximum of 5 posts can be pinned at once';
    END IF;

    -- Pin the post
    UPDATE posts
    SET is_pinned = true,
        pinned_at = now(),
        pinned_by = auth.uid()
    WHERE id = post_id;
  ELSE
    -- Unpin the post
    UPDATE posts
    SET is_pinned = false,
        pinned_at = NULL,
        pinned_by = NULL
    WHERE id = post_id;
  END IF;
END;
$$;

-- Function to pin/unpin HuTube videos
CREATE FUNCTION pin_hutube_video(video_id uuid, should_pin boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pinned_count integer;
  is_admin boolean;
BEGIN
  -- Check if user is admin (fixed: use is_admin column and id primary key)
  SELECT user_profiles.is_admin INTO is_admin 
  FROM user_profiles 
  WHERE user_profiles.id = auth.uid();
  
  IF NOT COALESCE(is_admin, false) THEN
    RAISE EXCEPTION 'Only admins can pin videos';
  END IF;

  IF should_pin THEN
    -- Check current pinned count
    SELECT COUNT(*) INTO pinned_count
    FROM hutube_videos
    WHERE is_pinned = true;

    IF pinned_count >= 5 THEN
      RAISE EXCEPTION 'Maximum of 5 videos can be pinned at once';
    END IF;

    -- Pin the video
    UPDATE hutube_videos
    SET is_pinned = true,
        pinned_at = now(),
        pinned_by = auth.uid()
    WHERE id = video_id;
  ELSE
    -- Unpin the video
    UPDATE hutube_videos
    SET is_pinned = false,
        pinned_at = NULL,
        pinned_by = NULL
    WHERE id = video_id;
  END IF;
END;
$$;

-- Function to pin/unpin Hinsta posts
CREATE FUNCTION pin_hinsta_post(post_id uuid, should_pin boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pinned_count integer;
  is_admin boolean;
BEGIN
  -- Check if user is admin (fixed: use is_admin column and id primary key)
  SELECT user_profiles.is_admin INTO is_admin 
  FROM user_profiles 
  WHERE user_profiles.id = auth.uid();
  
  IF NOT COALESCE(is_admin, false) THEN
    RAISE EXCEPTION 'Only admins can pin posts';
  END IF;

  IF should_pin THEN
    -- Check current pinned count
    SELECT COUNT(*) INTO pinned_count
    FROM hinsta_posts
    WHERE is_pinned = true;

    IF pinned_count >= 5 THEN
      RAISE EXCEPTION 'Maximum of 5 posts can be pinned at once';
    END IF;

    -- Pin the post
    UPDATE hinsta_posts
    SET is_pinned = true,
        pinned_at = now(),
        pinned_by = auth.uid()
    WHERE id = post_id;
  ELSE
    -- Unpin the post
    UPDATE hinsta_posts
    SET is_pinned = false,
        pinned_at = NULL,
        pinned_by = NULL
    WHERE id = post_id;
  END IF;
END;
$$;

-- Function to pin/unpin Switter tweets
CREATE FUNCTION pin_switter_tweet(tweet_id uuid, should_pin boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pinned_count integer;
  is_admin boolean;
BEGIN
  -- Check if user is admin (fixed: use is_admin column and id primary key)
  SELECT user_profiles.is_admin INTO is_admin 
  FROM user_profiles 
  WHERE user_profiles.id = auth.uid();
  
  IF NOT COALESCE(is_admin, false) THEN
    RAISE EXCEPTION 'Only admins can pin tweets';
  END IF;

  IF should_pin THEN
    -- Check current pinned count
    SELECT COUNT(*) INTO pinned_count
    FROM switter_tweets
    WHERE is_pinned = true;

    IF pinned_count >= 5 THEN
      RAISE EXCEPTION 'Maximum of 5 tweets can be pinned at once';
    END IF;

    -- Pin the tweet
    UPDATE switter_tweets
    SET is_pinned = true,
        pinned_at = now(),
        pinned_by = auth.uid()
    WHERE id = tweet_id;
  ELSE
    -- Unpin the tweet
    UPDATE switter_tweets
    SET is_pinned = false,
        pinned_at = NULL,
        pinned_by = NULL
    WHERE id = tweet_id;
  END IF;
END;
$$;