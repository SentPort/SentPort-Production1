/*
  # Add Force New Conversation Parameter

  1. Purpose
    - Allow users to start completely fresh conversations even when one already exists
    - Useful when both parties want to start over without old message history
    - Each user can delete their old conversations independently

  2. Changes
    - Add optional force_new parameter to find_or_create_conversation function
    - When force_new is true, always create a new conversation
    - When force_new is false (default), use existing behavior
    - Maintains all existing privacy checks and access controls

  3. Security
    - Still requires can_message_user permission check
    - Properly populates conversation_participants and user_conversation_access
    - No changes to RLS policies
*/

-- Update find_or_create_conversation to support force_new parameter
CREATE OR REPLACE FUNCTION find_or_create_conversation(
  user_a_id uuid,
  user_b_id uuid,
  force_new boolean DEFAULT false
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

  -- If force_new is true, skip finding existing conversation and create new one
  IF NOT force_new THEN
    -- Try to find existing conversation between these two users
    -- Exclude conversations that user_a has soft-deleted (deleted_at IS NOT NULL)
    SELECT cp1.conversation_id INTO v_conversation_id
    FROM conversation_participants cp1
    WHERE cp1.user_id = user_a_id
      AND cp1.deleted_at IS NULL
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

    -- If conversation exists and user hasn't deleted it, return it
    IF v_conversation_id IS NOT NULL THEN
      RETURN v_conversation_id;
    END IF;

    -- Check if there's a conversation that user_a previously deleted
    -- If so, restore it by clearing deleted_at
    SELECT cp1.conversation_id INTO v_conversation_id
    FROM conversation_participants cp1
    WHERE cp1.user_id = user_a_id
      AND cp1.deleted_at IS NOT NULL
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

    -- If we found a deleted conversation, restore it
    IF v_conversation_id IS NOT NULL THEN
      -- Clear deleted_at to restore access
      UPDATE conversation_participants
      SET deleted_at = NULL
      WHERE conversation_id = v_conversation_id
        AND user_id = user_a_id;

      -- Restore message visibility for all messages in this conversation
      INSERT INTO message_visibility (message_id, user_id)
      SELECT m.id, user_a_id
      FROM messages m
      WHERE m.conversation_id = v_conversation_id
      ON CONFLICT (message_id, user_id) DO NOTHING;

      -- Ensure helper table access
      INSERT INTO user_conversation_access (user_id, conversation_id)
      VALUES (user_a_id, v_conversation_id)
      ON CONFLICT (user_id, conversation_id) DO NOTHING;

      RETURN v_conversation_id;
    END IF;
  END IF;

  -- Create new conversation (either force_new is true, or no existing conversation found)
  INSERT INTO conversations DEFAULT VALUES
  RETURNING id INTO v_conversation_id;

  -- Add both participants
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES
    (v_conversation_id, user_a_id),
    (v_conversation_id, user_b_id);

  -- Directly populate user_conversation_access helper table
  INSERT INTO user_conversation_access (user_id, conversation_id)
  VALUES
    (user_a_id, v_conversation_id),
    (user_b_id, v_conversation_id)
  ON CONFLICT (user_id, conversation_id) DO NOTHING;

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
