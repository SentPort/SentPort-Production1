/*
  # Fix Album Media Comment Notification - Owner Lookup

  1. Problem
    - The trigger function tries to SELECT owner_id FROM album_media
    - But album_media table does NOT have an owner_id column
    - The owner_id is in the albums table
    - Need to JOIN album_media with albums to get the owner

  2. Database Schema
    - album_media table has: album_id (foreign key to albums)
    - albums table has: owner_id (the HuBook profile who owns the album)
    - To get media owner: JOIN album_media with albums on album_id

  3. Changes
    - Update the SELECT query to JOIN album_media with albums
    - Change: SELECT owner_id FROM album_media WHERE id = NEW.media_id
    - To: SELECT a.owner_id FROM album_media am JOIN albums a ON am.album_id = a.id WHERE am.id = NEW.media_id

  4. Security
    - Function remains SECURITY DEFINER to allow notification creation
    - No changes to RLS policies
*/

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS album_media_comment_notification ON album_media_comments CASCADE;
DROP FUNCTION IF EXISTS notify_album_media_comment() CASCADE;

-- Recreate the function with correct JOIN to get album owner
CREATE OR REPLACE FUNCTION notify_album_media_comment()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  media_owner_id uuid;
  parent_comment_author_id uuid;
BEGIN
  -- Get the owner of the album (via JOIN with albums table)
  -- album_media.album_id -> albums.id -> albums.owner_id
  SELECT a.owner_id INTO media_owner_id
  FROM album_media am
  JOIN albums a ON am.album_id = a.id
  WHERE am.id = NEW.media_id;

  -- If this is a reply to another comment
  IF NEW.parent_comment_id IS NOT NULL THEN
    -- Get the author of the parent comment (HuBook profile ID)
    SELECT author_id INTO parent_comment_author_id
    FROM album_media_comments
    WHERE id = NEW.parent_comment_id;

    -- Notify the parent comment author (if not replying to themselves)
    IF parent_comment_author_id IS NOT NULL AND parent_comment_author_id != NEW.author_id THEN
      INSERT INTO hubook_notifications (
        user_id,
        type,
        actor_id,
        album_media_comment_id,
        message,
        read,
        dismissed
      ) VALUES (
        parent_comment_author_id,
        'album_media_comment_reply',
        NEW.author_id,
        NEW.id,
        'replied to your comment on a photo',
        false,
        false
      );
    END IF;
  ELSE
    -- This is a new comment on the media, notify the media owner (if not commenting on own media)
    IF media_owner_id IS NOT NULL AND media_owner_id != NEW.author_id THEN
      INSERT INTO hubook_notifications (
        user_id,
        type,
        actor_id,
        album_media_comment_id,
        message,
        read,
        dismissed
      ) VALUES (
        media_owner_id,
        'album_media_comment',
        NEW.author_id,
        NEW.id,
        'commented on your photo',
        false,
        false
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER album_media_comment_notification
AFTER INSERT ON album_media_comments
FOR EACH ROW
EXECUTE FUNCTION notify_album_media_comment();
