/*
  # Fix Admin Delete Permissions for All Blog Cascade Tables

  ## Problem
  When admins try to delete blog posts, the CASCADE delete fails because child tables
  (comments, bookmarks, reactions, etc.) have RLS policies that only allow the original
  author to delete, blocking the admin's moderation authority.

  ## Solution
  Add admin bypass (`OR is_user_admin(auth.uid())`) to DELETE policies on ALL tables
  that cascade from blog_posts. This ensures admins can delete any content for moderation.

  ## Tables Updated
  1. blog_comments - Add admin bypass to comment deletion
  2. blog_bookmarks - Add admin bypass to bookmark deletion  
  3. blog_reactions - Add admin bypass to reaction deletion
  4. blog_collection_items - Add admin bypass to collection item deletion
  5. blog_post_authors - Add admin bypass to co-author deletion
  6. blog_post_interests - Add admin bypass to interest tag deletion

  ## Security
  - Maintains existing author/owner permissions
  - Adds admin override for moderation purposes
  - All policies remain authenticated-only
  - Uses existing is_user_admin() function for consistency
*/

-- ============================================
-- 1. Fix blog_comments DELETE policy
-- ============================================
DROP POLICY IF EXISTS "Authors can delete their own comments" ON blog_comments;

CREATE POLICY "Authors and admins can delete comments"
  ON blog_comments FOR DELETE
  TO authenticated
  USING (
    -- Comment author can delete their own comments
    account_id IN (
      SELECT id FROM blog_accounts WHERE id = auth.uid()
    )
    -- OR admin can delete any comment (moderation)
    OR is_user_admin(auth.uid())
  );

-- ============================================
-- 2. Fix blog_bookmarks DELETE policy
-- ============================================
DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON blog_bookmarks;

CREATE POLICY "Users and admins can delete bookmarks"
  ON blog_bookmarks FOR DELETE
  TO authenticated
  USING (
    -- User can delete their own bookmarks
    account_id IN (
      SELECT id FROM blog_accounts WHERE id = auth.uid()
    )
    -- OR admin can delete any bookmark (when deleting posts)
    OR is_user_admin(auth.uid())
  );

-- ============================================
-- 3. Fix blog_reactions DELETE policy
-- ============================================
DROP POLICY IF EXISTS "Users can delete their own reactions" ON blog_reactions;

CREATE POLICY "Users and admins can delete reactions"
  ON blog_reactions FOR DELETE
  TO authenticated
  USING (
    -- User can delete their own reactions
    account_id IN (
      SELECT id FROM blog_accounts WHERE id = auth.uid()
    )
    -- OR admin can delete any reaction (when deleting posts)
    OR is_user_admin(auth.uid())
  );

-- ============================================
-- 4. Fix blog_collection_items DELETE policy
-- ============================================
DROP POLICY IF EXISTS "Owners remove items" ON blog_collection_items;

CREATE POLICY "Owners and admins can remove collection items"
  ON blog_collection_items FOR DELETE
  TO authenticated
  USING (
    -- Collection owner can remove items from their collection
    EXISTS (
      SELECT 1 FROM blog_collections c
      WHERE c.id = blog_collection_items.collection_id
      AND auth.uid() = c.user_id
    )
    -- OR admin can remove any item (when deleting posts)
    OR is_user_admin(auth.uid())
  );

-- ============================================
-- 5. Fix blog_post_authors policies
-- ============================================
-- First check if there are existing policies
DROP POLICY IF EXISTS "Post owners manage co-authors" ON blog_post_authors;
DROP POLICY IF EXISTS "Post owners and admins manage co-authors" ON blog_post_authors;
DROP POLICY IF EXISTS "Authors and admins can delete co-author records" ON blog_post_authors;

-- Create comprehensive policy for DELETE
CREATE POLICY "Authors and admins can delete co-author records"
  ON blog_post_authors FOR DELETE
  TO authenticated
  USING (
    -- Post owner can remove co-authors
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = blog_post_authors.post_id
      AND blog_posts.account_id = auth.uid()
    )
    -- OR the co-author themselves can leave
    OR author_id = auth.uid()
    -- OR admin can delete any co-author relationship (when deleting posts)
    OR is_user_admin(auth.uid())
  );

-- ============================================
-- 6. Fix blog_post_interests DELETE policy
-- ============================================
-- Check if table exists and has DELETE policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'blog_post_interests'
  ) THEN
    -- Drop existing policy if it exists
    DROP POLICY IF EXISTS "Post owners manage interests" ON blog_post_interests;
    DROP POLICY IF EXISTS "Post owners and admins manage interests" ON blog_post_interests;
    
    -- Create new policy with admin bypass
    CREATE POLICY "Post owners and admins manage interests"
      ON blog_post_interests FOR DELETE
      TO authenticated
      USING (
        -- Post owner can manage their post's interests
        EXISTS (
          SELECT 1 FROM blog_posts
          WHERE blog_posts.id = blog_post_interests.post_id
          AND blog_posts.account_id = auth.uid()
        )
        -- OR admin can delete any interest tag (when deleting posts)
        OR is_user_admin(auth.uid())
      );
  END IF;
END $$;
