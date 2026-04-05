/*
  # Fix Album Media Comment Notifications - Use Correct Foreign Key Column

  1. Problem
    - The trigger uses `comment_id` column which references the `comments` table
    - Album media comments should use `album_media_comment_id` which references `album_media_comments` table
    - This causes foreign key constraint violation: "key (comment_id)=(...) is not present in table \"comments\""

  2. Foreign Key Structure
    - `hubook_notifications.comment_id` → `comments.id` (for post comments)
    - `hubook_notifications.album_media_comment_id` → `album_media_comments.id` (for album media comments)

  3. Changes
    - Update trigger to use `album_media_comment_id` instead of `comment_id`
    - Keep notification types as 'comment' and 'reply' (these are correct)
    - All other logic remains unchanged

  4. Security
    - Function remains SECURITY DEFINER to bypass RLS during notification creation
    - All existing RLS policies remain unchanged
*/

-- Fix the notification trigger function to use correct foreign key column
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
          album_media_comment_id,
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
          album_media_comment_id,
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
