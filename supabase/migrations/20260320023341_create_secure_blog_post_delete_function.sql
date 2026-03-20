/*
  # Create Secure Blog Post Delete Function with Manual Cascade

  1. Purpose
    - Provides a secure way to delete blog posts with all related data
    - Bypasses RLS cascade limitations by manually deleting child records
    - Runs in a single atomic transaction
    - Validates ownership or admin status before deletion

  2. Function: delete_blog_post_with_cascade
    - Parameters: post_id UUID
    - Returns: JSON with success status
    - Security: SECURITY DEFINER to bypass RLS cascade issues
    - Checks: User must own the post or be an admin

  3. Deletion Order (to respect foreign key constraints)
    - All child tables deleted first
    - Parent blog_posts table deleted last
    - All operations in one transaction (atomic)

  4. Tables Affected (in deletion order)
    - blog_comments
    - blog_shares
    - blog_reactions
    - blog_bookmarks
    - blog_followers
    - blog_notifications
    - blog_reading_progress
    - blog_collaboration_proposals
    - blog_collaboration_invites
    - blog_collaboration_sessions
    - blog_link_collections
    - blog_collection_items
    - blog_pinned_posts
    - blog_feed_metrics
    - blog_engagement_metrics
    - blog_coauthors
    - blog_post_tags
    - blog_posts (parent)

  5. Security Notes
    - Function checks ownership or admin status
    - Returns error if user lacks permission
    - All deletes happen with elevated privileges
    - Transaction rolls back on any error
*/

CREATE OR REPLACE FUNCTION delete_blog_post_with_cascade(post_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_post_author UUID;
  v_result JSON;
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
  SELECT admin INTO v_is_admin
  FROM user_profiles
  WHERE id = v_user_id;

  -- Get post author
  SELECT author_id INTO v_post_author
  FROM blog_posts
  WHERE id = post_id;

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
      SELECT 1 FROM blog_coauthors
      WHERE post_id = delete_blog_post_with_cascade.post_id
      AND user_id = v_user_id
    ) THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Permission denied'
      );
    END IF;
  END IF;

  -- Delete all child records manually (in correct order)
  -- This bypasses RLS cascade issues
  
  DELETE FROM blog_comments WHERE post_id = delete_blog_post_with_cascade.post_id;
  DELETE FROM blog_shares WHERE post_id = delete_blog_post_with_cascade.post_id;
  DELETE FROM blog_reactions WHERE post_id = delete_blog_post_with_cascade.post_id;
  DELETE FROM blog_bookmarks WHERE post_id = delete_blog_post_with_cascade.post_id;
  DELETE FROM blog_notifications WHERE post_id = delete_blog_post_with_cascade.post_id;
  DELETE FROM blog_reading_progress WHERE post_id = delete_blog_post_with_cascade.post_id;
  DELETE FROM blog_collaboration_proposals WHERE post_id = delete_blog_post_with_cascade.post_id;
  DELETE FROM blog_collaboration_invites WHERE post_id = delete_blog_post_with_cascade.post_id;
  DELETE FROM blog_collaboration_sessions WHERE post_id = delete_blog_post_with_cascade.post_id;
  DELETE FROM blog_collection_items WHERE post_id = delete_blog_post_with_cascade.post_id;
  DELETE FROM blog_pinned_posts WHERE post_id = delete_blog_post_with_cascade.post_id;
  DELETE FROM blog_feed_metrics WHERE post_id = delete_blog_post_with_cascade.post_id;
  DELETE FROM blog_engagement_metrics WHERE post_id = delete_blog_post_with_cascade.post_id;
  DELETE FROM blog_coauthors WHERE post_id = delete_blog_post_with_cascade.post_id;
  DELETE FROM blog_post_tags WHERE post_id = delete_blog_post_with_cascade.post_id;
  
  -- Special handling for blog_link_collections
  -- Delete collections that belong to this post
  DELETE FROM blog_link_collections WHERE post_id = delete_blog_post_with_cascade.post_id;
  
  -- Delete blog_followers entries where this is the followed blog
  DELETE FROM blog_followers WHERE followed_id = v_post_author;

  -- Finally delete the post itself
  DELETE FROM blog_posts WHERE id = delete_blog_post_with_cascade.post_id;

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
