/*
  # Add Admin Bypass to Blog Post Deletion

  1. Changes
    - Create helper function to check if user is admin
    - Replace blog_posts DELETE policy with simplified version
    - Add admin bypass to allow admins to delete any post (moderation)
    - Simplify primary author check from subquery to direct comparison
    - Maintain co-author support for future use

  2. Security
    - Primary authors (account_id = auth.uid()) can delete their posts
    - Co-authors (listed in blog_post_authors table) can delete posts
    - Admins (is_admin = true) can delete ANY post for moderation
    - All checks require authenticated users
*/

-- Create admin check helper function
CREATE OR REPLACE FUNCTION is_user_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = user_id AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_user_admin(uuid) TO authenticated;

-- Drop existing DELETE policy
DROP POLICY IF EXISTS "Authors and co-authors can delete posts" ON blog_posts;

-- Create new policy with admin bypass
CREATE POLICY "Authors, co-authors, and admins can delete posts"
  ON blog_posts FOR DELETE
  TO authenticated
  USING (
    -- Primary author owns the post
    account_id = auth.uid()
    -- OR user is a co-author
    OR EXISTS (
      SELECT 1 FROM blog_post_authors
      WHERE post_id = blog_posts.id
      AND author_id = auth.uid()
    )
    -- OR user is an admin (moderation)
    OR is_user_admin(auth.uid())
  );
