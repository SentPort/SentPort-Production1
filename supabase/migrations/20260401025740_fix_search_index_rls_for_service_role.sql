/*
  # Fix Search Index RLS Policy for Service Role

  1. Changes
    - Drop the existing incorrect RLS policy that checks JWT role
    - Create new policy specifically for service_role that allows all updates
    - Keep admin user policy separate for manual operations

  2. Purpose
    - Fix the blocking issue where Edge Functions cannot update search_index
    - Service role should bypass RLS, but we make it explicit with proper policy
    - Ensure backfill-language-detection Edge Function can update records

  3. Important Notes
    - Service role policies use `TO service_role` instead of checking JWT
    - This allows Edge Functions using SUPABASE_SERVICE_ROLE_KEY to update records
    - Admin users get separate policy for manual updates through the UI
*/

-- Drop the existing policy that doesn't work for Edge Functions
DROP POLICY IF EXISTS "Service role and admins can update language fields" ON search_index;

-- Create separate policy for service role (used by Edge Functions)
CREATE POLICY "Service role can update search index"
  ON search_index FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create separate policy for admin users (manual updates through UI)
CREATE POLICY "Admins can update search index"
  ON search_index FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );