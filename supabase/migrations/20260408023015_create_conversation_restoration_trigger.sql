/*
  # Create Conversation Restoration Trigger

  1. New Functions
    - `restore_conversation_on_new_message()` - Automatically restores hidden conversations when messages arrive

  2. Trigger Logic
    - Runs BEFORE message insertion
    - Finds all participants who deleted the conversation (deleted_at IS NOT NULL)
    - Only restores if permanently_blocked = false
    - Skips restoration if permanently_blocked = true
    - Updates joined_at to sort restored conversations to top

  3. Security
    - Uses SECURITY DEFINER to bypass RLS
    - Only affects non-blocked participants
    - Respects user's permanent block preferences

  4. Important Notes
    - This trigger fires BEFORE the message_visibility trigger
    - Ensures conversations are restored before visibility records are created
    - Only the OTHER user's message can restore a conversation (sender != participant)
*/

-- Function to restore conversations when new messages arrive from the other user
CREATE OR REPLACE FUNCTION restore_conversation_on_new_message()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Restore conversation for participants who had deleted it
  -- ONLY if they haven't permanently blocked it
  -- ONLY if the sender is NOT the participant (other user is sending)
  UPDATE conversation_participants
  SET
    deleted_at = NULL,
    joined_at = now()
  WHERE conversation_id = NEW.conversation_id
    AND deleted_at IS NOT NULL
    AND permanently_blocked = false
    AND user_id != NEW.sender_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to restore conversations before message visibility is created
DROP TRIGGER IF EXISTS restore_conversation_on_new_message_trigger ON messages;
CREATE TRIGGER restore_conversation_on_new_message_trigger
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION restore_conversation_on_new_message();
