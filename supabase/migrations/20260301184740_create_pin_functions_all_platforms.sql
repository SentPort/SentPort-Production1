/*
  # Create Pin/Unpin Functions for All Social Media Platforms

  1. Functions Created
    - `pin_heddit_post`: Pin or unpin a Heddit post (max 5 pinned)
    - `pin_hubook_post`: Pin or unpin a HuBook post (max 5 pinned)
    - `pin_hutube_video`: Pin or unpin a HuTube video (max 5 pinned)
    - `pin_hinsta_post`: Pin or unpin a Hinsta post (max 5 pinned)
    - `pin_switter_tweet`: Pin or unpin a Switter tweet (max 5 pinned)

  2. Security
    - All functions check if the user is an admin before allowing pin operations
    - Functions enforce a maximum of 5 pinned items per platform
    - Functions set pinned_by to the current admin user ID

  3. Important Notes
    - When pinning, the function sets is_pinned=true, pinned_at=now(), and pinned_by=current_user
    - When unpinning, the function sets is_pinned=false and clears pinned_at and pinned_by
    - Attempting to pin more than 5 items returns an error message
*/

-- Function to pin/unpin Heddit posts
CREATE OR REPLACE FUNCTION pin_heddit_post(post_id uuid, should_pin boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pinned_count integer;
  is_admin boolean;
BEGIN
  -- Check if user is admin
  SELECT admin INTO is_admin FROM user_profiles WHERE user_id = auth.uid();
  
  IF NOT is_admin THEN
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
CREATE OR REPLACE FUNCTION pin_hubook_post(post_id uuid, should_pin boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pinned_count integer;
  is_admin boolean;
BEGIN
  -- Check if user is admin
  SELECT admin INTO is_admin FROM user_profiles WHERE user_id = auth.uid();
  
  IF NOT is_admin THEN
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
CREATE OR REPLACE FUNCTION pin_hutube_video(video_id uuid, should_pin boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pinned_count integer;
  is_admin boolean;
BEGIN
  -- Check if user is admin
  SELECT admin INTO is_admin FROM user_profiles WHERE user_id = auth.uid();
  
  IF NOT is_admin THEN
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
CREATE OR REPLACE FUNCTION pin_hinsta_post(post_id uuid, should_pin boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pinned_count integer;
  is_admin boolean;
BEGIN
  -- Check if user is admin
  SELECT admin INTO is_admin FROM user_profiles WHERE user_id = auth.uid();
  
  IF NOT is_admin THEN
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
CREATE OR REPLACE FUNCTION pin_switter_tweet(tweet_id uuid, should_pin boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pinned_count integer;
  is_admin boolean;
BEGIN
  -- Check if user is admin
  SELECT admin INTO is_admin FROM user_profiles WHERE user_id = auth.uid();
  
  IF NOT is_admin THEN
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