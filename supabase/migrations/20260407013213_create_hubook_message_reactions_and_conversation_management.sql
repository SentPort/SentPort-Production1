/*
  # Add HuBook Message Reactions and Conversation Management

  1. New Tables
    - `hubook_message_reactions`
      - `id` (uuid, primary key)
      - `message_id` (uuid, foreign key to messages)
      - `user_id` (uuid, foreign key to auth.users)
      - `emoji` (text, limited to specific emoji values)
      - `created_at` (timestamptz)

  2. Changes to Existing Tables
    - `conversation_participants`
      - Add `is_favorite` (boolean, default false)
      - Add `is_hidden` (boolean, default false)
      - Add `hidden_at` (timestamptz, nullable)

  3. Security
    - Enable RLS on `hubook_message_reactions` table
    - Users can insert their own reactions
    - Users can delete their own reactions
    - Users can view reactions in conversations they're part of
    - Users can update their own conversation_participants settings

  4. Indexes
    - Index on message_reactions for efficient reaction lookups
    - Index on conversation_participants for favorite/hidden filtering
*/

-- Create message reactions table
CREATE TABLE IF NOT EXISTS hubook_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (emoji IN ('❤️', '👍', '😂', '😮', '😢', '😡', '🎉', '🔥')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Add conversation management columns to conversation_participants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversation_participants' AND column_name = 'is_favorite'
  ) THEN
    ALTER TABLE conversation_participants ADD COLUMN is_favorite boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversation_participants' AND column_name = 'is_hidden'
  ) THEN
    ALTER TABLE conversation_participants ADD COLUMN is_hidden boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversation_participants' AND column_name = 'hidden_at'
  ) THEN
    ALTER TABLE conversation_participants ADD COLUMN hidden_at timestamptz;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON hubook_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON hubook_message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_favorite ON conversation_participants(user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_conversation_participants_hidden ON conversation_participants(user_id, is_hidden) WHERE is_hidden = true;

-- Enable RLS on message reactions
ALTER TABLE hubook_message_reactions ENABLE ROW LEVEL SECURITY;

-- Users can view reactions in conversations they're part of
CREATE POLICY "Users can view message reactions in their conversations"
  ON hubook_message_reactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN user_conversation_access uca ON uca.conversation_id = m.conversation_id
      WHERE m.id = message_id
      AND uca.user_id = auth.uid()
    )
  );

-- Users can add reactions to messages in their conversations
CREATE POLICY "Users can add reactions to messages in their conversations"
  ON hubook_message_reactions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM messages m
      JOIN user_conversation_access uca ON uca.conversation_id = m.conversation_id
      WHERE m.id = message_id
      AND uca.user_id = auth.uid()
    )
  );

-- Users can delete their own reactions
CREATE POLICY "Users can delete their own reactions"
  ON hubook_message_reactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Update conversation_participants policies to allow updates
DROP POLICY IF EXISTS "Users can update their own conversation participation settings" ON conversation_participants;
CREATE POLICY "Users can update their own conversation participation settings"
  ON conversation_participants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to get reaction counts for a message
CREATE OR REPLACE FUNCTION get_message_reaction_counts(p_message_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_object_agg(emoji, count)
  INTO result
  FROM (
    SELECT emoji, COUNT(*)::int as count
    FROM hubook_message_reactions
    WHERE message_id = p_message_id
    GROUP BY emoji
  ) reaction_counts;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- Function to get users who reacted with specific emoji
CREATE OR REPLACE FUNCTION get_message_reaction_users(p_message_id uuid, p_emoji text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_agg(jsonb_build_object(
    'user_id', r.user_id,
    'full_name', COALESCE(up.full_name, up.display_name, 'Unknown User'),
    'created_at', r.created_at
  ))
  INTO result
  FROM hubook_message_reactions r
  LEFT JOIN user_profiles up ON up.id = r.user_id
  WHERE r.message_id = p_message_id
  AND r.emoji = p_emoji
  ORDER BY r.created_at;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;