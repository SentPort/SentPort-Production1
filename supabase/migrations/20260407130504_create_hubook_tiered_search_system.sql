/*
  # Create HuBook Tiered Search System

  1. New Features
    - Tiered user search prioritizing friends, then friends-of-friends, then public profiles
    - Activity scoring for ranking users by recent engagement
    - Trigram indexes for fuzzy name matching
    - Mutual friend counting
    - Privacy and blocking enforcement

  2. New Functions
    - `calculate_user_activity_score()` - Calculates recent activity score
    - `get_mutual_friend_count()` - Counts mutual friends between users
    - `search_hubook_users_tiered()` - Main tiered search function

  3. Performance
    - Trigram GIN indexes on display_name
    - Composite indexes for activity sorting
    - Optimized CTEs for friends-of-friends queries
*/

-- Enable pg_trgm extension for fuzzy text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add index for trigram similarity search on display names
CREATE INDEX IF NOT EXISTS idx_hubook_profiles_display_name_trgm
  ON hubook_profiles USING GIN (display_name gin_trgm_ops);

-- Add composite index for activity-based sorting
CREATE INDEX IF NOT EXISTS idx_hubook_profiles_updated_at
  ON hubook_profiles(updated_at DESC);

-- Add index for faster friendship queries
CREATE INDEX IF NOT EXISTS idx_friendships_status_requester
  ON friendships(status, requester_id) WHERE status = 'accepted';

CREATE INDEX IF NOT EXISTS idx_friendships_status_addressee
  ON friendships(status, addressee_id) WHERE status = 'accepted';

-- Function to calculate user activity score based on recent engagement
CREATE OR REPLACE FUNCTION calculate_user_activity_score(profile_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  activity_score numeric := 0;
  recent_posts integer;
  recent_comments integer;
  recent_reactions integer;
  recent_shares integer;
  days_since_update numeric;
BEGIN
  -- Count recent posts (last 30 days)
  SELECT COUNT(*) INTO recent_posts
  FROM posts
  WHERE author_id = profile_id
    AND created_at > NOW() - INTERVAL '30 days'
    AND status = 'active';

  -- Count recent comments (last 30 days)
  SELECT COUNT(*) INTO recent_comments
  FROM comments
  WHERE user_id IN (SELECT user_id FROM hubook_profiles WHERE id = profile_id)
    AND created_at > NOW() - INTERVAL '30 days';

  -- Count recent reactions (last 30 days)
  SELECT COUNT(*) INTO recent_reactions
  FROM reactions
  WHERE user_id IN (SELECT user_id FROM hubook_profiles WHERE id = profile_id)
    AND created_at > NOW() - INTERVAL '30 days';

  -- Count recent shares (last 30 days)
  SELECT COUNT(*) INTO recent_shares
  FROM shares
  WHERE user_id = profile_id
    AND created_at > NOW() - INTERVAL '30 days';

  -- Calculate days since profile update (decay factor)
  SELECT EXTRACT(EPOCH FROM (NOW() - updated_at)) / 86400 INTO days_since_update
  FROM hubook_profiles
  WHERE id = profile_id;

  -- Calculate weighted activity score
  activity_score := (
    (recent_posts * 10) +           -- Posts weighted heavily
    (recent_comments * 3) +          -- Comments moderately weighted
    (recent_reactions * 1) +         -- Reactions lightly weighted
    (recent_shares * 5)              -- Shares weighted moderately
  ) / (1 + (days_since_update / 7)); -- Decay over weeks

  RETURN COALESCE(activity_score, 0);
END;
$$;

-- Function to count mutual friends between two users
CREATE OR REPLACE FUNCTION get_mutual_friend_count(user_a_id uuid, user_b_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  mutual_count integer := 0;
BEGIN
  -- Get friends of user A
  WITH user_a_friends AS (
    SELECT CASE
      WHEN requester_id = user_a_id THEN addressee_id
      ELSE requester_id
    END AS friend_id
    FROM friendships
    WHERE status = 'accepted'
      AND (requester_id = user_a_id OR addressee_id = user_a_id)
  ),
  -- Get friends of user B
  user_b_friends AS (
    SELECT CASE
      WHEN requester_id = user_b_id THEN addressee_id
      ELSE requester_id
    END AS friend_id
    FROM friendships
    WHERE status = 'accepted'
      AND (requester_id = user_b_id OR addressee_id = user_b_id)
  )
  -- Count mutual friends
  SELECT COUNT(*) INTO mutual_count
  FROM user_a_friends
  INNER JOIN user_b_friends ON user_a_friends.friend_id = user_b_friends.friend_id;

  RETURN mutual_count;
END;
$$;

-- Main tiered search function
CREATE OR REPLACE FUNCTION search_hubook_users_tiered(
  search_query text,
  current_user_id uuid,
  result_limit integer DEFAULT 50
)
RETURNS TABLE (
  profile_id uuid,
  user_id uuid,
  display_name text,
  profile_photo_url text,
  work text,
  location text,
  bio text,
  tier integer,
  mutual_friends_count integer,
  activity_score numeric,
  match_score numeric
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  current_profile_id uuid;
  search_pattern text;
BEGIN
  -- Get current user's hubook profile id
  SELECT id INTO current_profile_id
  FROM hubook_profiles
  WHERE hubook_profiles.user_id = current_user_id;

  -- Return empty if no profile found
  IF current_profile_id IS NULL THEN
    RETURN;
  END IF;

  -- Prepare search pattern
  search_pattern := '%' || LOWER(search_query) || '%';

  RETURN QUERY
  WITH
  -- Get list of users who blocked current user or are blocked by current user
  blocked_users AS (
    SELECT blocked_id AS blocked_profile_id
    FROM hubook_blocked_users
    WHERE blocker_id = current_profile_id
    UNION
    SELECT blocker_id AS blocked_profile_id
    FROM hubook_blocked_users
    WHERE blocked_id = current_profile_id
  ),
  -- Tier 1: Direct friends
  direct_friends AS (
    SELECT
      hp.id,
      hp.user_id,
      hp.display_name,
      hp.profile_photo_url,
      hp.work,
      hp.location,
      hp.bio,
      1 AS tier,
      0 AS mutual_friends,
      calculate_user_activity_score(hp.id) AS activity,
      CASE
        -- Prefix match gets highest score
        WHEN LOWER(hp.display_name) LIKE LOWER(search_query) || '%' THEN 100
        -- Word start match
        WHEN LOWER(hp.display_name) LIKE '% ' || LOWER(search_query) || '%' THEN 80
        -- Contains match
        WHEN LOWER(hp.display_name) LIKE search_pattern THEN 60
        -- Work/location match
        WHEN LOWER(COALESCE(hp.work, '')) LIKE search_pattern
          OR LOWER(COALESCE(hp.location, '')) LIKE search_pattern THEN 40
        ELSE 20
      END AS match_score
    FROM hubook_profiles hp
    INNER JOIN friendships f ON (
      (f.requester_id = current_profile_id AND f.addressee_id = hp.id)
      OR (f.addressee_id = current_profile_id AND f.requester_id = hp.id)
    )
    WHERE f.status = 'accepted'
      AND hp.id != current_profile_id
      AND hp.id NOT IN (SELECT blocked_profile_id FROM blocked_users)
      AND (
        LOWER(hp.display_name) LIKE search_pattern
        OR LOWER(COALESCE(hp.work, '')) LIKE search_pattern
        OR LOWER(COALESCE(hp.location, '')) LIKE search_pattern
        OR LOWER(COALESCE(hp.bio, '')) LIKE search_pattern
      )
  ),
  -- Tier 2: Friends of friends
  friends_of_friends AS (
    SELECT
      hp.id,
      hp.user_id,
      hp.display_name,
      hp.profile_photo_url,
      hp.work,
      hp.location,
      hp.bio,
      2 AS tier,
      get_mutual_friend_count(current_profile_id, hp.id) AS mutual_friends,
      calculate_user_activity_score(hp.id) AS activity,
      CASE
        WHEN LOWER(hp.display_name) LIKE LOWER(search_query) || '%' THEN 100
        WHEN LOWER(hp.display_name) LIKE '% ' || LOWER(search_query) || '%' THEN 80
        WHEN LOWER(hp.display_name) LIKE search_pattern THEN 60
        WHEN LOWER(COALESCE(hp.work, '')) LIKE search_pattern
          OR LOWER(COALESCE(hp.location, '')) LIKE search_pattern THEN 40
        ELSE 20
      END AS match_score
    FROM hubook_profiles hp
    -- Get friends of my friends
    WHERE hp.id IN (
      SELECT DISTINCT CASE
        WHEN f2.requester_id IN (
          SELECT CASE WHEN f1.requester_id = current_profile_id THEN f1.addressee_id ELSE f1.requester_id END
          FROM friendships f1
          WHERE f1.status = 'accepted' AND (f1.requester_id = current_profile_id OR f1.addressee_id = current_profile_id)
        ) THEN f2.addressee_id
        ELSE f2.requester_id
      END AS friend_of_friend_id
      FROM friendships f2
      WHERE f2.status = 'accepted'
        AND (
          f2.requester_id IN (
            SELECT CASE WHEN f1.requester_id = current_profile_id THEN f1.addressee_id ELSE f1.requester_id END
            FROM friendships f1
            WHERE f1.status = 'accepted' AND (f1.requester_id = current_profile_id OR f1.addressee_id = current_profile_id)
          )
          OR f2.addressee_id IN (
            SELECT CASE WHEN f1.requester_id = current_profile_id THEN f1.addressee_id ELSE f1.requester_id END
            FROM friendships f1
            WHERE f1.status = 'accepted' AND (f1.requester_id = current_profile_id OR f1.addressee_id = current_profile_id)
          )
        )
    )
    AND hp.id != current_profile_id
    AND hp.id NOT IN (SELECT blocked_profile_id FROM blocked_users)
    AND hp.id NOT IN (SELECT id FROM direct_friends) -- Exclude already found friends
    AND (
      LOWER(hp.display_name) LIKE search_pattern
      OR LOWER(COALESCE(hp.work, '')) LIKE search_pattern
      OR LOWER(COALESCE(hp.location, '')) LIKE search_pattern
      OR LOWER(COALESCE(hp.bio, '')) LIKE search_pattern
    )
    LIMIT 50 -- Limit friends-of-friends to prevent huge result sets
  ),
  -- Tier 3: Public profiles
  public_profiles AS (
    SELECT
      hp.id,
      hp.user_id,
      hp.display_name,
      hp.profile_photo_url,
      hp.work,
      hp.location,
      hp.bio,
      3 AS tier,
      0 AS mutual_friends,
      calculate_user_activity_score(hp.id) AS activity,
      CASE
        WHEN LOWER(hp.display_name) LIKE LOWER(search_query) || '%' THEN 100
        WHEN LOWER(hp.display_name) LIKE '% ' || LOWER(search_query) || '%' THEN 80
        WHEN LOWER(hp.display_name) LIKE search_pattern THEN 60
        WHEN LOWER(COALESCE(hp.work, '')) LIKE search_pattern
          OR LOWER(COALESCE(hp.location, '')) LIKE search_pattern THEN 40
        ELSE 20
      END AS match_score
    FROM hubook_profiles hp
    LEFT JOIN user_privacy_settings ups ON hp.user_id = ups.user_id
    WHERE hp.id != current_profile_id
      AND hp.id NOT IN (SELECT blocked_profile_id FROM blocked_users)
      AND hp.id NOT IN (SELECT id FROM direct_friends)
      AND hp.id NOT IN (SELECT id FROM friends_of_friends)
      AND (COALESCE(ups.profile_visibility, 'public') = 'public') -- Only public profiles
      AND (
        LOWER(hp.display_name) LIKE search_pattern
        OR LOWER(COALESCE(hp.work, '')) LIKE search_pattern
        OR LOWER(COALESCE(hp.location, '')) LIKE search_pattern
        OR LOWER(COALESCE(hp.bio, '')) LIKE search_pattern
      )
    LIMIT 100 -- Limit public search to prevent huge result sets
  ),
  -- Combine all tiers
  all_results AS (
    SELECT * FROM direct_friends
    UNION ALL
    SELECT * FROM friends_of_friends
    UNION ALL
    SELECT * FROM public_profiles
  )
  -- Return sorted results
  SELECT
    ar.id,
    ar.user_id,
    ar.display_name,
    ar.profile_photo_url,
    ar.work,
    ar.location,
    ar.bio,
    ar.tier,
    ar.mutual_friends,
    ar.activity,
    ar.match_score
  FROM all_results ar
  ORDER BY
    ar.tier ASC,                    -- Friends first, then FOF, then public
    ar.match_score DESC,            -- Better matches first within tier
    ar.mutual_friends DESC,         -- More mutual friends first (for FOF)
    ar.activity DESC,               -- More active users first
    ar.display_name ASC             -- Alphabetical as final tiebreaker
  LIMIT result_limit;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_user_activity_score(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_mutual_friend_count(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION search_hubook_users_tiered(text, uuid, integer) TO authenticated;
