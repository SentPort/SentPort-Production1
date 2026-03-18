/*
  # User Feed History for Discovery Feature

  1. New Tables
    - `user_feed_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `last_random_injection_at` (timestamptz) - tracks when random interest posts were last shown
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `user_feed_history` table
    - Add policy for authenticated users to read their own feed history
    - Add policy for authenticated users to update their own feed history
    - Add policy for authenticated users to insert their own feed history

  3. Important Notes
    - This table tracks the 5-day cycle for "Discover Something New" random interest injections
    - Each user has only one row in this table, updated each time random posts are shown
*/

CREATE TABLE IF NOT EXISTS user_feed_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_random_injection_at timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_feed_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own feed history"
  ON user_feed_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feed history"
  ON user_feed_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own feed history"
  ON user_feed_history
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);