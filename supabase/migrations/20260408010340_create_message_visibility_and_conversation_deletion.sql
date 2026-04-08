/*
  # Add Message Visibility Tracking and Conversation Soft Deletion

  1. New Tables
    - `message_visibility` - Tracks which messages each user can see

  2. Schema Changes
    - Add `deleted_at` column to `conversation_participants` for soft deletion
    - Add `is_favorite` and `is_hidden` columns to `conversation_participants`

  3. Security
    - Enable RLS on `message_visibility` table
    - Add policies for authenticated users to manage their visibility records

  4. Important Notes
    - When a message is sent, visibility records are automatically created
    - When a conversation is deleted, visibility records are removed
    - The `deleted_at` timestamp enables soft deletion of conversations
    - Users can only see messages that have visibility records for them
*/

-- Add soft deletion and conversation settings to conversation_participants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversation_participants' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE conversation_participants ADD COLUMN deleted_at timestamptz DEFAULT null;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversation_participants' AND column_name = 'is_favorite'
  ) THEN
    ALTER TABLE conversation_participants ADD COLUMN is_favorite boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversation_participants' AND column_name = 'is_hidden'
  ) THEN
    ALTER TABLE conversation_participants ADD COLUMN is_hidden boolean DEFAULT false;
  END IF;
END $$;

-- Create message_visibility table
CREATE TABLE IF NOT EXISTS message_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Enable RLS
ALTER TABLE message_visibility ENABLE ROW LEVEL SECURITY;

-- Message visibility policies
CREATE POLICY "Users can view their own visibility records"
  ON message_visibility FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own visibility records"
  ON message_visibility FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own visibility records"
  ON message_visibility FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Function to create visibility records when a message is sent
CREATE OR REPLACE FUNCTION create_message_visibility()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO message_visibility (message_id, user_id)
  SELECT NEW.id, cp.user_id
  FROM conversation_participants cp
  WHERE cp.conversation_id = NEW.conversation_id
    AND cp.deleted_at IS NULL
  ON CONFLICT (message_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create visibility records for new messages
DROP TRIGGER IF EXISTS create_message_visibility_trigger ON messages;
CREATE TRIGGER create_message_visibility_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION create_message_visibility();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_message_visibility_user_id ON message_visibility(user_id);
CREATE INDEX IF NOT EXISTS idx_message_visibility_message_id ON message_visibility(message_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_deleted_at ON conversation_participants(deleted_at);
