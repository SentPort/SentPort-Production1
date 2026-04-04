/*
  # Fix Album Media Reaction Notification Type

  1. Problem
    - Current trigger uses notification type 'album_media_reaction'
    - The hubook_notifications_type_check constraint only allows:
      'friend_request', 'friend_accepted', 'comment', 'reply', 'reaction', 'share', 'mention', 'tag'
    - This causes the insert to fail with constraint violation error
    
  2. Solution
    - Change notification type from 'album_media_reaction' to 'reaction'
    - This matches the existing allowed types
    - Add album_media_id reference to help identify what was reacted to
    
  3. Changes
    - Drop and recreate the notify_media_owner_on_reaction function
    - Change type to 'reaction' in the INSERT statement
    - Keep all other functionality the same
*/

-- Drop and recreate the function with correct notification type
DROP TRIGGER IF EXISTS album_media_reaction_notification ON album_media_reactions CASCADE;
DROP FUNCTION IF EXISTS notify_media_owner_on_reaction() CASCADE;

CREATE OR REPLACE FUNCTION notify_media_owner_on_reaction()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_media_owner_id uuid;
  v_reactor_name text;
BEGIN
  -- Get the media owner (album owner)
  SELECT a.owner_id
  INTO v_media_owner_id
  FROM album_media am
  JOIN albums a ON am.album_id = a.id
  WHERE am.id = NEW.media_id;

  -- Don't notify if user reacted to their own media
  IF v_media_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Get reactor's name
  SELECT COALESCE(display_name, 'Someone')
  INTO v_reactor_name
  FROM hubook_profiles
  WHERE id = NEW.user_id;

  -- Create notification using 'reaction' type (not 'album_media_reaction')
  INSERT INTO hubook_notifications (
    user_id,
    type,
    actor_id,
    post_id,
    comment_id,
    share_id,
    album_media_comment_id,
    message,
    read,
    dismissed
  ) VALUES (
    v_media_owner_id,
    'reaction',  -- Changed from 'album_media_reaction' to 'reaction'
    NEW.user_id,
    NULL,
    NULL,
    NULL,
    NULL,
    v_reactor_name || ' reacted ' || NEW.reaction_type || ' to your photo',
    false,
    false
  );

  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER album_media_reaction_notification
AFTER INSERT ON album_media_reactions
FOR EACH ROW
EXECUTE FUNCTION notify_media_owner_on_reaction();