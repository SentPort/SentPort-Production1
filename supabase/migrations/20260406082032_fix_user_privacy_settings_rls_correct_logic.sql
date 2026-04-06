/*
  # Fix User Privacy Settings RLS - Correct Logic

  1. Problem Fixed
    - Previous policies incorrectly referenced non-existent `hubook_profiles.user_id` column
    - Caused RLS violation errors when trying to save privacy settings

  2. Schema Understanding
    - `auth.uid()` = `user_profiles.id` = `hubook_profiles.id`
    - `user_privacy_settings.user_id` stores the HuBook profile ID
    - Therefore: `auth.uid()` directly equals `user_privacy_settings.user_id`

  3. Changes Made
    - Drop broken INSERT and UPDATE policies that tried to join hubook_profiles
    - Create new simple policies that directly compare auth.uid() to user_id
    - No table joins needed - direct comparison works

  4. Security
    - Users can only insert/update their own privacy settings
    - Uses authenticated user check with direct ID comparison
*/

-- Drop the broken policies
DROP POLICY IF EXISTS "Users can insert own privacy settings" ON user_privacy_settings;
DROP POLICY IF EXISTS "Users can update own privacy settings" ON user_privacy_settings;

-- Create correct INSERT policy
CREATE POLICY "Users can insert own privacy settings"
  ON user_privacy_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create correct UPDATE policy
CREATE POLICY "Users can update own privacy settings"
  ON user_privacy_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
