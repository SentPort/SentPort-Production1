/*
  # Fix Album Media Comment Notification Types

  1. Problem
    - The trigger function uses invalid notification types: 'album_media_comment' and 'comment_reply'
    - These violate the check constraint on hubook_notifications
    - Valid types are: 'friend_request', 'friend_accepted', 'comment', 'reply', 'reaction', 'share', 'mention', 'tag'

  2. Changes
    - Replace 'album_media_comment' with 'comment' for top-level comments
    - Replace 'comment_reply' with 'reply' for comment replies
    - Use 'comment_id' column instead of 'album_media_comment_id' for consistency
    - Keep all other logic intact (should_send_notification checks, name lookups, etc.)

  3. Security
    - Function remains SECURITY DEFINER to bypass RLS during notification creation
    - All existing RLS policies remain unchanged
*/

-- Fix the notification trigger function with correct notification types
CREATE OR REPLACE FUNCTION notify_album_media_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_media_owner_id uuid;
  v_parent_comment_author_id uuid;
  v_commenter_name text;
BEGIN
  -- Get commenter's name from hubook_profiles (not user_profiles)
  SELECT display_name INTO v_commenter_name
  FROM hubook_profiles
  WHERE id = NEW.author_id;

  IF NEW.parent_comment_id IS NULL THEN
    -- This is a top-level comment on album media
    SELECT a.owner_id INTO v_media_owner_id
    FROM album_media am
    JOIN albums a ON am.album_id = a.id
    WHERE am.id = NEW.media_id;

    -- Notify media owner if not commenting on own media
    IF v_media_owner_id IS NOT NULL AND v_media_owner_id != NEW.author_id THEN
      IF should_send_notification(v_media_owner_id, 'comment') THEN
        INSERT INTO hubook_notifications (
          user_id,
          type,
          actor_id,
          comment_id,
          message
        ) VALUES (
          v_media_owner_id,
          'comment',
          NEW.author_id,
          NEW.id,
          v_commenter_name || ' commented on your photo'
        );
      END IF;
    END IF;
  ELSE
    -- This is a reply to another comment
    SELECT author_id INTO v_parent_comment_author_id
    FROM album_media_comments
    WHERE id = NEW.parent_comment_id;

    -- Notify parent comment author if not replying to own comment
    IF v_parent_comment_author_id IS NOT NULL AND v_parent_comment_author_id != NEW.author_id THEN
      IF should_send_notification(v_parent_comment_author_id, 'reply') THEN
        INSERT INTO hubook_notifications (
          user_id,
          type,
          actor_id,
          comment_id,
          message
        ) VALUES (
          v_parent_comment_author_id,
          'reply',
          NEW.author_id,
          NEW.id,
          v_commenter_name || ' replied to your comment'
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;