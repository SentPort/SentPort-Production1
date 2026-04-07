/*
  # Fix Reaction Notification Trigger - Remove reaction_id Reference

  ## Problem
  The `trigger_update_metrics_on_reaction()` function is attempting to INSERT a `reaction_id` 
  column into `hubook_notifications`, but this column does not exist in the table schema.
  This causes reactions to other users' posts to fail with error:
  "column "reaction_id" of relation "hubook_notifications" does not exist"

  ## Root Cause
  Migration 20260405081939 introduced a broken version of the trigger that includes `reaction_id`.
  Migration 20260405084708 attempted to fix this, but the broken version is still active in the database.

  ## Solution
  Recreate the trigger function WITHOUT the `reaction_id` column reference.
  The notification system has all necessary information (post_id, actor_id, type) without needing 
  to store the specific reaction ID.

  ## Changes
  1. Replace `trigger_update_metrics_on_reaction()` function
  2. Remove `reaction_id` from INSERT column list
  3. Remove `NEW.id` from VALUES clause

  ## Testing
  - Reacting to own posts should continue to work (no notification sent)
  - Reacting to other users' posts should now work (notification created successfully)
*/

-- Fix the reaction notification trigger by removing reaction_id reference
CREATE OR REPLACE FUNCTION trigger_update_metrics_on_reaction()
RETURNS trigger AS $$
DECLARE
  v_post_author_id uuid;
  v_reactor_name text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Update metrics when reaction is deleted (only for posts)
    IF OLD.target_type = 'post' THEN
      UPDATE post_engagement_metrics
      SET 
        total_reactions = GREATEST(0, total_reactions - 1),
        last_updated = now()
      WHERE post_id = OLD.target_id;
    END IF;
    
    RETURN OLD;
  ELSE
    -- Only process post reactions
    IF NEW.target_type = 'post' THEN
      -- Get the post author
      SELECT author_id INTO v_post_author_id
      FROM posts
      WHERE id = NEW.target_id;

      -- Update post engagement metrics
      INSERT INTO post_engagement_metrics (
        post_id,
        total_reactions,
        last_updated
      ) VALUES (
        NEW.target_id,
        1,
        now()
      )
      ON CONFLICT (post_id) DO UPDATE SET
        total_reactions = post_engagement_metrics.total_reactions + 1,
        last_updated = now();

      -- Create notification if not reacting to own post
      IF v_post_author_id IS NOT NULL AND v_post_author_id != NEW.user_id THEN
        -- Get reactor's name
        SELECT full_name INTO v_reactor_name
        FROM user_profiles
        WHERE id = NEW.user_id;

        IF should_send_notification(v_post_author_id, 'reaction') THEN
          -- Insert notification WITHOUT reaction_id column (it doesn't exist in the table)
          INSERT INTO hubook_notifications (user_id, type, actor_id, post_id, message)
          VALUES (
            v_post_author_id,
            'reaction',
            NEW.user_id,
            NEW.target_id,
            v_reactor_name || ' reacted to your post'
          );
        END IF;
      END IF;
    END IF;

    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
