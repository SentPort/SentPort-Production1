/*
  # Fix can_message_user Function Column Name Errors

  1. Problem
    - Message button failing with error: column "user_id" does not exist
    - can_message_user function had incorrect column references
    - Was using user_id/friend_id instead of requester_id/addressee_id for friendships table
    - Was using who_can_message instead of messaging_privacy for user_privacy_settings table

  2. Changes
    - Fix friendships query to use correct columns: requester_id and addressee_id
    - Fix user_privacy_settings query to use correct column: messaging_privacy
    - Maintains all existing security checks (blocking, privacy, friendship)

  3. Security
    - Function remains SECURITY DEFINER
    - All privacy and blocking checks preserved
    - No changes to access control logic
*/

-- Replace can_message_user function with correct column names
CREATE OR REPLACE FUNCTION can_message_user(sender_id uuid, recipient_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_are_friends boolean;
  v_recipient_setting text;
  v_is_blocked boolean;
BEGIN
  -- Check if either user has blocked the other
  SELECT is_hubook_blocked_either_way(sender_id, recipient_id) INTO v_is_blocked;

  IF v_is_blocked THEN
    RETURN false;
  END IF;

  -- Check if they are friends (using correct column names: requester_id and addressee_id)
  SELECT EXISTS (
    SELECT 1 FROM friendships
    WHERE ((requester_id = sender_id AND addressee_id = recipient_id)
       OR (requester_id = recipient_id AND addressee_id = sender_id))
    AND status = 'accepted'
  ) INTO v_are_friends;

  -- Get recipient's messaging setting (using correct column name: messaging_privacy)
  SELECT COALESCE(messaging_privacy, 'everyone') INTO v_recipient_setting
  FROM user_privacy_settings
  WHERE user_id = recipient_id;

  -- Apply privacy rules
  IF v_recipient_setting = 'everyone' THEN
    RETURN true;
  ELSIF v_recipient_setting = 'friends' THEN
    RETURN v_are_friends;
  ELSIF v_recipient_setting = 'nobody' THEN
    RETURN false;
  ELSE
    RETURN true; -- Default to everyone if setting not found
  END IF;
END;
$function$;
