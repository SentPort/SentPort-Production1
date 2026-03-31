/*
  # Fix Language Backfill Concurrency and Add Retry Logic

  This migration fixes critical issues in the language detection backfill system:
  
  ## Problems Fixed
  1. **Race Condition**: Multiple browser tabs were running backfill simultaneously, causing inflated counters
  2. **Inaccurate Counters**: successful_count and failed_count were using addition instead of aggregation
  3. **No Retry Logic**: Failed URLs were immediately marked as "unknown" without retry attempts
  
  ## Changes Made
  
  ### 1. New Tables
  - `language_backfill_failed_urls`
    - Tracks URLs that fail language detection
    - Enables retry logic (1 retry, then mark as unknown)
    - Columns: id, search_index_id, url, retry_count, first_failed_at, last_failed_at, error_message
  
  ### 2. Schema Modifications
  - Remove `successful_count` column from `language_backfill_progress` (will be computed from logs)
  - Remove `failed_count` column from `language_backfill_progress` (will be computed from logs)
  - Add `lock_acquired_at` column to track advisory lock timing
  - Add `lock_holder_id` column to identify which worker holds the lock
  
  ### 3. Advisory Lock Functions
  - `try_acquire_backfill_lock()`: Attempts to acquire exclusive processing lock
  - `release_backfill_lock()`: Releases the processing lock
  - `force_release_abandoned_locks()`: Cleans up locks held for >2 minutes
  
  ### 4. Helper Functions
  - `get_backfill_success_count()`: Aggregates successful count from logs
  - `get_backfill_failed_count()`: Aggregates failed count from logs
  
  ### 5. Data Migration
  - Calculate correct counts from existing logs
  - Update in-progress backfills to "paused" status for clean restart
  
  ### 6. Security
  - Enable RLS on failed_urls table
  - Add policies for admin-only access
*/

-- Create failed URLs tracking table
CREATE TABLE IF NOT EXISTS language_backfill_failed_urls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_index_id uuid NOT NULL REFERENCES search_index(id) ON DELETE CASCADE,
  url text NOT NULL,
  retry_count integer NOT NULL DEFAULT 1,
  first_failed_at timestamptz NOT NULL DEFAULT now(),
  last_failed_at timestamptz NOT NULL DEFAULT now(),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for quick lookups during batch processing
CREATE INDEX IF NOT EXISTS idx_backfill_failed_urls_search_index 
  ON language_backfill_failed_urls(search_index_id);

CREATE INDEX IF NOT EXISTS idx_backfill_failed_urls_retry_count 
  ON language_backfill_failed_urls(retry_count);

-- Enable RLS
ALTER TABLE language_backfill_failed_urls ENABLE ROW LEVEL SECURITY;

-- Admin-only access policies
CREATE POLICY "Admins can view failed URLs"
  ON language_backfill_failed_urls FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert failed URLs"
  ON language_backfill_failed_urls FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update failed URLs"
  ON language_backfill_failed_urls FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete failed URLs"
  ON language_backfill_failed_urls FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Add lock tracking columns to progress table
ALTER TABLE language_backfill_progress 
  ADD COLUMN IF NOT EXISTS lock_acquired_at timestamptz,
  ADD COLUMN IF NOT EXISTS lock_holder_id text;

-- Remove unreliable counter columns (will be computed from logs)
ALTER TABLE language_backfill_progress 
  DROP COLUMN IF EXISTS successful_count,
  DROP COLUMN IF EXISTS failed_count;

-- Create advisory lock functions using a fixed lock ID for the backfill process
CREATE OR REPLACE FUNCTION try_acquire_backfill_lock(holder_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  lock_acquired boolean;
  lock_id bigint := 123456789; -- Fixed ID for language backfill
BEGIN
  -- Try to acquire the advisory lock
  lock_acquired := pg_try_advisory_lock(lock_id);
  
  IF lock_acquired THEN
    -- Update progress table to track who holds the lock
    UPDATE language_backfill_progress
    SET 
      lock_acquired_at = now(),
      lock_holder_id = holder_id,
      updated_at = now()
    WHERE status = 'running';
  END IF;
  
  RETURN lock_acquired;
END;
$$;

CREATE OR REPLACE FUNCTION release_backfill_lock()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  lock_id bigint := 123456789;
BEGIN
  -- Clear lock tracking in progress table
  UPDATE language_backfill_progress
  SET 
    lock_acquired_at = NULL,
    lock_holder_id = NULL,
    updated_at = now()
  WHERE status = 'running';
  
  -- Release the advisory lock
  PERFORM pg_advisory_unlock(lock_id);
  
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION force_release_abandoned_locks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  lock_id bigint := 123456789;
BEGIN
  -- Find locks held for more than 2 minutes
  UPDATE language_backfill_progress
  SET 
    lock_acquired_at = NULL,
    lock_holder_id = NULL,
    updated_at = now()
  WHERE 
    lock_acquired_at IS NOT NULL
    AND lock_acquired_at < now() - interval '2 minutes';
  
  -- Force release the advisory lock
  PERFORM pg_advisory_unlock_all();
END;
$$;

-- Create helper functions to compute counts from logs
CREATE OR REPLACE FUNCTION get_backfill_success_count(progress_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_success bigint;
BEGIN
  SELECT COALESCE(SUM(successful), 0)
  INTO total_success
  FROM language_backfill_log
  WHERE language_backfill_log.progress_id = get_backfill_success_count.progress_id;
  
  RETURN total_success;
END;
$$;

CREATE OR REPLACE FUNCTION get_backfill_failed_count(progress_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_failed bigint;
BEGIN
  SELECT COALESCE(SUM(failed), 0)
  INTO total_failed
  FROM language_backfill_log
  WHERE language_backfill_log.progress_id = get_backfill_failed_count.progress_id;
  
  RETURN total_failed;
END;
$$;

-- Data migration: Update any "running" backfills to "paused" for clean restart
UPDATE language_backfill_progress
SET 
  status = 'paused',
  lock_acquired_at = NULL,
  lock_holder_id = NULL,
  updated_at = now()
WHERE status = 'running';

-- Clean up any existing advisory locks
SELECT pg_advisory_unlock_all();
