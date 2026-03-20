/*
  # Add Search Preferences to User Profiles

  1. Changes
    - Add `search_preferences` JSONB column to `user_profiles` table
    - Set default value to include `includeExternalContent: false`
    - This allows users to persist their search preferences across sessions and interfaces

  2. Default Behavior
    - New users will have `includeExternalContent` set to false by default
    - Existing users will get the default preferences on first update

  3. Security
    - Users can update their own search preferences via existing RLS policies
*/

-- Add search_preferences column to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'search_preferences'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN search_preferences JSONB DEFAULT '{"includeExternalContent": false}'::jsonb;
  END IF;
END $$;

-- Update existing NULL values to default
UPDATE user_profiles 
SET search_preferences = '{"includeExternalContent": false}'::jsonb 
WHERE search_preferences IS NULL;