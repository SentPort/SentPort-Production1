/*
  # Fix Album Media Reaction Notification Trigger

  1. Changes
    - Update `notify_media_owner_on_reaction` function to use correct column name
    - Change from `COALESCE(full_name, display_name, 'Someone')` to `COALESCE(display_name, 'Someone')`
    - The `hubook_profiles` table only has `display_name`, not `full_name`

  2. Security
    - Maintains SECURITY DEFINER for proper RLS bypass
    - No changes to notification logic or security model
*/

-- Fix the notification trigger function to use the correct column name
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

  -- Get reactor's name (using display_name, not full_name)
  SELECT COALESCE(display_name, 'Someone')
  INTO v_reactor_name
  FROM hubook_profiles
  WHERE id = NEW.user_id;

  -- Create notification
  INSERT INTO hubook_notifications (
    user_id,
    type,
    title,
    message,
    link,
    created_at
  ) VALUES (
    v_media_owner_id,
    'album_media_reaction',
    'New Reaction',
    v_reactor_name || ' reacted ' || NEW.reaction_type || ' to your photo',
    '/hubook/albums/' || (SELECT album_id FROM album_media WHERE id = NEW.media_id),
    now()
  );

  RETURN NEW;
END;
$$;
