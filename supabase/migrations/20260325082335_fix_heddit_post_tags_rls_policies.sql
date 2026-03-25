/*
  # Fix Heddit Post Tags RLS Policies

  ## Problem
  The RLS policies on `heddit_post_tags` were blocking all tag insertions because they
  incorrectly compared `author_id` (which is a `heddit_accounts.id`) directly to `auth.uid()`
  (which is the user's authentication ID). These are different UUIDs, causing all tag saves to fail.

  ## Solution
  Update the RLS policies to properly join through the `heddit_accounts` table to match
  the authenticated user's ID with the post author's account.

  ## Changes
  1. Drop existing incorrect RLS policies on `heddit_post_tags`
  2. Create corrected policies that join through `heddit_accounts`
  3. Follow the same pattern used successfully in other Heddit tables

  ## Security
  - Maintains proper authentication checks
  - Only post authors can add/remove tags from their posts
  - Uses the correct user_id -> heddit_account.id -> post.author_id chain
*/

-- Drop the incorrect policies
DROP POLICY IF EXISTS "Post author can add tags" ON heddit_post_tags;
DROP POLICY IF EXISTS "Post author can remove tags" ON heddit_post_tags;

-- Create corrected policy for adding tags
CREATE POLICY "Post author can add tags"
  ON heddit_post_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM heddit_posts p
      JOIN heddit_accounts a ON p.author_id = a.id
      WHERE p.id = post_id
      AND a.user_id = auth.uid()
    )
  );

-- Create corrected policy for removing tags
CREATE POLICY "Post author can remove tags"
  ON heddit_post_tags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM heddit_posts p
      JOIN heddit_accounts a ON p.author_id = a.id
      WHERE p.id = post_id
      AND a.user_id = auth.uid()
    )
  );