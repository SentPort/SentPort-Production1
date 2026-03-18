/*
  # Create Platform Membership Tracking System

  ## Overview
  Creates a comprehensive system to track which social media platforms each user has joined,
  enabling the dashboard to show only platforms the user has accounts on with a "X/6" counter.

  ## New Functions

  ### 1. get_user_platform_memberships(user_uuid)
  Returns all platforms a user has joined by checking account tables
  - Returns: table of platform names (text)
  - Checks: heddit_accounts, hubook_profiles, hutube_channels, hinsta_accounts, switter_accounts, blog_accounts

  ### 2. count_user_platforms(user_uuid)
  Returns the total number of platforms a user has joined
  - Returns: integer count (0-6)

  ## Platform Mapping
  - heddit → heddit_accounts
  - hubook → hubook_profiles
  - hutube → hutube_channels
  - hinsta → hinsta_accounts
  - switter → switter_accounts
  - hublog → blog_accounts

  ## Usage Examples
  ```sql
  -- Get all platforms for a user
  SELECT * FROM get_user_platform_memberships('user-uuid-here');

  -- Get count of platforms
  SELECT count_user_platforms('user-uuid-here');
  ```

  ## Security
  - Functions use SECURITY DEFINER to bypass RLS
  - Only returns data for the requesting user (auth.uid() check)
  - No sensitive data exposed, only platform membership status
*/

-- ============================================================================
-- FUNCTION: Get User Platform Memberships
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

  -- Check HuBook
  SELECT 
    'hubook'::text as platform,
    'HuBook'::text as display_name,
    'bg-blue-600'::text as icon_color,
    '/hubook'::text as route,
    hp.created_at as joined_at
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

-- ============================================================================
-- FUNCTION: Count User Platforms
-- ============================================================================

CREATE OR REPLACE FUNCTION count_user_platforms(user_uuid uuid)
RETURNS integer
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  platform_count integer;
BEGIN
  -- Only allow users to check their own count
  IF user_uuid != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: You can only check your own platform count';
  END IF;

  SELECT COUNT(*) INTO platform_count
  FROM get_user_platform_memberships(user_uuid);

  RETURN COALESCE(platform_count, 0);
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Allow authenticated users to call these functions
GRANT EXECUTE ON FUNCTION get_user_platform_memberships(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION count_user_platforms(uuid) TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION get_user_platform_memberships(uuid) IS 
  'Returns all social media platforms a user has joined with display information';

COMMENT ON FUNCTION count_user_platforms(uuid) IS 
  'Returns the total count of platforms a user has joined (0-6)';
