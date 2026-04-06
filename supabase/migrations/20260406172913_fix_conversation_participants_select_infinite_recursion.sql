/*
  # Fix Infinite Recursion in conversation_participants SELECT Policy

  1. Problem
    - SELECT policy on conversation_participants causes infinite recursion
    - Policy queries same table: conversation_id IN (SELECT ... FROM conversation_participants ...)
    - This creates infinite loop when checking existing conversations
    - Error: "infinite recursion detected in policy for relation conversation_participants"

  2. Root Cause
    - Line in PublicUserProfile.tsx queries conversation_participants to find existing conversations
    - SELECT policy references conversation_participants in its subquery
    - PostgreSQL detects circular dependency and aborts with error code 42P17

  3. Solution
    - Drop the problematic SELECT policy that references itself
    - Create new simplified SELECT policy: users can view rows where they are a participant
    - Create SECURITY DEFINER function to find or create conversations atomically
    - This bypasses RLS and handles all logic in one database call

  4. Changes
    - Drop existing SELECT policy on conversation_participants
    - Create simple SELECT policy: user_id = auth.uid()
    - Create find_or_create_conversation() function with SECURITY DEFINER
    - Function checks privacy, finds existing conversation, or creates new one
*/

-- Drop the problematic SELECT policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;

-- Create new simplified SELECT policy that doesn't reference itself
-- Users can only see conversation_participants rows where they are the participant
CREATE POLICY "Users can view conversation participants"
  ON conversation_participants
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Also update the conversations SELECT policy to avoid potential issues
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;

CREATE POLICY "Users can view their conversations"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE user_id = auth.uid()
    )
  );

-- Create a SECURITY DEFINER function to find or create a conversation between two users
-- This bypasses RLS and handles the entire workflow atomically
CREATE OR REPLACE FUNCTION find_or_create_conversation(
  user_a_id uuid,
  user_b_id uuid
)
RETURNS uuid AS $$
DECLARE
  v_conversation_id uuid;
  v_can_message boolean;
BEGIN
  -- Check if user_a can message user_b (respects privacy settings)
  SELECT can_message_user(user_a_id, user_b_id) INTO v_can_message;
  
  IF NOT v_can_message THEN
    RAISE EXCEPTION 'You do not have permission to message this user';
  END IF;

  -- Try to find existing conversation between these two users
  -- A conversation exists if both users are participants and it's a 2-person conversation
  SELECT cp1.conversation_id INTO v_conversation_id
  FROM conversation_participants cp1
  WHERE cp1.user_id = user_a_id
    AND EXISTS (
      SELECT 1 
      FROM conversation_participants cp2 
      WHERE cp2.conversation_id = cp1.conversation_id 
        AND cp2.user_id = user_b_id
    )
    AND (
      SELECT COUNT(*) 
      FROM conversation_participants cp3 
      WHERE cp3.conversation_id = cp1.conversation_id
    ) = 2
  LIMIT 1;

  -- If conversation exists, return it
  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  -- Otherwise, create new conversation
  INSERT INTO conversations DEFAULT VALUES
  RETURNING id INTO v_conversation_id;

  -- Add both participants
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES 
    (v_conversation_id, user_a_id),
    (v_conversation_id, user_b_id);

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
