/*
  # Fix Album Media Reaction Notifications Schema

  1. Problem
    - Current trigger tries to insert into non-existent columns: 'title' and 'link'
    - The hubook_notifications table only has: user_id, type, actor_id, post_id, comment_id, 
      share_id, album_media_comment_id, message, read, dismissed, created_at
    
  2. Solution
    - Update INSERT statement to use correct columns
    - Use 'actor_id' for the reactor's user ID
    - Use 'message' for the notification text
    - Add 'read' and 'dismissed' columns with default false values
    - Set unused foreign key columns to NULL
    - Remove non-existent 'title' and 'link' columns

  3. Notification Structure
    - user_id: The media owner who receives the notification
    - type: 'album_media_reaction'
    - actor_id: The user who reacted
    - message: Simple text message describing the reaction
    - All other FK columns (post_id, comment_id, share_id, album_media_comment_id): NULL

  4. Security
    - Maintains SECURITY DEFINER for proper RLS bypass during notification creation
*/

-- Drop and recreate the function with correct schema
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

  -- Create notification using correct schema
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
    'album_media_reaction',
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