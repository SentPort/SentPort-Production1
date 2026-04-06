/*
  # Fix find_or_create_conversation to Populate Access Helper Table

  1. Problem
    - find_or_create_conversation creates conversation and adds participants
    - Relies on triggers to populate user_conversation_access helper table
    - Race condition: user redirected before triggers complete
    - MessagesPage retries fail because helper table not yet populated
    - User sees "Select a conversation to start messaging" instead of message input

  2. Root Cause
    - Triggers execute asynchronously after INSERT completes
    - SECURITY DEFINER function returns before triggers finish
    - RLS policies depend on user_conversation_access being populated
    - Timing window causes conversation to be invisible to SELECT queries

  3. Solution
    - Update find_or_create_conversation to directly insert into user_conversation_access
    - This ensures helper table is populated before function returns
    - Eliminates race condition and ensures immediate visibility
    - Triggers still exist as backup for manual participant additions

  4. Changes
    - Replace find_or_create_conversation function
    - Add direct INSERT into user_conversation_access after participant insertion
    - Use ON CONFLICT DO NOTHING to handle idempotency
    - Maintain same security checks and return value
*/

-- Replace find_or_create_conversation with version that populates helper table
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

  -- CRITICAL FIX: Directly populate user_conversation_access helper table
  -- This ensures the conversation is immediately visible to RLS policies
  -- without waiting for triggers to execute
  INSERT INTO user_conversation_access (user_id, conversation_id)
  VALUES
    (user_a_id, v_conversation_id),
    (user_b_id, v_conversation_id)
  ON CONFLICT (user_id, conversation_id) DO NOTHING;

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
