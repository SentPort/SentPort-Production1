/*
  # Fix CASCADE Deletion RLS Policies for Blog Tables

  1. Changes
    - Update DELETE policies on `blog_engagement_metrics` to allow post owners
    - Update DELETE policies on `blog_post_analytics` to allow post owners
    - Update DELETE policies on `blog_views` to allow post owners
    
  2. Security
    - Maintains admin access
    - Adds post owner access to enable CASCADE deletion when users delete their own posts
    - Prevents RLS from blocking legitimate CASCADE operations

  3. Why This Fix Is Needed
    - When deleting a blog post, Postgres CASCADE deletes 17 related tables
    - Each child table's DELETE policy is checked independently
    - If any child table blocks the user, the entire CASCADE fails
    - These three tables had admin-only DELETE policies, blocking post owners from deleting their own posts
*/

-- Drop existing admin-only policies
DROP POLICY IF EXISTS "Admins can delete engagement metrics" ON blog_engagement_metrics;
DROP POLICY IF EXISTS "Admins can delete post analytics" ON blog_post_analytics;
DROP POLICY IF EXISTS "Admins can delete views" ON blog_views;

-- Create new policies that allow post owners OR admins
CREATE POLICY "Post owner or admin can delete engagement metrics"
  ON blog_engagement_metrics
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = blog_engagement_metrics.post_id
      AND (blog_posts.account_id = auth.uid() OR is_user_admin(auth.uid()))
    )
  );

CREATE POLICY "Post owner or admin can delete post analytics"
  ON blog_post_analytics
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = blog_post_analytics.post_id
      AND (blog_posts.account_id = auth.uid() OR is_user_admin(auth.uid()))
    )
  );

CREATE POLICY "Post owner or admin can delete views"
  ON blog_views
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = blog_views.post_id
      AND (blog_posts.account_id = auth.uid() OR is_user_admin(auth.uid()))
    )
  );
