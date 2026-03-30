/*
  # Fix Language Backfill Tracking

  1. Changes
    - Add `language_backfill_processed` column to track which URLs have been processed
    - Mark existing 5,700 processed URLs as completed based on current progress
    - Add index for efficient querying of unprocessed URLs

  2. Purpose
    - Enable accurate resume functionality without reprocessing URLs
    - Fix the offset-based query issue that caused premature completion
    - Preserve all existing progress (5,700 URLs already processed)
*/

-- Add tracking column to search_index if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'search_index' AND column_name = 'language_backfill_processed'
  ) THEN
    ALTER TABLE search_index ADD COLUMN language_backfill_processed boolean DEFAULT false;
  END IF;
END $$;

-- Mark existing URLs that have been processed (first 5,700 external URLs ordered by created_at)
-- This preserves the work already completed
UPDATE search_index
SET language_backfill_processed = true
WHERE id IN (
  SELECT id
  FROM search_index
  WHERE is_internal = false
  ORDER BY created_at ASC
  LIMIT 5700
);

-- Create index for efficient querying of unprocessed URLs
CREATE INDEX IF NOT EXISTS idx_search_index_backfill_unprocessed 
  ON search_index(created_at) 
  WHERE is_internal = false AND language_backfill_processed = false;

-- Add comment explaining the column
COMMENT ON COLUMN search_index.language_backfill_processed IS 'Tracks whether this URL has been processed by the language detection backfill';
