/*
  # Create Language Detection Backfill Tracking System

  1. Purpose
    - Track progress of language detection backfill for 156,000+ external URLs
    - Store batch processing logs and error details
    - Enable pause/resume functionality for long-running backfill operations

  2. New Tables
    - `language_backfill_progress`: Tracks overall backfill progress and status
      - `id` (uuid, primary key)
      - `total_urls` (integer): Total URLs to process
      - `processed_count` (integer): URLs processed so far
      - `successful_count` (integer): Successfully detected languages
      - `failed_count` (integer): Failed detections
      - `batch_size` (integer): URLs per batch
      - `status` (text): 'idle', 'running', 'paused', 'completed', 'failed'
      - `current_batch` (integer): Current batch number
      - `started_at` (timestamptz): When backfill started
      - `completed_at` (timestamptz): When backfill completed
      - `last_batch_at` (timestamptz): Last batch processing time
      - `processing_rate` (numeric): URLs processed per minute
      - `created_at` (timestamptz): Record creation time
      - `updated_at` (timestamptz): Record update time

    - `language_backfill_log`: Detailed batch processing logs
      - `id` (uuid, primary key)
      - `progress_id` (uuid, foreign key to language_backfill_progress)
      - `batch_number` (integer): Batch sequence number
      - `urls_processed` (integer): URLs in this batch
      - `successful` (integer): Successful detections
      - `failed` (integer): Failed detections
      - `errors` (jsonb): Error details
      - `processing_time_ms` (integer): Batch processing duration
      - `created_at` (timestamptz): Log entry time

  3. Security
    - Enable RLS on all tables
    - Only admins can read/write backfill tracking data
*/

-- Create language_backfill_progress table
CREATE TABLE IF NOT EXISTS language_backfill_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_urls integer NOT NULL DEFAULT 0,
  processed_count integer NOT NULL DEFAULT 0,
  successful_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  batch_size integer NOT NULL DEFAULT 50,
  status text NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'paused', 'completed', 'failed')),
  current_batch integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  last_batch_at timestamptz,
  processing_rate numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create language_backfill_log table
CREATE TABLE IF NOT EXISTS language_backfill_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  progress_id uuid REFERENCES language_backfill_progress(id) ON DELETE CASCADE,
  batch_number integer NOT NULL,
  urls_processed integer NOT NULL DEFAULT 0,
  successful integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  errors jsonb DEFAULT '[]'::jsonb,
  processing_time_ms integer,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE language_backfill_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE language_backfill_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for language_backfill_progress
CREATE POLICY "Admins can view backfill progress"
  ON language_backfill_progress
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert backfill progress"
  ON language_backfill_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update backfill progress"
  ON language_backfill_progress
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- RLS Policies for language_backfill_log
CREATE POLICY "Admins can view backfill logs"
  ON language_backfill_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert backfill logs"
  ON language_backfill_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_language_backfill_log_progress_id ON language_backfill_log(progress_id);
CREATE INDEX IF NOT EXISTS idx_language_backfill_log_created_at ON language_backfill_log(created_at DESC);

-- Insert initial progress record
INSERT INTO language_backfill_progress (
  total_urls,
  processed_count,
  successful_count,
  failed_count,
  batch_size,
  status
)
SELECT 
  COUNT(*) as total_urls,
  0 as processed_count,
  0 as successful_count,
  0 as failed_count,
  50 as batch_size,
  'idle' as status
FROM search_index
WHERE is_internal = false
ON CONFLICT DO NOTHING;