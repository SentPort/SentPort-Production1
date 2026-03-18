/*
  # Create Welcome Message Tracking System

  1. New Columns
    - Add `welcome_message_shown` to `hubook_profiles` table
      - Tracks whether user has seen the welcome message
      - Defaults to `false` for new users
      - Set to `true` after they view it

  2. Purpose
    - Ensures new users see the welcome message exactly once
    - Provides smooth onboarding experience
    - Allows users to revisit their join date and welcome status

  3. Security
    - Users can only update their own welcome status
    - Read access follows existing RLS policies
*/

-- Add welcome message tracking column to hubook_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hubook_profiles' AND column_name = 'welcome_message_shown'
  ) THEN
    ALTER TABLE hubook_profiles ADD COLUMN welcome_message_shown boolean DEFAULT false;
  END IF;
END $$;

-- Note: UPDATE policies already exist for users to update their own profiles
-- The existing policy "Users can update own profile" covers this new column