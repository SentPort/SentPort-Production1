/*
  # Fix HuBook Welcome Message Tracking

  1. Changes
    - Add `welcome_message_shown` column to `hubook_profiles` table
    - Set default value to `false` for new profiles
    - Existing profiles will get `false` by default

  2. Purpose
    - Fixes the issue where the welcome modal keeps reappearing
    - Ensures the modal only shows once per user
    - Enables proper tracking of welcome message display status

  3. Security
    - Users can update their own welcome status via existing RLS policies
    - No additional policies needed - existing UPDATE policy covers this
*/

-- Add welcome_message_shown column to hubook_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hubook_profiles' AND column_name = 'welcome_message_shown'
  ) THEN
    ALTER TABLE hubook_profiles ADD COLUMN welcome_message_shown boolean DEFAULT false;
  END IF;
END $$;

-- Set existing profiles to true so they don't see the modal again
-- (They've already been using HuBook, so they don't need the welcome message)
UPDATE hubook_profiles 
SET welcome_message_shown = true 
WHERE welcome_message_shown IS NULL OR welcome_message_shown = false;
