/*
  # Fix Heddit Community Mention Trigger Column Name

  ## Problem
  The `create_heddit_community_mention_notifications` trigger function references
  `sm.user_id` when querying `heddit_subreddit_moderators`, but that table's column
  is named `account_id`, not `user_id`. This causes a 400 Bad Request error with
  the message "column sm.user_id does not exist" every time a community mention
  (@h/communityname) is saved, preventing the insert from succeeding entirely.

  ## Changes
  - Recreate `create_heddit_community_mention_notifications` with all `sm.user_id`
    references replaced with `sm.account_id`

  ## Tables Affected
  - No schema changes — function fix only
*/

CREATE OR REPLACE FUNCTION create_heddit_community_mention_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mentioning_username text;
  v_community_name text;
  v_notification_message text;
  v_post_id uuid;
  v_moderator record;
BEGIN
  IF NEW.mention_type != 'community' THEN
    RETURN NEW;
  END IF;

  SELECT username INTO v_mentioning_username
  FROM heddit_accounts
  WHERE id = NEW.mentioning_user_id;

  SELECT name INTO v_community_name
  FROM heddit_subreddits
  WHERE id = NEW.mentioned_community_id;

  IF NEW.content_type = 'post' THEN
    v_post_id := NEW.content_id;
    v_notification_message := v_mentioning_username || ' mentioned h/' || v_community_name || ' in a post';
  ELSIF NEW.content_type = 'comment' THEN
    SELECT content_id INTO v_post_id
    FROM platform_comments
    WHERE id = NEW.content_id;

    v_notification_message := v_mentioning_username || ' mentioned h/' || v_community_name || ' in a comment';
  END IF;

  FOR v_moderator IN
    SELECT DISTINCT sm.account_id, ha.community_mentions_enabled
    FROM heddit_subreddit_moderators sm
    JOIN heddit_accounts ha ON ha.id = sm.account_id
    WHERE sm.subreddit_id = NEW.mentioned_community_id
    AND sm.account_id != NEW.mentioning_user_id
  LOOP
    IF v_moderator.community_mentions_enabled = false THEN
      CONTINUE;
    END IF;

    IF NOT should_create_heddit_notification(v_moderator.account_id, 'mention') THEN
      CONTINUE;
    END IF;

    INSERT INTO heddit_notifications (
      user_id,
      actor_id,
      type,
      content_type,
      content_id,
      post_id,
      message,
      is_read,
      created_at
    ) VALUES (
      v_moderator.account_id,
      NEW.mentioning_user_id,
      'community_mention',
      NEW.content_type,
      NEW.content_id,
      v_post_id,
      v_notification_message,
      false,
      now()
    );
  END LOOP;

  RETURN NEW;
END;
$$;
