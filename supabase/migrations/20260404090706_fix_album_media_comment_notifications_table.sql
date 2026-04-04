/*
  # Fix Album Media Comment Notifications

  1. Problem
    - The `notify_album_media_comment()` function was inserting into the wrong `notifications` table
    - It was using columns (`content`, `related_id`, `related_type`, `actor_id`) that don't exist
    - Should use `hubook_notifications` table with correct columns
    - Should use `message` instead of `content`
    - Should use specific columns for post_id, comment_id instead of generic related_id

  2. Solution
    - Drop and recreate the trigger function to use the correct table
    - Use `hubook_notifications` table which has the proper schema
    - Map notification data to the correct columns:
      - message (not content)
      - post_id, comment_id (not related_id/related_type)
      - actor_id (same)
      - type (same)

  3. Changes
    - Fix notification inserts to use hubook_notifications table
    - Use correct column names that exist in the table
    - Maintain the same notification logic (notify album owner and reply authors)
*/

-- Drop and recreate the notification trigger function with correct table and columns
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
      INSERT INTO hubook_notifications (user_id, type, message, actor_id, comment_id)
      VALUES (
        parent_comment_author_id,
        'comment_reply',
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
      'album_media_comment',
      commenter_name || ' commented on your photo in "' || album_name || '"',
      NEW.author_id,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;