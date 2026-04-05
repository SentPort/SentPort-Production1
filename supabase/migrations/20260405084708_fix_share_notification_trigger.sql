/*
  # Fix Share and Reaction Notification Triggers

  ## Problem
  The trigger functions are trying to insert `reaction_id` which doesn't exist in hubook_notifications.
  The reaction trigger should not insert any reaction-specific ID since the table doesn't support it.
  
  ## Changes
  1. Remove `reaction_id` from reaction notification insert
  2. Verify share notification is correctly using only share_id
  
  ## Tables Modified
  - None (only functions updated)
*/

-- Fix trigger function for reactions - remove reaction_id reference
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
          -- Insert notification WITHOUT reaction_id column (doesn't exist)
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
