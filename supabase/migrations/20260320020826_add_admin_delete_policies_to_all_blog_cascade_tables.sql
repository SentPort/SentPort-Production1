/*
  # Fix Admin Blog Post Deletion - Add Missing DELETE Policies

  ## Problem
  Admins cannot delete blog posts because 10 related tables with CASCADE delete 
  constraints are missing proper RLS DELETE policies. When deleting a post, the 
  CASCADE tries to delete child rows, but RLS blocks it.

  ## Changes
  
  ### Analytics & Metrics Tables (System-Managed)
  - `blog_engagement_metrics` - Add DELETE policy for admins
  - `blog_post_analytics` - Add DELETE policy for admins
  - `blog_feed_metrics` - Update existing policy to include admin bypass
  - `blog_views` - Add DELETE policy for admins

  ### User Reading Tracking Tables
  - `blog_read_progress` - Add DELETE policy for users (own data) + admins
  - `blog_reading_progress` - Add DELETE policy for users (own data) + admins
  - `blog_reading_sessions` - Add DELETE policy for users (own data) + admins
  - `blog_reading_list_posts` - Add DELETE policy for list owners + admins

  ### System & Content Organization Tables
  - `blog_notifications` - Add DELETE policy for recipients + admins
  - `blog_series_posts` - Add DELETE policy for series owners + admins

  ## Security
  All policies use `is_user_admin(auth.uid())` for admin bypass, maintaining
  consistency with existing policies across the platform.
*/

-- Analytics & Metrics Tables (System-Managed)
-- These are automatically managed and should allow CASCADE deletes from admins

CREATE POLICY "Admins can delete engagement metrics"
  ON blog_engagement_metrics
  FOR DELETE
  TO authenticated
  USING (is_user_admin(auth.uid()));

CREATE POLICY "Admins can delete post analytics"
  ON blog_post_analytics
  FOR DELETE
  TO authenticated
  USING (is_user_admin(auth.uid()));

-- Update blog_feed_metrics to add admin bypass
DROP POLICY IF EXISTS "System can delete metrics" ON blog_feed_metrics;

CREATE POLICY "Admins can delete feed metrics"
  ON blog_feed_metrics
  FOR DELETE
  TO authenticated
  USING (is_user_admin(auth.uid()));

CREATE POLICY "Admins can delete views"
  ON blog_views
  FOR DELETE
  TO authenticated
  USING (is_user_admin(auth.uid()));

-- User Reading Tracking Tables
-- Users can delete their own data, admins can delete any

CREATE POLICY "Users and admins can delete read progress"
  ON blog_read_progress
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    is_user_admin(auth.uid())
  );

CREATE POLICY "Users and admins can delete reading progress"
  ON blog_reading_progress
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    is_user_admin(auth.uid())
  );

CREATE POLICY "Users and admins can delete reading sessions"
  ON blog_reading_sessions
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = reader_id OR
    is_user_admin(auth.uid())
  );

CREATE POLICY "List owners and admins can delete reading list posts"
  ON blog_reading_list_posts
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM blog_reading_lists
      WHERE blog_reading_lists.id = blog_reading_list_posts.list_id
      AND blog_reading_lists.account_id = auth.uid()
    ) OR
    is_user_admin(auth.uid())
  );

-- System & Content Organization Tables

CREATE POLICY "Recipients and admins can delete notifications"
  ON blog_notifications
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = recipient_id OR
    is_user_admin(auth.uid())
  );

CREATE POLICY "Series owners and admins can delete series posts"
  ON blog_series_posts
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM blog_series
      WHERE blog_series.id = blog_series_posts.series_id
      AND blog_series.account_id = auth.uid()
    ) OR
    is_user_admin(auth.uid())
  );
