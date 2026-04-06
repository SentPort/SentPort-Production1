/*
  # Fix User Privacy Settings RLS Policies

  1. Problem
    - INSERT and UPDATE policies on `user_privacy_settings` have broken logic
    - Current policy checks `hubook_profiles.id = hubook_profiles.user_id` (nonsensical comparison)
    - This prevents users from saving their privacy settings

  2. Solution
    - Drop the broken INSERT and UPDATE policies
    - Create correct policies that properly verify ownership chain:
      auth.uid() → hubook_profiles.user_id → hubook_profiles.id → user_privacy_settings.user_id

  3. Changes
    - Drop policy: "Users can insert own privacy settings"
    - Drop policy: "Users can update own privacy settings"
    - Create new INSERT policy with correct logic
    - Create new UPDATE policy with correct logic
    - Keep SELECT policy as-is (already correct)

  4. Security
    - Users can only insert/update privacy settings for HuBook profiles they own
    - Maintains data isolation between users
*/

-- Drop the broken policies
DROP POLICY IF EXISTS "Users can insert own privacy settings" ON user_privacy_settings;
DROP POLICY IF EXISTS "Users can update own privacy settings" ON user_privacy_settings;

-- Create correct INSERT policy
CREATE POLICY "Users can insert own privacy settings"
  ON user_privacy_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = (
      SELECT user_id 
      FROM hubook_profiles 
      WHERE id = user_privacy_settings.user_id
    )
  );

-- Create correct UPDATE policy
CREATE POLICY "Users can update own privacy settings"
  ON user_privacy_settings
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = (
      SELECT user_id 
      FROM hubook_profiles 
      WHERE id = user_privacy_settings.user_id
    )
  )
  WITH CHECK (
    auth.uid() = (
      SELECT user_id 
      FROM hubook_profiles 
      WHERE id = user_privacy_settings.user_id
    )
  );
