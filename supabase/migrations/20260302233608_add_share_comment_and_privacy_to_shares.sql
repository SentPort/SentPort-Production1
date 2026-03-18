/*
  # Add Share Comment and Privacy Fields

  1. Changes
    - Add `share_comment` column to shares table for user commentary
    - Add `privacy` column to shares table for visibility control

  2. Notes
    - Privacy defaults to 'public' for existing shares
    - share_comment is optional (nullable)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shares' AND column_name = 'share_comment'
  ) THEN
    ALTER TABLE shares ADD COLUMN share_comment text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shares' AND column_name = 'privacy'
  ) THEN
    ALTER TABLE shares ADD COLUMN privacy text DEFAULT 'public' CHECK (privacy IN ('public', 'friends', 'private'));
  END IF;
END $$;
