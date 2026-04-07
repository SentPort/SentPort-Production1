/*
  # Fix HuBook Search Type Mismatch

  1. Problem
    - The search_hubook_users_tiered function has a type mismatch error
    - Return type declares match_score as numeric
    - CASE statements return integer literals (100, 80, 60, 40, 20)
    - PostgreSQL throws error: "Returned type integer does not match expected type numeric"
    - This causes all searches to fail completely with zero results

  2. Solution
    - Cast all integer match scores to numeric type
    - Ensures type consistency between return type and actual values
    - Allows search function to execute successfully

  3. Impact
    - Fixes completely broken user search functionality
    - Users can now search for other users by name, work, or location
    - Properly returns results in tiered order (friends, FOF, public)
*/

-- Drop and recreate the search function with type-corrected match scores
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
        WHEN LOWER(hp.display_name) LIKE LOWER(search_query) || '%' THEN 100::numeric
        -- Word start match
        WHEN LOWER(hp.display_name) LIKE '% ' || LOWER(search_query) || '%' THEN 80::numeric
        -- Contains match
        WHEN LOWER(hp.display_name) LIKE search_pattern THEN 60::numeric
        -- Work/location match
        WHEN LOWER(COALESCE(hp.work, '')) LIKE search_pattern
          OR LOWER(COALESCE(hp.location, '')) LIKE search_pattern THEN 40::numeric
        ELSE 20::numeric
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
        WHEN LOWER(hp.display_name) LIKE LOWER(search_query) || '%' THEN 100::numeric
        WHEN LOWER(hp.display_name) LIKE '% ' || LOWER(search_query) || '%' THEN 80::numeric
        WHEN LOWER(hp.display_name) LIKE search_pattern THEN 60::numeric
        WHEN LOWER(COALESCE(hp.work, '')) LIKE search_pattern
          OR LOWER(COALESCE(hp.location, '')) LIKE search_pattern THEN 40::numeric
        ELSE 20::numeric
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
        WHEN LOWER(hp.display_name) LIKE LOWER(search_query) || '%' THEN 100::numeric
        WHEN LOWER(hp.display_name) LIKE '% ' || LOWER(search_query) || '%' THEN 80::numeric
        WHEN LOWER(hp.display_name) LIKE search_pattern THEN 60::numeric
        WHEN LOWER(COALESCE(hp.work, '')) LIKE search_pattern
          OR LOWER(COALESCE(hp.location, '')) LIKE search_pattern THEN 40::numeric
        ELSE 20::numeric
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
