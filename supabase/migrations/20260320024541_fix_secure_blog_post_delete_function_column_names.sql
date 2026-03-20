/*
  # Fix Secure Blog Post Delete Function

  1. Changes
    - Drop the incorrect function that references non-existent columns and tables
    - Create corrected function with:
      - Correct column name: `is_admin` instead of `admin`
      - Correct table names matching actual schema
      - All actual child tables that have `post_id` foreign keys
      - Proper deletion order to avoid violations

  2. Tables Handled
    - blog_bookmarks
    - blog_collection_items
    - blog_comments
    - blog_reactions
    - blog_notifications
    - blog_post_authors
    - blog_post_interests
    - blog_post_analytics
    - blog_views
    - blog_read_progress
    - blog_reading_progress
    - blog_reading_sessions
    - blog_reading_list_posts
    - blog_series_posts
    - blog_engagement_metrics
    - blog_feed_metrics
    - blog_engagement_breakdown
    - blog_quality_leaders
    - blog_deep_engagement_leaders

  3. Security
    - Checks if user is post author or admin (using `is_admin` column)
    - Uses SECURITY DEFINER to bypass RLS during cascade deletion
*/

-- Drop the incorrect function
DROP FUNCTION IF EXISTS delete_blog_post_secure(uuid);

-- Create corrected function
CREATE OR REPLACE FUNCTION delete_blog_post_secure(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_is_author boolean;
  v_is_admin boolean;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user is the author
  SELECT EXISTS (
    SELECT 1 FROM blog_posts 
    WHERE id = p_post_id AND author_id = v_user_id
  ) INTO v_is_author;

  -- Check if user is admin
  SELECT COALESCE(is_admin, false) INTO v_is_admin
  FROM user_profiles
  WHERE id = v_user_id;

  -- User must be either author or admin
  IF NOT (v_is_author OR v_is_admin) THEN
    RAISE EXCEPTION 'Not authorized to delete this post';
  END IF;

  -- Delete all related records in dependency order
  -- Start with tables that have no dependencies on other blog post tables
  
  DELETE FROM blog_bookmarks WHERE post_id = p_post_id;
  DELETE FROM blog_reactions WHERE post_id = p_post_id;
  DELETE FROM blog_comments WHERE post_id = p_post_id;
  DELETE FROM blog_notifications WHERE post_id = p_post_id;
  DELETE FROM blog_views WHERE post_id = p_post_id;
  DELETE FROM blog_read_progress WHERE post_id = p_post_id;
  DELETE FROM blog_reading_progress WHERE post_id = p_post_id;
  DELETE FROM blog_reading_sessions WHERE post_id = p_post_id;
  DELETE FROM blog_post_analytics WHERE post_id = p_post_id;
  DELETE FROM blog_engagement_metrics WHERE post_id = p_post_id;
  DELETE FROM blog_feed_metrics WHERE post_id = p_post_id;
  DELETE FROM blog_engagement_breakdown WHERE post_id = p_post_id;
  DELETE FROM blog_quality_leaders WHERE post_id = p_post_id;
  DELETE FROM blog_deep_engagement_leaders WHERE post_id = p_post_id;
  
  -- Delete collection and list associations
  DELETE FROM blog_collection_items WHERE post_id = p_post_id;
  DELETE FROM blog_reading_list_posts WHERE post_id = p_post_id;
  DELETE FROM blog_series_posts WHERE post_id = p_post_id;
  
  -- Delete metadata
  DELETE FROM blog_post_interests WHERE post_id = p_post_id;
  DELETE FROM blog_post_authors WHERE post_id = p_post_id;
  
  -- Finally, delete the post itself
  DELETE FROM blog_posts WHERE id = p_post_id;
  
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_blog_post_secure(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION delete_blog_post_secure IS 'Securely deletes a blog post and all related data. Only the author or an admin can delete a post.';
