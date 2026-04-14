/*
  # Extend HuBlog Messaging System

  ## Summary
  Brings HuBlog messaging to full feature parity with HuBook and Heddit messaging.

  ## Changes

  ### 1. blog_conversation_participants
  - Add `is_favorite` (boolean) - user can star a conversation
  - Add `is_hidden` (boolean) - user soft-hides the conversation from their list
  - Add `hidden_at` (timestamptz) - when it was hidden
  - Add `deleted_at` (timestamptz) - soft delete (user deleted conversation)
  - Add `permanently_blocked` (boolean) - user permanently blocked the conversation
  - Add `unread_count` (integer) - per-user unread message count

  ### 2. blog_notifications
  - Add `conversation_id` (uuid) - links notification to a conversation
  - Add `message_id` (uuid) - links notification to a specific message
  - Add `message` value to `blog_notification_type` enum

  ### 3. Database Functions & Triggers
  - `find_or_create_blog_conversation` RPC - finds or creates a conversation and ensures both participants are in blog_conversation_participants
  - `update_blog_conversation_on_message` trigger - updates last_message_at and unread_count on new message
  - `notify_blog_message_received` trigger - inserts message notification into blog_notifications
  - `blog_restore_or_block_conversation` trigger - restores hidden convos on new message, blocks permanently blocked ones

  ### 4. Security
  - All new columns have appropriate defaults
  - Existing RLS policies remain valid
  - New participant INSERT policy allows trigger-based insertions
*/

-- 1. Extend blog_conversation_participants
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_conversation_participants' AND column_name = 'is_favorite') THEN
    ALTER TABLE blog_conversation_participants ADD COLUMN is_favorite boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_conversation_participants' AND column_name = 'is_hidden') THEN
    ALTER TABLE blog_conversation_participants ADD COLUMN is_hidden boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_conversation_participants' AND column_name = 'hidden_at') THEN
    ALTER TABLE blog_conversation_participants ADD COLUMN hidden_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_conversation_participants' AND column_name = 'deleted_at') THEN
    ALTER TABLE blog_conversation_participants ADD COLUMN deleted_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_conversation_participants' AND column_name = 'permanently_blocked') THEN
    ALTER TABLE blog_conversation_participants ADD COLUMN permanently_blocked boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_conversation_participants' AND column_name = 'unread_count') THEN
    ALTER TABLE blog_conversation_participants ADD COLUMN unread_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 2. Add message type to blog_notification_type enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'blog_notification_type' AND e.enumlabel = 'message'
  ) THEN
    ALTER TYPE blog_notification_type ADD VALUE 'message';
  END IF;
END $$;

-- 3. Add conversation_id and message_id to blog_notifications
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_notifications' AND column_name = 'conversation_id') THEN
    ALTER TABLE blog_notifications ADD COLUMN conversation_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_notifications' AND column_name = 'message_id') THEN
    ALTER TABLE blog_notifications ADD COLUMN message_id uuid;
  END IF;
END $$;

-- 4. Ensure blog_conversation_participants has the right policies for trigger inserts
-- Drop and recreate the INSERT policy to allow service-role inserts from triggers
DROP POLICY IF EXISTS "Users can join conversations as participants" ON blog_conversation_participants;

CREATE POLICY "Users can join conversations as participants"
  ON blog_conversation_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (account_id = auth.uid());

-- Also allow the find_or_create function (security definer) to insert
-- The SECURITY DEFINER function will bypass RLS

-- 5. Create the find_or_create_blog_conversation RPC
CREATE OR REPLACE FUNCTION find_or_create_blog_conversation(
  p_user_a_id uuid,
  p_user_b_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conversation_id uuid;
  v_ids uuid[];
  v_id1 uuid;
  v_id2 uuid;
BEGIN
  -- Sort IDs for consistent ordering
  v_ids := ARRAY[p_user_a_id, p_user_b_id];
  v_ids := ARRAY(SELECT unnest(v_ids) ORDER BY 1);
  v_id1 := v_ids[1];
  v_id2 := v_ids[2];

  -- Check for existing conversation between these two users (not permanently blocked by caller)
  SELECT bc.id INTO v_conversation_id
  FROM blog_conversations bc
  JOIN blog_conversation_participants bcp1 ON bcp1.conversation_id = bc.id AND bcp1.account_id = p_user_a_id
  JOIN blog_conversation_participants bcp2 ON bcp2.conversation_id = bc.id AND bcp2.account_id = p_user_b_id
  WHERE bcp1.permanently_blocked = false AND bcp2.permanently_blocked = false
  LIMIT 1;

  IF v_conversation_id IS NOT NULL THEN
    -- Restore if soft-deleted by caller
    UPDATE blog_conversation_participants
    SET deleted_at = NULL, is_hidden = false, hidden_at = NULL
    WHERE conversation_id = v_conversation_id
      AND account_id = p_user_a_id
      AND deleted_at IS NOT NULL;
    RETURN v_conversation_id;
  END IF;

  -- Create new conversation
  INSERT INTO blog_conversations (participant_1_id, participant_2_id)
  VALUES (v_id1, v_id2)
  RETURNING id INTO v_conversation_id;

  -- Insert both participants
  INSERT INTO blog_conversation_participants (conversation_id, account_id)
  VALUES (v_conversation_id, p_user_a_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO blog_conversation_participants (conversation_id, account_id)
  VALUES (v_conversation_id, p_user_b_id)
  ON CONFLICT DO NOTHING;

  RETURN v_conversation_id;
END;
$$;

-- 6. Trigger: update conversation last_message_at and recipient unread_count on new message
CREATE OR REPLACE FUNCTION update_blog_conversation_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update conversation last_message_at
  UPDATE blog_conversations
  SET last_message_at = NEW.created_at,
      updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;

  -- Increment unread_count for all participants except the sender
  UPDATE blog_conversation_participants
  SET unread_count = unread_count + 1,
      -- Restore hidden/soft-deleted state when a new message arrives
      is_hidden = CASE WHEN deleted_at IS NULL THEN is_hidden ELSE false END,
      hidden_at = CASE WHEN deleted_at IS NULL THEN hidden_at ELSE NULL END,
      deleted_at = NULL
  WHERE conversation_id = NEW.conversation_id
    AND account_id != NEW.sender_id
    AND permanently_blocked = false;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_blog_conversation_on_message ON blog_messages;
CREATE TRIGGER trg_update_blog_conversation_on_message
  AFTER INSERT ON blog_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_conversation_on_message();

-- 7. Trigger: block message delivery into permanently blocked conversations
CREATE OR REPLACE FUNCTION blog_check_permanent_block()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_blocked boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM blog_conversation_participants
    WHERE conversation_id = NEW.conversation_id
      AND permanently_blocked = true
  ) INTO v_blocked;

  IF v_blocked THEN
    RAISE EXCEPTION 'This conversation has been permanently closed.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_blog_check_permanent_block ON blog_messages;
CREATE TRIGGER trg_blog_check_permanent_block
  BEFORE INSERT ON blog_messages
  FOR EACH ROW
  EXECUTE FUNCTION blog_check_permanent_block();

-- 8. Trigger: send message notification to recipient
CREATE OR REPLACE FUNCTION notify_blog_message_received()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recipient_id uuid;
  v_sender_display_name text;
BEGIN
  -- Get the recipient (the other participant)
  SELECT bcp.account_id INTO v_recipient_id
  FROM blog_conversation_participants bcp
  WHERE bcp.conversation_id = NEW.conversation_id
    AND bcp.account_id != NEW.sender_id
    AND bcp.permanently_blocked = false
  LIMIT 1;

  IF v_recipient_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get sender display name
  SELECT display_name INTO v_sender_display_name
  FROM blog_accounts
  WHERE id = NEW.sender_id;

  -- Insert notification
  INSERT INTO blog_notifications (
    recipient_id,
    actor_id,
    type,
    message,
    conversation_id,
    message_id
  ) VALUES (
    v_recipient_id,
    NEW.sender_id,
    'message',
    v_sender_display_name || ' sent you a message',
    NEW.conversation_id,
    NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_blog_message_received ON blog_messages;
CREATE TRIGGER trg_notify_blog_message_received
  AFTER INSERT ON blog_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_blog_message_received();

-- 9. Ensure blog_messages UPDATE policy allows recipients to mark messages as read
DROP POLICY IF EXISTS "Users can mark messages as read in their conversations" ON blog_messages;
CREATE POLICY "Users can mark messages as read in their conversations"
  ON blog_messages
  FOR UPDATE
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id FROM blog_conversation_participants
      WHERE account_id = auth.uid()
    )
  );

-- 10. Policy for reading participant rows to get unread counts
DROP POLICY IF EXISTS "Users can update their own participant record" ON blog_conversation_participants;
CREATE POLICY "Users can update their own participant record"
  ON blog_conversation_participants
  FOR UPDATE
  TO authenticated
  USING (account_id = auth.uid())
  WITH CHECK (account_id = auth.uid());

-- 11. Backfill: ensure all existing conversations have participant rows
INSERT INTO blog_conversation_participants (conversation_id, account_id)
SELECT bc.id, bc.participant_1_id
FROM blog_conversations bc
WHERE bc.participant_1_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM blog_conversation_participants bcp
    WHERE bcp.conversation_id = bc.id AND bcp.account_id = bc.participant_1_id
  )
ON CONFLICT DO NOTHING;

INSERT INTO blog_conversation_participants (conversation_id, account_id)
SELECT bc.id, bc.participant_2_id
FROM blog_conversations bc
WHERE bc.participant_2_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM blog_conversation_participants bcp
    WHERE bcp.conversation_id = bc.id AND bcp.account_id = bc.participant_2_id
  )
ON CONFLICT DO NOTHING;
