/*
  # Fix Message Sending 403 Error - Restore Sender's Conversation
  
  1. Problem
    - The restore_conversation_on_new_message() trigger only restores conversation for recipient
    - It excludes the sender with: AND user_id != NEW.sender_id
    - When sender tries to send a message, their deleted_at is still set
    - The is_conversation_participant() function requires deleted_at IS NULL
    - RLS policy fails, causing 403 error
  
  2. Solution
    - Remove the user_id != NEW.sender_id condition
    - Restore conversation for BOTH sender and recipient
    - Also ensure user_conversation_access helper table is populated
    - This allows the sender's RLS check to pass
  
  3. Changes
    - Update restore_conversation_on_new_message() to restore for all participants
    - Add user_conversation_access population for both participants
    - Keep permanently_blocked check intact
*/

-- Fix the function to restore conversation for BOTH sender and recipient
CREATE OR REPLACE FUNCTION restore_conversation_on_new_message()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Restore conversation for ALL participants who had deleted it
  -- ONLY if they haven't permanently blocked it
  -- This includes BOTH the sender and recipient
  UPDATE conversation_participants
  SET
    deleted_at = NULL,
    joined_at = now()
  WHERE conversation_id = NEW.conversation_id
    AND deleted_at IS NOT NULL
    AND permanently_blocked = false;

  -- Also ensure both participants have entries in user_conversation_access
  -- This prevents similar RLS issues with other queries
  INSERT INTO user_conversation_access (user_id, conversation_id)
  SELECT cp.user_id, NEW.conversation_id
  FROM conversation_participants cp
  WHERE cp.conversation_id = NEW.conversation_id
    AND cp.deleted_at IS NULL
    AND cp.permanently_blocked = false
  ON CONFLICT (user_id, conversation_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
