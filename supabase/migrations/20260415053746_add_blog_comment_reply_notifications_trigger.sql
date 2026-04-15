/*
  # Add Blog Comment & Reply Notifications Trigger

  ## Overview
  Creates a database trigger that automatically sends notifications
  whenever a comment or reply is posted on a HuBlog post.

  ## Changes

  ### 1. Extend blog_notification_type enum
  - Add 'comment' value (notifies post author when someone comments)
  - Add 'comment_reply' value (notifies comment author when someone replies)

  ### 2. New Trigger Function: notify_blog_comment_or_reply()
  - Fires AFTER INSERT on blog_comments
  - For top-level comments (parent_comment_id IS NULL):
    - Inserts a 'comment' notification for the post author
    - Skips if commenter IS the post author (no self-notification)
  - For replies (parent_comment_id IS NOT NULL):
    - Inserts a 'comment_reply' notification for the parent comment's author
    - Skips if replier IS the parent comment's author (no self-notification)

  ### 3. Trigger: trigger_notify_blog_comment_or_reply
  - Fires AFTER INSERT on blog_comments FOR EACH ROW

  ## Security
  - Function uses SECURITY DEFINER to bypass RLS when inserting notifications
  - Only creates notifications for legitimate cross-user interactions
*/

-- 1. Add enum values (safe with IF NOT EXISTS logic via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
    WHERE pg_type.typname = 'blog_notification_type'
    AND pg_enum.enumlabel = 'comment'
  ) THEN
    ALTER TYPE blog_notification_type ADD VALUE 'comment';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
    WHERE pg_type.typname = 'blog_notification_type'
    AND pg_enum.enumlabel = 'comment_reply'
  ) THEN
    ALTER TYPE blog_notification_type ADD VALUE 'comment_reply';
  END IF;
END $$;

-- 2. Create the trigger function
CREATE OR REPLACE FUNCTION notify_blog_comment_or_reply()
RETURNS TRIGGER AS $$
DECLARE
  v_post_author_id uuid;
  v_parent_comment_author_id uuid;
BEGIN
  IF NEW.parent_comment_id IS NULL THEN
    -- Top-level comment: notify the post author
    SELECT account_id INTO v_post_author_id
    FROM blog_posts
    WHERE id = NEW.post_id;

    IF v_post_author_id IS NOT NULL AND v_post_author_id != NEW.account_id THEN
      INSERT INTO blog_notifications (
        recipient_id,
        actor_id,
        type,
        post_id,
        is_read,
        created_at
      ) VALUES (
        v_post_author_id,
        NEW.account_id,
        'comment'::blog_notification_type,
        NEW.post_id,
        false,
        now()
      );
    END IF;
  ELSE
    -- Reply: notify the parent comment author
    SELECT account_id INTO v_parent_comment_author_id
    FROM blog_comments
    WHERE id = NEW.parent_comment_id;

    IF v_parent_comment_author_id IS NOT NULL AND v_parent_comment_author_id != NEW.account_id THEN
      INSERT INTO blog_notifications (
        recipient_id,
        actor_id,
        type,
        post_id,
        is_read,
        created_at
      ) VALUES (
        v_parent_comment_author_id,
        NEW.account_id,
        'comment_reply'::blog_notification_type,
        NEW.post_id,
        false,
        now()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger
DROP TRIGGER IF EXISTS trigger_notify_blog_comment_or_reply ON blog_comments;

CREATE TRIGGER trigger_notify_blog_comment_or_reply
  AFTER INSERT ON blog_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_blog_comment_or_reply();
