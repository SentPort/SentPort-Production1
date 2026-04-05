/*
  # Fix Engagement Metrics Column Name Mismatches

  ## Problem
  Recent trigger functions reference incorrect column names in post_engagement_metrics:
  - Using `shares_count` instead of `total_shares`
  - Using `comments_count` instead of `total_comments`
  - Using `reactions_count` instead of `total_reactions`

  ## Changes
  Updates all three trigger functions to use the correct column names:
  1. trigger_update_metrics_on_share() - Fix shares_count → total_shares
  2. trigger_update_metrics_on_comment() - Fix comments_count → total_comments
  3. trigger_update_metrics_on_reaction() - Fix reactions_count → total_reactions

  ## Impact
  - Fixes error when deleting shares
  - Fixes error when deleting comments
  - Fixes error when deleting reactions
*/

-- Fix trigger function for share changes
CREATE OR REPLACE FUNCTION trigger_update_metrics_on_share()
RETURNS trigger AS $$
DECLARE
  v_post_author_id uuid;
  v_sharer_name text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Update metrics when share is deleted
    UPDATE post_engagement_metrics
    SET 
      total_shares = GREATEST(0, total_shares - 1),
      last_updated = now()
    WHERE post_id = OLD.post_id;
    
    RETURN OLD;
  ELSE
    -- Get the post author
    SELECT author_id INTO v_post_author_id
    FROM posts
    WHERE id = NEW.post_id;

    -- Update post engagement metrics
    INSERT INTO post_engagement_metrics (
      post_id,
      total_shares,
      last_updated
    ) VALUES (
      NEW.post_id,
      1,
      now()
    )
    ON CONFLICT (post_id) DO UPDATE SET
      total_shares = post_engagement_metrics.total_shares + 1,
      last_updated = now();

    -- Create notification if not sharing own post
    IF v_post_author_id IS NOT NULL AND v_post_author_id != NEW.user_id THEN
      -- Get sharer's name
      SELECT full_name INTO v_sharer_name
      FROM user_profiles
      WHERE id = NEW.user_id;

      IF should_send_notification(v_post_author_id, 'share') THEN
        INSERT INTO hubook_notifications (user_id, type, actor_id, post_id, share_id, message)
        VALUES (
          v_post_author_id,
          'share',
          NEW.user_id,
          NEW.post_id,
          NEW.id,
          v_sharer_name || ' shared your post'
        );
      END IF;
    END IF;

    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix trigger function for comment changes
CREATE OR REPLACE FUNCTION trigger_update_metrics_on_comment()
RETURNS trigger AS $$
DECLARE
  v_post_author_id uuid;
  v_commenter_name text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Update metrics when comment is deleted
    UPDATE post_engagement_metrics
    SET 
      total_comments = GREATEST(0, total_comments - 1),
      last_updated = now()
    WHERE post_id = OLD.post_id;
    
    RETURN OLD;
  ELSE
    -- Get the post author
    SELECT author_id INTO v_post_author_id
    FROM posts
    WHERE id = NEW.post_id;

    -- Update post engagement metrics
    INSERT INTO post_engagement_metrics (
      post_id,
      total_comments,
      last_updated
    ) VALUES (
      NEW.post_id,
      1,
      now()
    )
    ON CONFLICT (post_id) DO UPDATE SET
      total_comments = post_engagement_metrics.total_comments + 1,
      last_updated = now();

    -- Create notification if not commenting on own post
    IF v_post_author_id IS NOT NULL AND v_post_author_id != NEW.author_id THEN
      -- Get commenter's name
      SELECT full_name INTO v_commenter_name
      FROM user_profiles
      WHERE id = NEW.author_id;

      IF should_send_notification(v_post_author_id, 'comment') THEN
        INSERT INTO hubook_notifications (user_id, type, actor_id, post_id, comment_id, message)
        VALUES (
          v_post_author_id,
          'comment',
          NEW.author_id,
          NEW.post_id,
          NEW.id,
          v_commenter_name || ' commented on your post'
        );
      END IF;
    END IF;

    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix trigger function for reaction changes
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
          INSERT INTO hubook_notifications (user_id, type, actor_id, post_id, reaction_id, message)
          VALUES (
            v_post_author_id,
            'reaction',
            NEW.user_id,
            NEW.target_id,
            NEW.id,
            v_reactor_name || ' reacted to your post'
          );
        END IF;
      END IF;
    END IF;

    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
