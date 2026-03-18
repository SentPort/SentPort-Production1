/*
  # Add Welcome Message Tracking to All Platforms

  1. New Columns
    - Add `welcome_message_shown` to all platform profile tables:
      - `blog_accounts`
      - `heddit_accounts`
      - `hinsta_accounts`
      - `hutube_channels`
      - `switter_accounts`
    - Tracks whether user has seen the welcome message
    - Defaults to `false` for new users
    - Set to `true` after they view it

  2. Purpose
    - Ensures new users see the welcome message exactly once per platform
    - Provides smooth onboarding experience across all platforms
    - Allows users to revisit their join date and welcome status

  3. Security
    - Users can only update their own welcome status
    - Read access follows existing RLS policies
*/

-- Add welcome message tracking column to blog_accounts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_accounts' AND column_name = 'welcome_message_shown'
  ) THEN
    ALTER TABLE blog_accounts ADD COLUMN welcome_message_shown boolean DEFAULT false;
  END IF;
END $$;

-- Add welcome message tracking column to heddit_accounts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'heddit_accounts' AND column_name = 'welcome_message_shown'
  ) THEN
    ALTER TABLE heddit_accounts ADD COLUMN welcome_message_shown boolean DEFAULT false;
  END IF;
END $$;

-- Add welcome message tracking column to hinsta_accounts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hinsta_accounts' AND column_name = 'welcome_message_shown'
  ) THEN
    ALTER TABLE hinsta_accounts ADD COLUMN welcome_message_shown boolean DEFAULT false;
  END IF;
END $$;

-- Add welcome message tracking column to hutube_channels
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hutube_channels' AND column_name = 'welcome_message_shown'
  ) THEN
    ALTER TABLE hutube_channels ADD COLUMN welcome_message_shown boolean DEFAULT false;
  END IF;
END $$;

-- Add welcome message tracking column to switter_accounts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'switter_accounts' AND column_name = 'welcome_message_shown'
  ) THEN
    ALTER TABLE switter_accounts ADD COLUMN welcome_message_shown boolean DEFAULT false;
  END IF;
END $$;

-- Note: UPDATE policies already exist for users to update their own profiles on all platforms
-- The existing policies cover these new columns