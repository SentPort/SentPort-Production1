/*
  # Fix Album Media Comment Notification Types

  1. Problem
    - The `notify_album_media_comment()` trigger function uses invalid notification types
    - Types `'comment_reply'` and `'album_media_comment'` violate the check constraint
    - Valid types are: 'friend_request', 'friend_accepted', 'comment', 'reply', 'reaction', 'share', 'mention', 'tag'

  2. Changes
    - Drop and recreate the trigger function with correct notification types
    - Use `'reply'` instead of `'comment_reply'` for comment replies
    - Use `'comment'` instead of `'album_media_comment'` for new comments on photos
    - Maintain all existing logic for notifying album owners and parent comment authors

  3. Security
    - Function remains SECURITY DEFINER to bypass RLS during notification creation
    - All existing notification logic preserved
*/

-- Drop and recreate the notification trigger function with correct types
CREATE OR REPLACE FUNCTION notify_album_media_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      INSERT INTO hubook_notifications (user_id, type, message, actor_id, comment_id)
      VALUES (
        parent_comment_author_id,
        'reply',
        commenter_name || ' replied to your comment on a photo',
        NEW.author_id,
        NEW.id
      );
    END IF;
  END IF;

  -- Notify album owner about new comment (if not commenting on own media and not already notified as parent)
  IF album_owner_id IS NOT NULL AND
     album_owner_id != NEW.author_id AND
     (NEW.parent_comment_id IS NULL OR album_owner_id != parent_comment_author_id) THEN
    INSERT INTO hubook_notifications (user_id, type, message, actor_id, comment_id)
    VALUES (
      album_owner_id,
      'comment',
      commenter_name || ' commented on your photo in "' || album_name || '"',
      NEW.author_id,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;
