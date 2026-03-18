/*
  # Create HuBook User Mentions System

  1. New Tables
    - `hubook_mentions`
      - `id` (uuid, primary key)
      - `content_type` (text) - 'post' or 'comment'
      - `content_id` (uuid) - references either posts.id or comments.id
      - `mentioned_user_id` (uuid) - user being mentioned
      - `mentioning_user_id` (uuid) - user who created the mention
      - `created_at` (timestamptz)
      - Indexes on mentioned_user_id and content references for fast lookups

  2. Security
    - Enable RLS on `hubook_mentions` table
    - Add policies for authenticated users to:
      - View mentions they created or where they are mentioned
      - Create mentions when posting/commenting
      - Delete mentions from their own content

  3. Functions
    - Trigger to send notifications when users are mentioned
*/

-- Create hubook_mentions table
CREATE TABLE IF NOT EXISTS hubook_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('post', 'comment')),
  content_id uuid NOT NULL,
  mentioned_user_id uuid NOT NULL REFERENCES hubook_profiles(id) ON DELETE CASCADE,
  mentioning_user_id uuid NOT NULL REFERENCES hubook_profiles(id) ON DELETE CASCADE,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_hubook_mentions_mentioned_user 
  ON hubook_mentions(mentioned_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_hubook_mentions_content 
  ON hubook_mentions(content_type, content_id);

CREATE INDEX IF NOT EXISTS idx_hubook_mentions_mentioning_user 
  ON hubook_mentions(mentioning_user_id);

-- Enable RLS
ALTER TABLE hubook_mentions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view mentions they created or where they are mentioned
CREATE POLICY "Users can view their mentions"
  ON hubook_mentions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = mentioned_user_id OR 
    auth.uid() = mentioning_user_id
  );

-- Policy: Users can create mentions when posting
CREATE POLICY "Users can create mentions"
  ON hubook_mentions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = mentioning_user_id);

-- Policy: Users can delete mentions from their own content
CREATE POLICY "Users can delete their mentions"
  ON hubook_mentions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = mentioning_user_id);

-- Policy: Users can mark mentions as read
CREATE POLICY "Users can update their mention read status"
  ON hubook_mentions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = mentioned_user_id)
  WITH CHECK (auth.uid() = mentioned_user_id);

-- Function to get unread mention count for a user
CREATE OR REPLACE FUNCTION get_unread_mentions_count(user_profile_id uuid)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)
  FROM hubook_mentions
  WHERE mentioned_user_id = user_profile_id
    AND is_read = false;
$$;