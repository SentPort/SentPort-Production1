/*
  # Fix Album Media Reaction Notification Type

  1. Problem
    - The notify_media_owner_on_reaction function uses type 'album_media_reaction'
    - The hubook_notifications table check constraint only allows: 'friend_request', 'friend_accepted', 
      'comment', 'reply', 'reaction', 'share', 'mention', 'tag'
    - Database rejects inserts with error: "new row for relation \"hubook_notifications\" violates check constraint \"hubook_notifications_type_check\""
    
  2. Solution
    - Change notification type from 'album_media_reaction' to 'reaction'
    - This is the standard type for all reaction notifications in the system
    - Keep all other logic unchanged (display_name, message format, etc.)

  3. Security
    - Maintains SECURITY DEFINER for proper RLS bypass during notification creation
*/

-- Fix the notification type to use standard 'reaction' type
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

  -- Get reactor's name (using display_name from hubook_profiles)
  SELECT COALESCE(display_name, 'Someone')
  INTO v_reactor_name
  FROM hubook_profiles
  WHERE id = NEW.user_id;

  -- Create notification using correct 'reaction' type
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
    'reaction',  -- Changed from 'album_media_reaction' to standard 'reaction' type
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