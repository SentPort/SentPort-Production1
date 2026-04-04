/*
  # Add Album Media Comment Notifications

  1. Modifications
    - Create trigger to send notifications when users comment on album media
    - Notify album owner when someone comments on their media
    - Notify comment author when someone replies to their comment
    - Notify mentioned users in comments

  2. Implementation
    - Reuse existing notifications table
    - Create trigger function for album media comments
    - Handle both new comments and replies
*/

-- Function to create notification for album media comments
CREATE OR REPLACE FUNCTION notify_album_media_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  media_owner_id uuid;
  album_owner_id uuid;
  parent_comment_author_id uuid;
  commenter_name text;
  album_name text;
BEGIN
  -- Get commenter's name
  SELECT display_name INTO commenter_name
  FROM hubook_profiles
  WHERE id = NEW.author_id;

  -- Get media and album owner
  SELECT am.album_id, a.user_id, a.album_name INTO media_owner_id, album_owner_id, album_name
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

-- Create trigger for album media comments
DROP TRIGGER IF EXISTS album_media_comment_notification ON album_media_comments;
CREATE TRIGGER album_media_comment_notification
  AFTER INSERT ON album_media_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_album_media_comment();