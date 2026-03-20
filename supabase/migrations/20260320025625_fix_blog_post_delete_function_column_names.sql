/*
  # Fix Blog Post Delete Function - Column Name Corrections

  1. Changes
    - Fix `admin` column reference to `is_admin` in user_profiles
    - Fix `author_id` column reference to `account_id` in blog_posts
    - Fix `blog_coauthors` table reference to `blog_post_authors`
    - Fix `user_id` column reference to `author_id` in blog_post_authors

  2. Purpose
    - Make the delete_blog_post_with_cascade function actually work
    - Fix permission checks to use correct column names
    - Allow authors, co-authors, and admins to delete blog posts
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
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  -- Check if user is admin (FIXED: use is_admin instead of admin)
  SELECT is_admin INTO v_is_admin
  FROM user_profiles
  WHERE id = v_user_id;

  -- Get post author (FIXED: use account_id instead of author_id)
  SELECT account_id INTO v_post_author
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
    -- Check if user is a coauthor (FIXED: use blog_post_authors instead of blog_coauthors, use author_id instead of user_id)
    IF NOT EXISTS (
      SELECT 1 FROM blog_post_authors
      WHERE post_id = delete_blog_post_with_cascade.post_id
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
  
  DELETE FROM blog_comments WHERE post_id = delete_blog_post_with_cascade.post_id;
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
  DELETE FROM blog_post_authors WHERE post_id = delete_blog_post_with_cascade.post_id;
  DELETE FROM blog_post_tags WHERE post_id = delete_blog_post_with_cascade.post_id;
  DELETE FROM blog_link_collections WHERE post_id = delete_blog_post_with_cascade.post_id;
  DELETE FROM blog_views WHERE post_id = delete_blog_post_with_cascade.post_id;

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
