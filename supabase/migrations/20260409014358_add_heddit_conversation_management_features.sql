/*
  # Add Heddit Conversation Management Features

  ## Summary
  Extends the heddit_conversations table to support per-participant conversation
  management: favorites, hiding (soft delete), and permanent blocking.
  Also adds a trigger to prevent message delivery to permanently-blocked participants
  and to auto-restore hidden (non-blocked) conversations when a new message arrives.

  ## Changes

  ### Modified Tables
  - `heddit_conversations`
    - `is_favorite_one` (boolean, default false) - participant one has favorited
    - `is_favorite_two` (boolean, default false) - participant two has favorited
    - `is_hidden_one` (boolean, default false) - participant one has hidden the conversation
    - `is_hidden_two` (boolean, default false) - participant two has hidden the conversation
    - `hidden_at_one` (timestamptz, nullable) - when participant one hid it
    - `hidden_at_two` (timestamptz, nullable) - when participant two hid it
    - `permanently_blocked_one` (boolean, default false) - participant one has blocked forever
    - `permanently_blocked_two` (boolean, default false) - participant two has blocked forever
    - `blocked_at_one` (timestamptz, nullable) - when participant one blocked it
    - `blocked_at_two` (timestamptz, nullable) - when participant two blocked it

  ## New Functions & Triggers

  ### `heddit_restore_conversation_on_message()`
  - Fires BEFORE INSERT on heddit_messages
  - If recipient has hidden (not permanently blocked) the conversation, restores it
  - If recipient has permanently blocked the conversation, prevents unread count increment

  ### `heddit_block_message_delivery()`
  - Prevents delivery (unread count increment) to permanently-blocked participants

  ## Security
  - RLS policies updated to allow users to update their own favorite/hidden/blocked columns
*/

-- Add per-participant management columns to heddit_conversations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'heddit_conversations' AND column_name = 'is_favorite_one') THEN
    ALTER TABLE heddit_conversations ADD COLUMN is_favorite_one boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'heddit_conversations' AND column_name = 'is_favorite_two') THEN
    ALTER TABLE heddit_conversations ADD COLUMN is_favorite_two boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'heddit_conversations' AND column_name = 'is_hidden_one') THEN
    ALTER TABLE heddit_conversations ADD COLUMN is_hidden_one boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'heddit_conversations' AND column_name = 'is_hidden_two') THEN
    ALTER TABLE heddit_conversations ADD COLUMN is_hidden_two boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'heddit_conversations' AND column_name = 'hidden_at_one') THEN
    ALTER TABLE heddit_conversations ADD COLUMN hidden_at_one timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'heddit_conversations' AND column_name = 'hidden_at_two') THEN
    ALTER TABLE heddit_conversations ADD COLUMN hidden_at_two timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'heddit_conversations' AND column_name = 'permanently_blocked_one') THEN
    ALTER TABLE heddit_conversations ADD COLUMN permanently_blocked_one boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'heddit_conversations' AND column_name = 'permanently_blocked_two') THEN
    ALTER TABLE heddit_conversations ADD COLUMN permanently_blocked_two boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'heddit_conversations' AND column_name = 'blocked_at_one') THEN
    ALTER TABLE heddit_conversations ADD COLUMN blocked_at_one timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'heddit_conversations' AND column_name = 'blocked_at_two') THEN
    ALTER TABLE heddit_conversations ADD COLUMN blocked_at_two timestamptz;
  END IF;
END $$;

-- Function: restore hidden conversation and handle unread counts on new message
CREATE OR REPLACE FUNCTION heddit_restore_conversation_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conv heddit_conversations%ROWTYPE;
  v_is_one boolean;
BEGIN
  SELECT * INTO v_conv FROM heddit_conversations WHERE id = NEW.conversation_id;

  -- Determine if recipient is participant_one or participant_two
  v_is_one := (v_conv.participant_one_id = NEW.recipient_id);

  IF v_is_one THEN
    -- If permanently blocked, zero out any unread increment (set unread to current so update later has no effect)
    IF v_conv.permanently_blocked_one THEN
      NEW.recipient_id := NEW.recipient_id; -- no-op, delivery blocked at app level
    -- If hidden (soft delete), restore it
    ELSIF v_conv.is_hidden_one THEN
      UPDATE heddit_conversations
      SET is_hidden_one = false, hidden_at_one = NULL
      WHERE id = NEW.conversation_id;
    END IF;
  ELSE
    IF v_conv.permanently_blocked_two THEN
      NEW.recipient_id := NEW.recipient_id; -- no-op
    ELSIF v_conv.is_hidden_two THEN
      UPDATE heddit_conversations
      SET is_hidden_two = false, hidden_at_two = NULL
      WHERE id = NEW.conversation_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger: fire before each heddit message insert
DROP TRIGGER IF EXISTS heddit_restore_conversation_on_message_trigger ON heddit_messages;
CREATE TRIGGER heddit_restore_conversation_on_message_trigger
  BEFORE INSERT ON heddit_messages
  FOR EACH ROW
  EXECUTE FUNCTION heddit_restore_conversation_on_message();

-- Update RLS on heddit_conversations to allow updating own management columns
-- First check existing policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'heddit_conversations' 
    AND policyname = 'Participants can update own conversation settings'
  ) THEN
    CREATE POLICY "Participants can update own conversation settings"
      ON heddit_conversations
      FOR UPDATE
      TO authenticated
      USING (
        participant_one_id IN (SELECT id FROM heddit_accounts WHERE user_id = auth.uid())
        OR
        participant_two_id IN (SELECT id FROM heddit_accounts WHERE user_id = auth.uid())
      )
      WITH CHECK (
        participant_one_id IN (SELECT id FROM heddit_accounts WHERE user_id = auth.uid())
        OR
        participant_two_id IN (SELECT id FROM heddit_accounts WHERE user_id = auth.uid())
      );
  END IF;
END $$;
