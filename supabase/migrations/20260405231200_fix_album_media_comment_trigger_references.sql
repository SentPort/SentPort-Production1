/*
  # Fix Album Media Comment Notification Trigger

  1. Changes
    - Fix `notify_album_media_comment` function to use correct table and column names
    - Change `user_profiles` to `hubook_profiles`
    - Change `NEW.user_id` to `NEW.author_id`
    - Change parent comment query from `user_id` to `author_id`

  2. Details
    - The trigger was querying `user_profiles` table which doesn't have the HuBook display names
    - Should query `hubook_profiles` instead
    - The column in `album_media_comments` is `author_id` not `user_id`
    - This was causing "column display_name does not exist" errors when posting comments
*/

-- Fix the notification trigger function with correct table and column references
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
      IF should_send_notification(v_media_owner_id, 'album_media_comment') THEN
        INSERT INTO hubook_notifications (
          user_id,
          type,
          actor_id,
          album_media_comment_id,
          message
        ) VALUES (
          v_media_owner_id,
          'album_media_comment',
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
      IF should_send_notification(v_parent_comment_author_id, 'comment_reply') THEN
        INSERT INTO hubook_notifications (
          user_id,
          type,
          actor_id,
          album_media_comment_id,
          message
        ) VALUES (
          v_parent_comment_author_id,
          'comment_reply',
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
