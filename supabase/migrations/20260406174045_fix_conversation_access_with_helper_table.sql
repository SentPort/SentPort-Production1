/*
  # Fix Conversation Access with Helper Table

  1. Purpose
    - Eliminate infinite recursion in conversation_participants and messages RLS policies
    - Improve query performance for conversation access checks
    - Create a denormalized access control table maintained by triggers

  2. New Tables
    - `user_conversation_access`
      - `user_id` (uuid, references auth.users)
      - `conversation_id` (uuid, references conversations)
      - Primary key on (user_id, conversation_id)
      - Used for fast conversation membership lookups without recursion

  3. Changes
    - Create user_conversation_access table
    - Create triggers to maintain it automatically
    - Backfill existing data
    - Update conversation_participants SELECT policies to use helper table
    - Update messages SELECT/INSERT/UPDATE policies to use helper table

  4. Security
    - Helper table is invisible to end users (no SELECT policy for authenticated users)
    - Only accessed by RLS policies and triggers (SECURITY DEFINER)
    - Maintains same security guarantees as before, but without recursion
*/

-- Create the helper table for conversation access
CREATE TABLE IF NOT EXISTS user_conversation_access (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, conversation_id)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_conversation_access_user_id 
  ON user_conversation_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_conversation_access_conversation_id 
  ON user_conversation_access(conversation_id);

-- Enable RLS (but no policies for regular users - only used by other policies)
ALTER TABLE user_conversation_access ENABLE ROW LEVEL SECURITY;

-- Trigger function to maintain user_conversation_access on INSERT
CREATE OR REPLACE FUNCTION maintain_conversation_access_on_insert()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Add access record for the new participant
  INSERT INTO user_conversation_access (user_id, conversation_id)
  VALUES (NEW.user_id, NEW.conversation_id)
  ON CONFLICT (user_id, conversation_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger function to maintain user_conversation_access on DELETE
CREATE OR REPLACE FUNCTION maintain_conversation_access_on_delete()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Remove access record for the deleted participant
  DELETE FROM user_conversation_access
  WHERE user_id = OLD.user_id AND conversation_id = OLD.conversation_id;
  
  RETURN OLD;
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_maintain_access_insert ON conversation_participants;
DROP TRIGGER IF EXISTS trigger_maintain_access_delete ON conversation_participants;

-- Create triggers on conversation_participants
CREATE TRIGGER trigger_maintain_access_insert
  AFTER INSERT ON conversation_participants
  FOR EACH ROW
  EXECUTE FUNCTION maintain_conversation_access_on_insert();

CREATE TRIGGER trigger_maintain_access_delete
  AFTER DELETE ON conversation_participants
  FOR EACH ROW
  EXECUTE FUNCTION maintain_conversation_access_on_delete();

-- Backfill existing data
INSERT INTO user_conversation_access (user_id, conversation_id)
SELECT DISTINCT user_id, conversation_id
FROM conversation_participants
ON CONFLICT (user_id, conversation_id) DO NOTHING;

-- Drop old problematic conversation_participants SELECT policy
DROP POLICY IF EXISTS "Users can view their own participant records" ON conversation_participants;

-- Create new conversation_participants SELECT policy using helper table
CREATE POLICY "Users can view participants in their conversations"
  ON conversation_participants
  FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id 
      FROM user_conversation_access 
      WHERE user_id = auth.uid()
    )
  );

-- Drop old messages policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;
DROP POLICY IF EXISTS "Users can update messages in their conversations" ON messages;

-- Recreate messages policies using helper table
CREATE POLICY "Users can view messages in their conversations"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id 
      FROM user_conversation_access 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to their conversations"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT conversation_id 
      FROM user_conversation_access 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update messages in their conversations"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id 
      FROM user_conversation_access 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    conversation_id IN (
      SELECT conversation_id 
      FROM user_conversation_access 
      WHERE user_id = auth.uid()
    )
  );
