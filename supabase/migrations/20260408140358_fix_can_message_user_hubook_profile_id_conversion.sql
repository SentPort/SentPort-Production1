/*
  # Fix can_message_user Function - HuBook Profile ID Conversion

  1. Problem
    - can_message_user() receives user_id parameters (auth.users.id)
    - But is_hubook_blocked_either_way() expects hubook_profiles.id
    - This type mismatch causes the blocking check to fail
    - Results in 403 errors when trying to send messages

  2. Solution
    - Drop policy that depends on can_message_user()
    - Drop and recreate can_message_user() to convert user_ids to hubook_profile_ids
    - Recreate the policy
    - Pass the correct profile IDs to is_hubook_blocked_either_way()
    - Add error handling for users without HuBook profiles

  3. Security
    - Maintains SECURITY DEFINER to bypass RLS on privacy checks
    - Still validates all privacy and blocking rules correctly
*/

-- Drop the policy that depends on the function
DROP POLICY IF EXISTS "Users can add participants based on messaging privacy" ON conversation_participants;

-- Drop the existing function
DROP FUNCTION IF EXISTS can_message_user(uuid, uuid);

-- Recreate with proper user_id to hubook_profile_id conversion
CREATE OR REPLACE FUNCTION can_message_user(sender_user_id uuid, recipient_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_sender_profile_id uuid;
  v_recipient_profile_id uuid;
  v_are_friends boolean;
  v_recipient_setting text;
  v_is_blocked boolean;
BEGIN
  -- Convert user_ids to hubook_profile_ids
  SELECT id INTO v_sender_profile_id
  FROM hubook_profiles
  WHERE user_id = sender_user_id;

  SELECT id INTO v_recipient_profile_id
  FROM hubook_profiles
  WHERE user_id = recipient_user_id;

  -- If either user doesn't have a HuBook profile, deny messaging
  IF v_sender_profile_id IS NULL OR v_recipient_profile_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check if either user has blocked the other (now using correct profile IDs)
  SELECT is_hubook_blocked_either_way(v_sender_profile_id, v_recipient_profile_id) INTO v_is_blocked;

  IF v_is_blocked THEN
    RETURN false;
  END IF;

  -- Check if they are friends (friendships table uses hubook_profile_ids)
  SELECT EXISTS (
    SELECT 1 FROM friendships
    WHERE ((requester_id = v_sender_profile_id AND addressee_id = v_recipient_profile_id)
       OR (requester_id = v_recipient_profile_id AND addressee_id = v_sender_profile_id))
    AND status = 'accepted'
  ) INTO v_are_friends;

  -- Get recipient's messaging setting (privacy settings use user_id, not profile_id)
  SELECT COALESCE(messaging_privacy, 'everyone') INTO v_recipient_setting
  FROM user_privacy_settings
  WHERE user_id = recipient_user_id;

  -- Apply privacy rules
  IF v_recipient_setting = 'everyone' THEN
    RETURN true;
  ELSIF v_recipient_setting = 'friends' OR v_recipient_setting = 'friends_only' THEN
    RETURN v_are_friends;
  ELSIF v_recipient_setting = 'nobody' OR v_recipient_setting = 'no_one' THEN
    RETURN false;
  ELSE
    RETURN true; -- Default to everyone if setting not found
  END IF;
END;
$function$;

-- Recreate the policy with the updated function
CREATE POLICY "Users can add participants based on messaging privacy"
  ON conversation_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow users to always add themselves to any conversation
    user_id = auth.uid()
    OR
    -- For adding others, check messaging privacy (only applies when adding the OTHER person)
    can_message_user(auth.uid(), user_id)
  );
