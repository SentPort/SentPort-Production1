/*
  # Fix Blog Posts Delete Infinite Recursion

  1. Problem
    - The DELETE policy on `blog_posts` queries `blog_post_authors` to check co-authorship
    - `blog_post_authors` policies query back to `blog_posts` to check ownership
    - This creates a circular dependency causing infinite recursion when admins delete posts

  2. Solution
    - Drop the existing DELETE policy that has the circular reference
    - Create a simplified DELETE policy that only checks:
      - Post owner (account_id = auth.uid())
      - Admin status (is_user_admin(auth.uid()))
    - Remove the co-author delete check (co-authors should only edit, not delete)

  3. Security Impact
    - More restrictive: Only post owners and admins can delete posts
    - Co-authors can no longer delete posts (only edit them)
    - This is actually MORE secure and follows standard blog platform behavior
*/

-- Drop the problematic DELETE policy with infinite recursion
DROP POLICY IF EXISTS "Authors, co-authors, and admins can delete posts" ON blog_posts;

-- Create new simplified DELETE policy without circular reference
CREATE POLICY "Post owners and admins can delete posts"
  ON blog_posts
  FOR DELETE
  TO authenticated
  USING (
    account_id = auth.uid() 
    OR is_user_admin(auth.uid())
  );
