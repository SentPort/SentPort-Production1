/*
  # Fix Album Media Comment Functions Column References

  1. Changes
    - Fix `can_access_album_for_commenting` function to use `owner_id` instead of `user_id`
    - Fix friendships table column references to use `requester_id` and `addressee_id`
    - Fix `notify_album_media_comment` function to use `owner_id` instead of `user_id`
    - Remove unused `media_owner_id` variable from notification function

  2. Details
    - The 2-parameter version of `can_access_album_for_commenting` was referencing `albums.user_id` which doesn't exist
    - Should reference `albums.owner_id` instead
    - The friendships check was using wrong column names
    - The notification trigger was also using `albums.user_id` instead of `albums.owner_id`
*/

-- Fix the 2-parameter access control function
CREATE OR REPLACE FUNCTION can_access_album_for_commenting(album_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  album_privacy text;
  album_owner_id uuid;
  are_friends boolean;
BEGIN
  -- Get album privacy and owner
  SELECT privacy, owner_id INTO album_privacy, album_owner_id
  FROM albums
  WHERE id = album_uuid;

  -- Owner can always access
  IF album_owner_id = user_uuid THEN
    RETURN true;
  END IF;

  -- Public albums are accessible to all authenticated users
  IF album_privacy = 'public' THEN
    RETURN true;
  END IF;

  -- Friends-only albums require friendship
  IF album_privacy = 'friends' THEN
    SELECT EXISTS (
      SELECT 1 FROM friendships
      WHERE ((requester_id = album_owner_id AND addressee_id = user_uuid) OR
             (requester_id = user_uuid AND addressee_id = album_owner_id))
        AND status = 'accepted'
    ) INTO are_friends;
    RETURN are_friends;
  END IF;

  -- Only-me albums are not accessible to others
  RETURN false;
END;
$$;

-- Fix the notification trigger function
CREATE OR REPLACE FUNCTION notify_album_media_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  album_owner_id uuid;
  parent_comment_author_id uuid;
  commenter_name text;
  album_name text;
BEGIN
  -- Get commenter's name
  SELECT display_name INTO commenter_name
  FROM hubook_profiles
  WHERE id = NEW.author_id;

  -- Get album owner (media owner is the album owner)
  SELECT a.owner_id, a.album_name INTO album_owner_id, album_name
  FROM album_media am
  JOIN albums a ON am.album_id = a.id
  WHERE am.id = NEW.media_id;

  -- If this is a reply to another comment
  IF NEW.parent_comment_id IS NOT NULL THEN
    -- Get the parent comment author
    SELECT author_id INTO parent_comment_author_id
    FROM album_media_comments
    WHERE id = NEW.parent_comment_id;

    -- Notify parent comment author (if not the same person)
    IF parent_comment_author_id IS NOT NULL AND parent_comment_author_id != NEW.author_id THEN
      INSERT INTO notifications (user_id, type, content, related_id, related_type, actor_id)
      VALUES (
        parent_comment_author_id,
        'comment_reply',
        commenter_name || ' replied to your comment on a photo',
        NEW.id,
        'media_comment',
        NEW.author_id
      );
    END IF;
  END IF;

  -- Notify album owner about new comment (if not commenting on own media and not already notified as parent)
  IF album_owner_id IS NOT NULL AND 
     album_owner_id != NEW.author_id AND 
     (NEW.parent_comment_id IS NULL OR album_owner_id != parent_comment_author_id) THEN
    INSERT INTO notifications (user_id, type, content, related_id, related_type, actor_id)
    VALUES (
      album_owner_id,
      'photo_comment',
      commenter_name || ' commented on your photo in "' || album_name || '"',
      NEW.media_id,
      'album_media',
      NEW.author_id
    );
  END IF;

  RETURN NEW;
END;
$$;
