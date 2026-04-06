/*
  # Fix Mention Notification Trigger Table Reference

  1. Changes
    - Update `create_mention_notification()` function to query `hubook_profiles` instead of `user_profiles`
    - Change column reference from `user_id` to `id` to match hubook_profiles schema
    - This fixes the "column display_name does not exist" error when creating mentions

  2. Details
    - The function was querying `user_profiles.display_name` which doesn't exist
    - Should query `hubook_profiles.display_name` instead
    - hubook_profiles uses `id` as primary key, not `user_id`
*/

CREATE OR REPLACE FUNCTION create_mention_notification()
RETURNS trigger AS $$
DECLARE
  v_mentioner_name text;
  v_content_info text;
BEGIN
  -- Get mentioner's display name from hubook_profiles
  SELECT display_name INTO v_mentioner_name
  FROM hubook_profiles
  WHERE id = NEW.mentioning_user_id;

  -- Determine content context
  IF NEW.content_type = 'post' THEN
    v_content_info := ' in a post';
  ELSIF NEW.content_type = 'comment' THEN
    v_content_info := ' in a comment';
  ELSE
    v_content_info := '';
  END IF;

  -- Create notification
  IF should_send_notification(NEW.mentioned_user_id, 'mention') THEN
    INSERT INTO hubook_notifications (
      user_id,
      type,
      actor_id,
      post_id,
      comment_id,
      message
    ) VALUES (
      NEW.mentioned_user_id,
      'mention',
      NEW.mentioning_user_id,
      CASE WHEN NEW.content_type = 'post' THEN NEW.content_id ELSE NULL END,
      CASE WHEN NEW.content_type = 'comment' THEN NEW.content_id ELSE NULL END,
      v_mentioner_name || ' mentioned you' || v_content_info
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
