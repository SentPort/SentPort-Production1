/*
  # Add album_media_comment_id to hubook_notifications

  1. Changes
    - Add new column `album_media_comment_id` to `hubook_notifications` table
    - Add foreign key constraint to `album_media_comments(id)` with CASCADE delete
    - Add index for performance
    - Update trigger function to use new column for album media comment notifications
  
  2. Purpose
    - Fix foreign key constraint violation when creating notifications for album media comments
    - Separate regular comment notifications from album media comment notifications
    - Enable proper linking from notifications to album media pages
  
  3. Security
    - RLS policies remain unchanged (inherited from existing table policies)
    - Foreign key ensures referential integrity
*/

-- Add the new column for album media comments
ALTER TABLE hubook_notifications 
ADD COLUMN IF NOT EXISTS album_media_comment_id uuid REFERENCES album_media_comments(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_hubook_notifications_album_media_comment 
ON hubook_notifications(album_media_comment_id);

-- Drop the existing trigger and function with CASCADE
DROP TRIGGER IF EXISTS trigger_notify_album_media_comment ON album_media_comments CASCADE;
DROP TRIGGER IF EXISTS album_media_comment_notification ON album_media_comments CASCADE;
DROP FUNCTION IF EXISTS notify_album_media_comment() CASCADE;

-- Recreate the function to use the new column
CREATE OR REPLACE FUNCTION notify_album_media_comment()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  media_owner_id uuid;
  parent_comment_author_id uuid;
  commenter_profile_id uuid;
BEGIN
  -- Get the HuBook profile ID for the commenter
  SELECT id INTO commenter_profile_id
  FROM hubook_profiles
  WHERE user_id = NEW.commenter_id;

  -- Get the owner of the album media
  SELECT owner_id INTO media_owner_id
  FROM album_media
  WHERE id = NEW.media_id;

  -- If this is a reply to another comment
  IF NEW.parent_comment_id IS NOT NULL THEN
    -- Get the author of the parent comment
    SELECT commenter_id INTO parent_comment_author_id
    FROM album_media_comments
    WHERE id = NEW.parent_comment_id;

    -- Notify the parent comment author (if not replying to themselves)
    IF parent_comment_author_id IS NOT NULL AND parent_comment_author_id != NEW.commenter_id THEN
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
        NEW.commenter_id,
        NEW.id,
        'replied to your comment on a photo',
        false,
        false
      );
    END IF;
  ELSE
    -- This is a new comment on the media, notify the media owner (if not commenting on own media)
    IF media_owner_id IS NOT NULL AND media_owner_id != NEW.commenter_id THEN
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
        NEW.commenter_id,
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
