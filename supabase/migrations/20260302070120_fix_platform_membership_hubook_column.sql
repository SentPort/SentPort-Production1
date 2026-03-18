/*
  # Fix Platform Membership Function - HuBook Column Error

  ## Problem
  The `get_user_platform_memberships()` function was broken and throwing SQL errors.
  It was trying to query `hubook_profiles.created_at` which doesn't exist.
  The correct column name is `hubook_profiles.joined_at`.

  ## Fix
  Replace the broken function with the corrected version that uses the proper column name.

  ## Impact
  This fixes the dashboard "Your Platforms" section which was showing empty for all users.
  After this fix, users will see all platforms they've joined (Heddit, Hinsta, HuBook, etc).
*/

-- ============================================================================
-- FUNCTION: Get User Platform Memberships (FIXED)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_platform_memberships(user_uuid uuid)
RETURNS TABLE (
  platform text,
  display_name text,
  icon_color text,
  route text,
  joined_at timestamptz
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only allow users to check their own memberships
  IF user_uuid != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: You can only check your own platform memberships';
  END IF;

  RETURN QUERY
  -- Check Heddit
  SELECT 
    'heddit'::text as platform,
    'Heddit'::text as display_name,
    'bg-orange-600'::text as icon_color,
    '/heddit'::text as route,
    ha.created_at as joined_at
  FROM heddit_accounts ha
  WHERE ha.user_id = user_uuid

  UNION ALL

  -- Check HuBook (FIXED: changed from hp.created_at to hp.joined_at)
  SELECT 
    'hubook'::text as platform,
    'HuBook'::text as display_name,
    'bg-blue-600'::text as icon_color,
    '/hubook'::text as route,
    hp.joined_at as joined_at
  FROM hubook_profiles hp
  WHERE hp.id = user_uuid

  UNION ALL

  -- Check HuTube
  SELECT 
    'hutube'::text as platform,
    'HuTube'::text as display_name,
    'bg-red-600'::text as icon_color,
    '/hutube'::text as route,
    hc.created_at as joined_at
  FROM hutube_channels hc
  WHERE hc.user_id = user_uuid

  UNION ALL

  -- Check Hinsta
  SELECT 
    'hinsta'::text as platform,
    'Hinsta'::text as display_name,
    'bg-pink-600'::text as icon_color,
    '/hinsta'::text as route,
    hi.created_at as joined_at
  FROM hinsta_accounts hi
  WHERE hi.user_id = user_uuid

  UNION ALL

  -- Check Switter
  SELECT 
    'switter'::text as platform,
    'Switter'::text as display_name,
    'bg-yellow-500'::text as icon_color,
    '/switter'::text as route,
    sa.created_at as joined_at
  FROM switter_accounts sa
  WHERE sa.user_id = user_uuid

  UNION ALL

  -- Check HuBlog (Blog)
  SELECT 
    'hublog'::text as platform,
    'HuBlog'::text as display_name,
    'bg-green-600'::text as icon_color,
    '/blog'::text as route,
    ba.created_at as joined_at
  FROM blog_accounts ba
  WHERE ba.id = user_uuid

  ORDER BY joined_at ASC;
END;
$$;