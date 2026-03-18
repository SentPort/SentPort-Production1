/*
  # Create Search History System

  1. New Tables
    - `search_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, nullable) - References auth.users, null for anonymous
      - `session_id` (text) - For anonymous users
      - `query` (text) - The search query
      - `platform` (text) - Which platform: 'main', 'hubook', 'hinsta', 'switter', 'hutube', 'heddit', 'blog'
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `search_history` table
    - Users can only read their own search history (by user_id or session_id)
    - Users can insert their own search history
    - Users can delete their own search history items

  3. Indexes
    - Index on user_id and platform for fast queries
    - Index on session_id and platform for anonymous users
    - Index on created_at for ordering

  4. Purpose
    - Store search history per user/session
    - Support up to 10 recent searches per platform
    - Enable search suggestions with history
    - Allow individual deletion and clear all functionality
*/

-- Create search_history table
CREATE TABLE IF NOT EXISTS search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text,
  query text NOT NULL,
  platform text NOT NULL DEFAULT 'main',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT search_history_user_or_session CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

-- Enable RLS
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- Users can read their own search history
CREATE POLICY "Users can read own search history"
  ON search_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Anonymous users can read their session search history
CREATE POLICY "Anonymous users can read session search history"
  ON search_history FOR SELECT
  TO anon
  USING (session_id IS NOT NULL);

-- Users can insert their own search history
CREATE POLICY "Users can insert own search history"
  ON search_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Anonymous users can insert session search history
CREATE POLICY "Anonymous users can insert session search history"
  ON search_history FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL AND session_id IS NOT NULL);

-- Users can delete their own search history
CREATE POLICY "Users can delete own search history"
  ON search_history FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Anonymous users can delete their session search history
CREATE POLICY "Anonymous users can delete session search history"
  ON search_history FOR DELETE
  TO anon
  USING (session_id IS NOT NULL);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_search_history_user_platform ON search_history(user_id, platform, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_session_platform ON search_history(session_id, platform, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at DESC);
