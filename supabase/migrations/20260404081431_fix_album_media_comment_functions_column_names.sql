/*
  # Fix Album Media Comment Functions Column References

  1. Changes
    - Fix `can_access_album_for_commenting` function to use `owner_id` instead of `user_id`
    - Fix `notify_album_media_comment` function to use `owner_id` instead of `user_id`
    
  2. Reason
    - The `albums` table has `owner_id` column, not `user_id`
    - Functions were referencing non-existent column causing "column does not exist" errors
*/

-- Fix the access control function
CREATE OR REPLACE FUNCTION can_access_album_for_commenting(album_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  album_privacy text;
  album_owner_id uuid;
  is_friend boolean;
BEGIN
  SELECT privacy, owner_id INTO album_privacy, album_owner_id
  FROM albums
  WHERE id = album_uuid;

  IF album_privacy = 'public' THEN
    RETURN true;
  ELSIF album_privacy = 'friends' THEN
    SELECT EXISTS (
      SELECT 1 FROM friends
      WHERE (user_id = album_owner_id AND friend_id = auth.uid() AND status = 'accepted')
         OR (user_id = auth.uid() AND friend_id = album_owner_id AND status = 'accepted')
    ) INTO is_friend;
    RETURN is_friend;
  ELSIF album_privacy = 'private' THEN
    RETURN album_owner_id = auth.uid();
  END IF;

  RETURN false;
END;
$$;

-- Fix the notification trigger function
CREATE OR REPLACE FUNCTION notify_album_media_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  media_owner_id uuid;
  album_owner_id uuid;
BEGIN
  SELECT m.owner_id, a.owner_id
  INTO media_owner_id, album_owner_id
  FROM album_media m
  JOIN albums a ON m.album_id = a.id
  WHERE m.id = NEW.media_id;

  IF NEW.user_id != media_owner_id THEN
    INSERT INTO hubook_notifications (user_id, type, actor_id, post_id, comment_id)
    VALUES (media_owner_id, 'album_media_comment', NEW.user_id, NULL, NEW.id);
  END IF;

  IF NEW.user_id != album_owner_id AND album_owner_id != media_owner_id THEN
    INSERT INTO hubook_notifications (user_id, type, actor_id, post_id, comment_id)
    VALUES (album_owner_id, 'album_media_comment', NEW.user_id, NULL, NEW.id);
  END IF;

  RETURN NEW;
END;
$$;
