/*
  # Fix Album Media Comment Notifications - Correct Types and Columns

  1. Problem
    - Previous migration uses invalid notification types: 'album_media_comment' and 'album_media_comment_reply'
    - These types violate the check constraint on hubook_notifications table
    - Valid types are: 'friend_request', 'friend_accepted', 'comment', 'reply', 'reaction', 'share', 'mention', 'tag'
    - Also using wrong column: album_media_comment_id instead of comment_id

  2. Changes
    - Replace 'album_media_comment_reply' with 'reply'
    - Replace 'album_media_comment' with 'comment'
    - Use 'comment_id' column instead of 'album_media_comment_id'
    - Include commenter display name and album name in messages
    - Keep the correct JOIN logic to get album owner

  3. Security
    - Function remains SECURITY DEFINER to bypass RLS during notification creation
    - All existing RLS policies remain unchanged
*/

-- Drop and recreate the function with correct notification types
DROP TRIGGER IF EXISTS album_media_comment_notification ON album_media_comments CASCADE;
DROP FUNCTION IF EXISTS notify_album_media_comment() CASCADE;

CREATE OR REPLACE FUNCTION notify_album_media_comment()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  media_owner_id uuid;
  parent_comment_author_id uuid;
  commenter_name text;
  album_name text;
BEGIN
  -- Get commenter's display name
  SELECT display_name INTO commenter_name
  FROM hubook_profiles
  WHERE id = NEW.author_id;

  -- Get the owner of the album and album name (via JOIN with albums table)
  SELECT a.owner_id, a.album_name INTO media_owner_id, album_name
  FROM album_media am
  JOIN albums a ON am.album_id = a.id
  WHERE am.id = NEW.media_id;

  -- If this is a reply to another comment
  IF NEW.parent_comment_id IS NOT NULL THEN
    -- Get the author of the parent comment
    SELECT author_id INTO parent_comment_author_id
    FROM album_media_comments
    WHERE id = NEW.parent_comment_id;

    -- Notify the parent comment author (if not replying to themselves)
    IF parent_comment_author_id IS NOT NULL AND parent_comment_author_id != NEW.author_id THEN
      INSERT INTO hubook_notifications (
        user_id,
        type,
        actor_id,
        comment_id,
        message,
        read,
        dismissed
      ) VALUES (
        parent_comment_author_id,
        'reply',
        NEW.author_id,
        NEW.id,
        commenter_name || ' replied to your comment on a photo',
        false,
        false
      );
    END IF;
  END IF;

  -- Notify album owner about new comment (if not commenting on own media and not already notified as parent)
  IF media_owner_id IS NOT NULL AND
     media_owner_id != NEW.author_id AND
     (NEW.parent_comment_id IS NULL OR media_owner_id != parent_comment_author_id) THEN
    INSERT INTO hubook_notifications (
      user_id,
      type,
      actor_id,
      comment_id,
      message,
      read,
      dismissed
    ) VALUES (
      media_owner_id,
      'comment',
      NEW.author_id,
      NEW.id,
      commenter_name || ' commented on your photo in "' || album_name || '"',
      false,
      false
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER album_media_comment_notification
AFTER INSERT ON album_media_comments
FOR EACH ROW
EXECUTE FUNCTION notify_album_media_comment();
