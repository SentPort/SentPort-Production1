/*
  # Fix is_user_admin() Function Parameter Ambiguity

  1. Problem
    - The `is_user_admin()` function has a parameter named `user_id`
    - Inside the function, it queries `user_profiles` table which also has columns that could be confused with the parameter name
    - This creates ambiguity causing PostgreSQL to fail RLS policy evaluation
    - Results in HTTP 500 errors with empty messages when querying tables protected by this function

  2. Solution
    - Drop and recreate the function with a properly prefixed parameter name `p_user_id`
    - This eliminates any ambiguity between parameter names and column names
    - Ensures RLS policies using this function work correctly

  3. Impact
    - Fixes all queries to `crawler_queue` table (uses this function in RLS)
    - Resolves Web Crawler Dashboard query failures
    - No data loss, only function signature change
    - All dependent policies will automatically use the new function
*/

-- Drop the existing function with CASCADE to handle dependent policies
DROP FUNCTION IF EXISTS is_user_admin(uuid) CASCADE;

-- Recreate with proper parameter naming to avoid ambiguity
CREATE OR REPLACE FUNCTION is_user_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_profiles
    WHERE user_profiles.id = p_user_id 
    AND user_profiles.is_admin = true
  );
END;
$$;

-- Recreate all policies that were dropped due to CASCADE

-- Crawler queue policy
CREATE POLICY "Admin users can manage crawler queue"
  ON crawler_queue
  FOR ALL
  TO authenticated
  USING (is_user_admin(auth.uid()))
  WITH CHECK (is_user_admin(auth.uid()));

-- Blog comments policy
CREATE POLICY "Authors and admins can delete comments"
  ON blog_comments
  FOR DELETE
  TO authenticated
  USING ((account_id IN (SELECT blog_accounts.id FROM blog_accounts WHERE blog_accounts.id = auth.uid())) OR is_user_admin(auth.uid()));

-- Blog bookmarks policy
CREATE POLICY "Users and admins can delete bookmarks"
  ON blog_bookmarks
  FOR DELETE
  TO authenticated
  USING ((account_id IN (SELECT blog_accounts.id FROM blog_accounts WHERE blog_accounts.id = auth.uid())) OR is_user_admin(auth.uid()));

-- Blog reactions policy
CREATE POLICY "Users and admins can delete reactions"
  ON blog_reactions
  FOR DELETE
  TO authenticated
  USING ((account_id IN (SELECT blog_accounts.id FROM blog_accounts WHERE blog_accounts.id = auth.uid())) OR is_user_admin(auth.uid()));

-- Blog collection items policy
CREATE POLICY "Owners and admins can remove collection items"
  ON blog_collection_items
  FOR DELETE
  TO authenticated
  USING ((EXISTS (SELECT 1 FROM blog_collections c WHERE c.id = blog_collection_items.collection_id AND auth.uid() = c.user_id)) OR is_user_admin(auth.uid()));

-- Blog post authors policy
CREATE POLICY "Authors and admins can delete co-author records"
  ON blog_post_authors
  FOR DELETE
  TO authenticated
  USING ((EXISTS (SELECT 1 FROM blog_posts WHERE blog_posts.id = blog_post_authors.post_id AND blog_posts.account_id = auth.uid())) OR (author_id = auth.uid()) OR is_user_admin(auth.uid()));

-- Blog post interests policy
CREATE POLICY "Post owners and admins manage interests"
  ON blog_post_interests
  FOR DELETE
  TO authenticated
  USING ((EXISTS (SELECT 1 FROM blog_posts WHERE blog_posts.id = blog_post_interests.post_id AND blog_posts.account_id = auth.uid())) OR is_user_admin(auth.uid()));

-- Blog read progress policy
CREATE POLICY "Users and admins can delete read progress"
  ON blog_read_progress
  FOR DELETE
  TO authenticated
  USING ((auth.uid() = user_id) OR is_user_admin(auth.uid()));

-- Blog reading progress policy
CREATE POLICY "Users and admins can delete reading progress"
  ON blog_reading_progress
  FOR DELETE
  TO authenticated
  USING ((auth.uid() = user_id) OR is_user_admin(auth.uid()));

-- Blog reading sessions policy
CREATE POLICY "Users and admins can delete reading sessions"
  ON blog_reading_sessions
  FOR DELETE
  TO authenticated
  USING ((auth.uid() = reader_id) OR is_user_admin(auth.uid()));

-- Blog reading list posts policy
CREATE POLICY "List owners and admins can delete reading list posts"
  ON blog_reading_list_posts
  FOR DELETE
  TO authenticated
  USING ((EXISTS (SELECT 1 FROM blog_reading_lists WHERE blog_reading_lists.id = blog_reading_list_posts.list_id AND blog_reading_lists.account_id = auth.uid())) OR is_user_admin(auth.uid()));

-- Blog notifications policy
CREATE POLICY "Recipients and admins can delete notifications"
  ON blog_notifications
  FOR DELETE
  TO authenticated
  USING ((auth.uid() = recipient_id) OR is_user_admin(auth.uid()));

-- Blog series posts policy
CREATE POLICY "Series owners and admins can delete series posts"
  ON blog_series_posts
  FOR DELETE
  TO authenticated
  USING ((EXISTS (SELECT 1 FROM blog_series WHERE blog_series.id = blog_series_posts.series_id AND blog_series.account_id = auth.uid())) OR is_user_admin(auth.uid()));

-- Blog posts policy
CREATE POLICY "Post owners and admins can delete posts"
  ON blog_posts
  FOR DELETE
  TO authenticated
  USING ((account_id = auth.uid()) OR is_user_admin(auth.uid()));

-- Blog feed metrics policy
CREATE POLICY "Post owner or admin can delete feed metrics"
  ON blog_feed_metrics
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM blog_posts WHERE blog_posts.id = blog_feed_metrics.post_id AND (blog_posts.account_id = auth.uid() OR is_user_admin(auth.uid()))));

-- Blog engagement metrics policy
CREATE POLICY "Post owner or admin can delete engagement metrics"
  ON blog_engagement_metrics
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM blog_posts WHERE blog_posts.id = blog_engagement_metrics.post_id AND (blog_posts.account_id = auth.uid() OR is_user_admin(auth.uid()))));

-- Blog post analytics policy
CREATE POLICY "Post owner or admin can delete post analytics"
  ON blog_post_analytics
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM blog_posts WHERE blog_posts.id = blog_post_analytics.post_id AND (blog_posts.account_id = auth.uid() OR is_user_admin(auth.uid()))));

-- Blog views policy
CREATE POLICY "Post owner or admin can delete views"
  ON blog_views
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM blog_posts WHERE blog_posts.id = blog_views.post_id AND (blog_posts.account_id = auth.uid() OR is_user_admin(auth.uid()))));

-- Grant execute permissions to all roles
GRANT EXECUTE ON FUNCTION is_user_admin(uuid) TO authenticated, anon, service_role;

-- Force PostgREST to reload its schema cache
-- This is critical after DROP...CASCADE operations that recreate functions
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
