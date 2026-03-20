/*
  # Fix Blog Post Deletion RLS for Co-Authors

  1. Changes
    - Drop existing restrictive DELETE policy on `blog_posts`
    - Create new DELETE policy that allows both primary authors and co-authors to delete posts
  
  2. Security
    - Primary authors (account_id matches auth.uid()) can delete their posts
    - Co-authors (listed in blog_post_authors table) can also delete posts
    - Maintains authenticated-only access
*/

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Authors can delete their own posts" ON blog_posts;
DROP POLICY IF EXISTS "Authors and co-authors can delete posts" ON blog_posts;

-- Create new policy that includes co-authors
CREATE POLICY "Authors and co-authors can delete posts"
  ON blog_posts FOR DELETE
  TO authenticated
  USING (
    account_id IN (
      SELECT id FROM blog_accounts WHERE id = auth.uid()
    )
    OR id IN (
      SELECT post_id FROM blog_post_authors WHERE author_id = auth.uid()
    )
  );
