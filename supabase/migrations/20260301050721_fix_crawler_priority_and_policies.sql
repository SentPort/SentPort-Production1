/*
  # Fix Web Crawler Priority System and Missing Policies

  1. Changes to Tables
    - `crawler_queue`
      - Add `manual_priority` (boolean) - Tracks if priority was manually set by admin
      - Defaults to false for auto-discovered URLs
      - Set to true when admins manually add/update URLs

  2. Security Updates
    - Add INSERT policy for `crawler_history` table (admins only)
    - Add UPDATE policy for `crawler_history` table (admins only)
    - These were missing and causing silent failures

  3. Data Migration
    - Set `manual_priority = true` for all existing URLs
    - This preserves current priority assignments
    - Future auto-discovered URLs will have manual_priority = false

  4. Purpose
    - Fixes issue where all URLs get priority 10
    - Allows system to recalculate priorities for auto-discovered URLs
    - Preserves admin-assigned priorities
    - Fixes missing RLS policies that caused random homepage redirects
*/

-- Add manual_priority column to crawler_queue
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crawler_queue' AND column_name = 'manual_priority'
  ) THEN
    ALTER TABLE crawler_queue ADD COLUMN manual_priority boolean DEFAULT false;
  END IF;
END $$;

-- Set existing URLs to have manual_priority = true to preserve current assignments
UPDATE crawler_queue SET manual_priority = true WHERE manual_priority IS NULL OR manual_priority = false;

-- Add INSERT policy for crawler_history (needed for Edge Function tracking)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'crawler_history' AND policyname = 'Admin users can insert crawler history'
  ) THEN
    CREATE POLICY "Admin users can insert crawler history"
      ON crawler_history FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.is_admin = true
        )
      );
  END IF;
END $$;

-- Add UPDATE policy for crawler_history
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'crawler_history' AND policyname = 'Admin users can update crawler history'
  ) THEN
    CREATE POLICY "Admin users can update crawler history"
      ON crawler_history FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.is_admin = true
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.is_admin = true
        )
      );
  END IF;
END $$;
