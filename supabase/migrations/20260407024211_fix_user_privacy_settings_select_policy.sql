/*
  # Fix User Privacy Settings - Allow Public Reading

  1. Problem
    - Current SELECT policy on `user_privacy_settings` only allows users to view their OWN settings
    - PublicUserProfile.tsx needs to read OTHER users' privacy settings to respect their preferences
    - Privacy enforcement happens through content filtering, not by hiding settings
    
  2. Solution
    - Add SELECT policy allowing authenticated users to read ANY user's privacy settings
    - The settings are just preference declarations - actual enforcement happens in app logic
    - Users still can only INSERT/UPDATE their own settings (existing policies remain)
    
  3. Security
    - Reading someone's privacy preferences is necessary to enforce them
    - No sensitive data in privacy settings table (just public/friends/private flags)
    - Write operations remain restricted to own settings only
*/

-- Drop any existing overly-restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view own privacy settings" ON user_privacy_settings;

-- Create new SELECT policy allowing all authenticated users to read privacy settings
CREATE POLICY "Authenticated users can view all privacy settings"
  ON user_privacy_settings
  FOR SELECT
  TO authenticated
  USING (true);
