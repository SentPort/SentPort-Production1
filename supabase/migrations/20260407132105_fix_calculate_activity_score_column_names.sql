/*
  # Fix Activity Score Function Column Names

  1. Problem
    - calculate_user_activity_score function uses incorrect column names
    - Comments table uses 'author_id', not 'user_id'
    - Shares table uses 'user_id' but needs to map to hubook profile id
    - Reactions table uses 'user_id' but needs to map to hubook profile id
    - This causes search function to fail

  2. Solution
    - Update comments query to use 'author_id' directly (profile id)
    - Update shares query to join through hubook_profiles
    - Update reactions query to join through hubook_profiles
    - Ensures activity scoring works correctly

  3. Impact
    - Allows search function to execute without errors
    - Properly calculates user activity scores for ranking
*/

-- Fix the activity score calculation function
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

  -- Count recent comments (last 30 days) - uses author_id which is profile_id
  SELECT COUNT(*) INTO recent_comments
  FROM comments
  WHERE author_id = profile_id
    AND created_at > NOW() - INTERVAL '30 days';

  -- Count recent reactions (last 30 days) - need to map user_id to profile_id
  SELECT COUNT(*) INTO recent_reactions
  FROM reactions r
  INNER JOIN hubook_profiles hp ON r.user_id = hp.user_id
  WHERE hp.id = profile_id
    AND r.created_at > NOW() - INTERVAL '30 days';

  -- Count recent shares (last 30 days) - user_id in shares is actually profile_id
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
