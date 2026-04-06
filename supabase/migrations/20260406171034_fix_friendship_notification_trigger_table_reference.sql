/*
  # Fix Friendship Notification Trigger Table Reference

  ## Changes
  - Update `trigger_friendship_notification()` function to query `hubook_profiles` instead of `user_profiles`
  - Fixes error: column "display_name" does not exist in user_profiles table
  
  ## Impact
  - Resolves the "Add Friend" button error that prevented friend requests from being sent
  - Ensures notifications are created with correct display names from the hubook_profiles table
*/

CREATE OR REPLACE FUNCTION public.trigger_friendship_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_requester_name text;
  v_addressee_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get requester's display name from hubook_profiles
    SELECT display_name INTO v_requester_name
    FROM hubook_profiles
    WHERE id = NEW.requester_id;

    -- Notify addressee of friend request
    IF should_send_notification(NEW.addressee_id, 'friend_request') THEN
      INSERT INTO hubook_notifications (user_id, type, actor_id, message)
      VALUES (
        NEW.addressee_id,
        'friend_request',
        NEW.requester_id,
        v_requester_name || ' sent you a friend request'
      );
    END IF;

  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    -- Get addressee's display name from hubook_profiles
    SELECT display_name INTO v_addressee_name
    FROM hubook_profiles
    WHERE id = NEW.addressee_id;

    -- Notify requester that request was accepted
    IF should_send_notification(NEW.requester_id, 'friend_accepted') THEN
      INSERT INTO hubook_notifications (user_id, type, actor_id, message)
      VALUES (
        NEW.requester_id,
        'friend_accepted',
        NEW.addressee_id,
        v_addressee_name || ' accepted your friend request'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;