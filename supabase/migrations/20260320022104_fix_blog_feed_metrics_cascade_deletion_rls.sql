/*
  # Fix Blog Feed Metrics CASCADE Deletion RLS

  ## Problem
  When deleting a blog post, the CASCADE deletion of related `blog_feed_metrics` rows
  fails because the DELETE policy only allows admins, but the CASCADE operation context
  doesn't properly recognize admin status.

  ## Solution
  Update the DELETE policy on `blog_feed_metrics` to allow deletion by:
  - The post owner (account_id matches auth.uid())
  - Admins (existing functionality)
  
  This ensures that when a user deletes their post, the CASCADE deletion can proceed
  because they have permission to delete both the post and its metrics.

  ## Changes
  1. Drop existing restrictive admin-only DELETE policy
  2. Create new DELETE policy allowing post owner OR admin
*/

-- Drop the existing admin-only DELETE policy
DROP POLICY IF EXISTS "Admins can delete feed metrics" ON blog_feed_metrics;

-- Create new DELETE policy that allows post owner OR admin
CREATE POLICY "Post owner or admin can delete feed metrics"
  ON blog_feed_metrics
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = blog_feed_metrics.post_id
      AND (blog_posts.account_id = auth.uid() OR is_user_admin(auth.uid()))
    )
  );
