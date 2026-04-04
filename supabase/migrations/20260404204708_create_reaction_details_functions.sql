/*
  # Create Reaction Details Functions

  1. Purpose
    - Provide functions to fetch detailed reaction information with user profiles
    - Support clickable reaction counts showing who reacted and what reaction they gave
    - Works for posts, comments, and album media

  2. Functions Created
    - get_post_reactions_with_users(p_target_id uuid, p_target_type text)
      Returns reactions for posts or comments with user details
    - get_media_reactions_with_users(p_media_id uuid)
      Returns reactions for album media with user details

  3. Return Format
    Each function returns JSONB array with:
    - reaction_type: Type of reaction (like, love, laugh, etc.)
    - user_id: ID of user who reacted
    - display_name: Display name of user
    - profile_photo_url: Profile photo URL
    - created_at: When the reaction was created
*/

-- Function to get post/comment reactions with user details
CREATE OR REPLACE FUNCTION get_post_reactions_with_users(
  p_target_id uuid,
  p_target_type text DEFAULT 'post'
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'reaction_type', r.reaction_type,
        'user_id', r.user_id,
        'display_name', COALESCE(hp.display_name, 'Unknown User'),
        'profile_photo_url', hp.profile_photo_url,
        'created_at', r.created_at
      )
      ORDER BY r.reaction_type, r.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM reactions r
  LEFT JOIN hubook_profiles hp ON hp.id = r.user_id
  WHERE r.target_id = p_target_id
    AND r.target_type = p_target_type;

  RETURN v_result;
END;
$$;

-- Function to get album media reactions with user details
CREATE OR REPLACE FUNCTION get_media_reactions_with_users(
  p_media_id uuid
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'reaction_type', amr.reaction_type,
        'user_id', amr.user_id,
        'display_name', COALESCE(hp.display_name, 'Unknown User'),
        'profile_photo_url', hp.profile_photo_url,
        'created_at', amr.created_at
      )
      ORDER BY amr.reaction_type, amr.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM album_media_reactions amr
  LEFT JOIN hubook_profiles hp ON hp.id = amr.user_id
  WHERE amr.media_id = p_media_id;

  RETURN v_result;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_post_reactions_with_users(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_media_reactions_with_users(uuid) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION get_post_reactions_with_users IS 'Fetches all reactions for a post or comment with user profile details';
COMMENT ON FUNCTION get_media_reactions_with_users IS 'Fetches all reactions for album media with user profile details';
