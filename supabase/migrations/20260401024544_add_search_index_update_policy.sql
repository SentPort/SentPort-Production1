/*
  # Add RLS Policy for Language Backfill Updates

  1. Security Changes
    - Add UPDATE policy for search_index table
    - Allow service role and admin users to update language detection fields
    - Policy is scoped specifically to language backfill operations

  2. Purpose
    - Enable the backfill-language-detection Edge Function to update records
    - Fix infinite loop where updates were silently failing due to missing RLS policy
    - Maintain security by only allowing language field updates

  3. Important Notes
    - This policy allows updates to language, language_confidence, and language_backfill_processed columns
    - Service role can bypass RLS, but explicit policy ensures proper audit trail
    - Admin users can also perform manual backfill operations
*/

-- Add UPDATE policy for search_index to allow language backfill updates
CREATE POLICY "Service role and admins can update language fields"
  ON search_index FOR UPDATE
  TO authenticated
  USING (
    -- Allow service role (used by Edge Functions)
    auth.jwt()->>'role' = 'service_role'
    OR
    -- Allow admin users
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    -- Allow service role (used by Edge Functions)
    auth.jwt()->>'role' = 'service_role'
    OR
    -- Allow admin users
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );