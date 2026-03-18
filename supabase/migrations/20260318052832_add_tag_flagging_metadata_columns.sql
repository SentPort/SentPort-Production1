/*
  # Add Tag Flagging Metadata Columns

  1. New Columns Added to heddit_custom_tags
    - `flagged_at` (timestamp with time zone) - When the tag was flagged
    - `flagged_by` (uuid) - User ID who flagged the tag
    - `flag_reason` (text) - Reason for flagging the tag
    - `flag_notes` (text) - Additional notes about the flag

  2. Changes
    - Adds metadata columns to track when, why, and by whom a tag was flagged
    - These columns are nullable since existing tags may not have been flagged
    - Enables proper audit trail for tag moderation actions

  3. Notes
    - Columns are added safely with IF NOT EXISTS checks
    - Existing data is not affected
    - flag_reason and flag_notes support detailed moderation tracking
*/

-- Add flagged_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'heddit_custom_tags' AND column_name = 'flagged_at'
  ) THEN
    ALTER TABLE heddit_custom_tags ADD COLUMN flagged_at timestamptz;
  END IF;
END $$;

-- Add flagged_by column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'heddit_custom_tags' AND column_name = 'flagged_by'
  ) THEN
    ALTER TABLE heddit_custom_tags ADD COLUMN flagged_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Add flag_reason column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'heddit_custom_tags' AND column_name = 'flag_reason'
  ) THEN
    ALTER TABLE heddit_custom_tags ADD COLUMN flag_reason text;
  END IF;
END $$;

-- Add flag_notes column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'heddit_custom_tags' AND column_name = 'flag_notes'
  ) THEN
    ALTER TABLE heddit_custom_tags ADD COLUMN flag_notes text;
  END IF;
END $$;
