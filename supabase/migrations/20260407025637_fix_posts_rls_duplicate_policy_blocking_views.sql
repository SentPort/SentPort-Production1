/*
  # Fix Posts RLS - Remove Duplicate Policy Blocking Profile Views

  ## Problem
  Users cannot view each other's profile content because there are TWO conflicting SELECT policies on the posts table:
  1. "Users can view public posts" (original, works correctly)
  2. "Users can view posts based on privacy" (duplicate, causes blocking)

  When multiple SELECT policies exist, Supabase uses OR logic, but the duplicate policy with SECURITY DEFINER functions is interfering with normal access.

  ## Changes
  - Remove the duplicate "Users can view posts based on privacy" policy
  - Keep only the original "Users can view public posts" policy which handles all cases correctly:
    * Public posts visible to everyone
    * Friends-only posts visible to friends
    * Own posts always visible to author

  ## Result
  Users will be able to view each other's public posts and profile content again.
*/

-- Remove the duplicate/conflicting policy
DROP POLICY IF EXISTS "Users can view posts based on privacy" ON posts;

-- Verify the original policy still exists and is correct
-- (This is informational only, the policy already exists from the core schema)
-- The original policy handles:
-- - Public posts with active status
-- - User's own posts
-- - Friends-only posts when users are friends
