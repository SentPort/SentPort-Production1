/*
  # Fix heddit conversation trigger - remove broken ON CONFLICT

  ## Problem
  The `update_heddit_conversation_on_message` trigger tried to INSERT a new
  conversation with `ON CONFLICT (participant_one_id, participant_two_id)`, but
  that unique constraint was previously dropped to allow multiple conversations.
  This caused every message insert to fail with a 400 "there is no unique or
  exclusion constraint matching the ON CONFLICT specification" error.

  ## Fix
  Rewrite the trigger to simply UPDATE the existing conversation row using
  `NEW.conversation_id`, which is already present on the inserted message.
  No INSERT is needed because the conversation must already exist before a
  message can reference it (enforced by the foreign key).

  ## Changes
  - Drops and recreates `update_heddit_conversation_on_message` function
  - Trigger binding remains the same (AFTER INSERT ON heddit_messages)
*/

CREATE OR REPLACE FUNCTION update_heddit_conversation_on_message()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_participant_one_id uuid;
BEGIN
  SELECT participant_one_id INTO v_participant_one_id
  FROM heddit_conversations
  WHERE id = NEW.conversation_id;

  UPDATE heddit_conversations
  SET
    last_message_at = NEW.created_at,
    last_message_content = NEW.content,
    unread_count_one = CASE
      WHEN NEW.recipient_id = participant_one_id THEN unread_count_one + 1
      ELSE unread_count_one
    END,
    unread_count_two = CASE
      WHEN NEW.recipient_id = participant_two_id THEN unread_count_two + 1
      ELSE unread_count_two
    END
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_heddit_conversation ON heddit_messages;
CREATE TRIGGER trigger_update_heddit_conversation
  AFTER INSERT ON heddit_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_heddit_conversation_on_message();
