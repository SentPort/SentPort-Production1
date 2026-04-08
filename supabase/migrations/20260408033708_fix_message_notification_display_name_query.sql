/*
  # Fix Message Notification Display Name Query

  1. Problem
    - The notify_message_received() function queries display_name from user_profiles
    - display_name column doesn't exist in user_profiles
    - display_name exists in hubook_profiles table
    - This causes "column 'display_name' does not exist" error when sending messages

  2. Solution
    - Update the function to properly join hubook_profiles with user_profiles
    - Use COALESCE to fall back gracefully:
      1. First try hubook_profiles.display_name
      2. Fall back to user_profiles.full_name
      3. Finally fall back to 'Someone'

  3. Impact
    - Fixes message sending errors in HuBook messaging system
    - Properly handles users who haven't set up HuBook profiles yet
    - Maintains existing notification functionality
*/

-- Fix notify_message_received function to query display_name from correct table
CREATE OR REPLACE FUNCTION notify_message_received()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name text;
  v_recipient record;
BEGIN
  -- Get sender's display name from hubook_profiles, fall back to user_profiles full_name
  SELECT COALESCE(hp.display_name, up.full_name, 'Someone') INTO v_sender_name
  FROM user_profiles up
  LEFT JOIN hubook_profiles hp ON hp.user_id = up.id
  WHERE up.id = NEW.sender_id;

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