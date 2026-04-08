/*
  # Add Message Notifications System

  1. Schema Changes
    - Add `conversation_id` column to `hubook_notifications` table
    - Add `message_id` column to `hubook_notifications` table
    - Add `messages_enabled` to notification preferences

  2. New Functions
    - `notify_message_received()` - Creates notifications when messages arrive
    - Updated `should_send_notification()` - Now handles 'message' notification type

  3. Trigger Logic
    - Runs AFTER message insertion
    - Creates notification for all recipients (non-senders)
    - Skips permanently blocked participants
    - Respects user notification preferences

  4. Notification Type
    - Type: 'message'
    - Includes sender info, conversation context, and message preview

  5. Security
    - Uses SECURITY DEFINER to bypass RLS
    - Respects notification preferences
    - Only notifies non-blocked participants
*/

-- Add message-related columns to hubook_notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hubook_notifications' AND column_name = 'conversation_id'
  ) THEN
    ALTER TABLE hubook_notifications ADD COLUMN conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hubook_notifications' AND column_name = 'message_id'
  ) THEN
    ALTER TABLE hubook_notifications ADD COLUMN message_id uuid REFERENCES messages(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add messages_enabled to notification preferences
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hubook_notification_preferences' AND column_name = 'messages_enabled'
  ) THEN
    ALTER TABLE hubook_notification_preferences ADD COLUMN messages_enabled boolean DEFAULT true NOT NULL;
  END IF;
END $$;

-- Update existing records to enable message notifications by default
UPDATE hubook_notification_preferences
SET messages_enabled = true
WHERE messages_enabled IS NULL;

-- Update should_send_notification function to handle message notifications
CREATE OR REPLACE FUNCTION should_send_notification(
  p_user_id uuid,
  p_notification_type text,
  p_current_time timestamptz DEFAULT now()
)
RETURNS boolean AS $$
DECLARE
  v_prefs record;
  v_current_hour int;
BEGIN
  -- Get user preferences
  SELECT * INTO v_prefs
  FROM hubook_notification_preferences
  WHERE user_id = p_user_id;

  -- If no preferences found, default to sending notification
  IF v_prefs IS NULL THEN
    RETURN true;
  END IF;

  -- Check if quiet hours are enabled and active
  IF v_prefs.quiet_hours_enabled THEN
    v_current_hour := EXTRACT(HOUR FROM p_current_time AT TIME ZONE 'UTC');

    -- Handle quiet hours that span midnight
    IF v_prefs.quiet_hours_start <= v_prefs.quiet_hours_end THEN
      IF v_current_hour >= v_prefs.quiet_hours_start AND v_current_hour < v_prefs.quiet_hours_end THEN
        RETURN false;
      END IF;
    ELSE
      IF v_current_hour >= v_prefs.quiet_hours_start OR v_current_hour < v_prefs.quiet_hours_end THEN
        RETURN false;
      END IF;
    END IF;
  END IF;

  -- Check specific notification type preferences
  CASE p_notification_type
    WHEN 'friend_request' THEN
      RETURN v_prefs.friend_requests_enabled;
    WHEN 'friend_accepted' THEN
      RETURN v_prefs.friend_accepted_enabled;
    WHEN 'comment', 'album_media_comment' THEN
      RETURN v_prefs.comments_enabled;
    WHEN 'comment_reply' THEN
      RETURN v_prefs.replies_enabled;
    WHEN 'reaction', 'album_media_reaction' THEN
      RETURN v_prefs.reactions_enabled;
    WHEN 'share' THEN
      RETURN v_prefs.shares_enabled;
    WHEN 'mention' THEN
      RETURN v_prefs.mentions_enabled;
    WHEN 'tag' THEN
      RETURN v_prefs.tags_enabled;
    WHEN 'message' THEN
      RETURN v_prefs.messages_enabled;
    ELSE
      RETURN true;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create message notifications
CREATE OR REPLACE FUNCTION notify_message_received()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name text;
  v_recipient record;
BEGIN
  -- Get sender's display name from user_profiles
  SELECT COALESCE(full_name, display_name, 'Someone') INTO v_sender_name
  FROM user_profiles
  WHERE id = NEW.sender_id;

  -- Create notification for all participants except the sender
  -- Only for those who haven't permanently blocked the conversation
  FOR v_recipient IN
    SELECT cp.user_id
    FROM conversation_participants cp
    WHERE cp.conversation_id = NEW.conversation_id
      AND cp.user_id != NEW.sender_id
      AND cp.permanently_blocked = false
  LOOP
    -- Check if user wants message notifications
    IF should_send_notification(v_recipient.user_id, 'message') THEN
      INSERT INTO hubook_notifications (
        user_id,
        type,
        actor_id,
        conversation_id,
        message_id,
        message
      ) VALUES (
        v_recipient.user_id,
        'message',
        NEW.sender_id,
        NEW.conversation_id,
        NEW.id,
        v_sender_name || ' sent you a message'
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for message notifications
DROP TRIGGER IF EXISTS notify_message_received_trigger ON messages;
CREATE TRIGGER notify_message_received_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_message_received();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_hubook_notifications_conversation_id
  ON hubook_notifications(conversation_id);

CREATE INDEX IF NOT EXISTS idx_hubook_notifications_message_id
  ON hubook_notifications(message_id);
