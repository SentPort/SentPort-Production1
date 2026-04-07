/*
  # Fix Posts RLS Policy - ID Type Mismatch

  1. Problem
    - posts.author_id references hubook_profiles.id
    - Current policy checks: author_id = auth.uid()
    - This fails because auth.uid() is user_id, not profile_id
    - Also checks friendships using posts.author_id directly
    
  2. Solution
    - Update posts SELECT policy to properly join with hubook_profiles
    - Use the updated are_users_friends() function that handles both ID types
    - Allow viewing:
      * Public posts (if active)
      * Own posts (using proper user_id lookup)
      * Friends-only posts (if friends with author and post is active)
      * Private posts (only author can see)
      
  3. Security
    - Proper privacy enforcement for all post visibility levels
    - Uses are_users_friends() which now handles ID conversion correctly
*/

-- Drop the old posts SELECT policy
DROP POLICY IF EXISTS "Users can view public posts" ON posts;

-- Create new posts SELECT policy with proper ID handling
CREATE POLICY "Users can view posts based on privacy"
  ON posts
  FOR SELECT
  TO authenticated
  USING (
    -- Public posts that are active
    (privacy = 'public' AND status = 'active')
    OR
    -- User is the author (check via hubook_profiles.user_id)
    (
      author_id IN (
        SELECT id FROM hubook_profiles WHERE user_id = auth.uid()
      )
    )
    OR
    -- Friends-only posts where viewer is friends with author
    (
      privacy = 'friends' 
      AND status = 'active'
      AND are_users_friends(auth.uid(), author_id)
    )
    -- Private posts are handled by the author check above
  );
