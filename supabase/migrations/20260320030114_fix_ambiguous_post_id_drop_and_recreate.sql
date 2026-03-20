/*
  # Fix Ambiguous Column Reference in Delete Function

  1. Changes
    - Drop the old function with ambiguous parameter name
    - Recreate with `p_post_id` parameter to avoid ambiguity
    - Update all references to use the new parameter name
    - This prevents "column reference 'post_id' is ambiguous" errors

  2. Purpose
    - Make the delete function work without ambiguity errors
    - Use clear parameter naming convention (p_ prefix for parameters)
*/

-- Drop the old function
DROP FUNCTION IF EXISTS delete_blog_post_with_cascade(UUID);

-- Recreate with non-ambiguous parameter name
CREATE FUNCTION delete_blog_post_with_cascade(p_post_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_post_author UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  -- Check if user is admin
  SELECT is_admin INTO v_is_admin
  FROM user_profiles
  WHERE id = v_user_id;

  -- Get post author
  SELECT account_id INTO v_post_author
  FROM blog_posts
  WHERE id = p_post_id;

  -- Check if post exists
  IF v_post_author IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Post not found'
    );
  END IF;

  -- Check if user has permission (owner or admin)
  IF v_post_author != v_user_id AND NOT COALESCE(v_is_admin, false) THEN
    -- Check if user is a coauthor
    IF NOT EXISTS (
      SELECT 1 FROM blog_post_authors
      WHERE post_id = p_post_id
      AND author_id = v_user_id
    ) THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Permission denied'
      );
    END IF;
  END IF;

  -- Delete all child records manually (in correct order)
  -- This bypasses RLS cascade issues
  
  DELETE FROM blog_comments WHERE post_id = p_post_id;
  DELETE FROM blog_reactions WHERE post_id = p_post_id;
  DELETE FROM blog_bookmarks WHERE post_id = p_post_id;
  DELETE FROM blog_notifications WHERE post_id = p_post_id;
  DELETE FROM blog_reading_progress WHERE post_id = p_post_id;
  DELETE FROM blog_collaboration_proposals WHERE post_id = p_post_id;
  DELETE FROM blog_collaboration_invites WHERE post_id = p_post_id;
  DELETE FROM blog_collaboration_sessions WHERE post_id = p_post_id;
  DELETE FROM blog_collection_items WHERE post_id = p_post_id;
  DELETE FROM blog_pinned_posts WHERE post_id = p_post_id;
  DELETE FROM blog_feed_metrics WHERE post_id = p_post_id;
  DELETE FROM blog_engagement_metrics WHERE post_id = p_post_id;
  DELETE FROM blog_post_authors WHERE post_id = p_post_id;
  DELETE FROM blog_post_tags WHERE post_id = p_post_id;
  DELETE FROM blog_link_collections WHERE post_id = p_post_id;
  DELETE FROM blog_views WHERE post_id = p_post_id;

  -- Finally delete the post itself
  DELETE FROM blog_posts WHERE id = p_post_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Post deleted successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_blog_post_with_cascade(UUID) TO authenticated;
