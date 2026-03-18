/*
  # Fix Post Deletion Foreign Key Constraint Violation

  ## Overview
  This migration fixes a critical bug where deleting a post causes a foreign key constraint violation.
  The issue occurs because AFTER DELETE triggers on related tables (reactions, comments, shares) 
  attempt to update post_engagement_metrics with a post_id that references a post being deleted.

  ## Problem
  When a user deletes a post:
  1. Postgres begins deleting the post row
  2. CASCADE deletes trigger on reactions, comments, shares, etc.
  3. AFTER DELETE triggers fire and call update_post_engagement_metrics()
  4. This function tries to INSERT/UPDATE post_engagement_metrics with the deleted post_id
  5. Foreign key constraint fails because the post is being deleted

  ## Solution
  Modify the trigger functions to check if the post still exists before updating metrics.
  If the post doesn't exist (being deleted), skip the metrics update entirely.

  ## Changes Made
  - Updated trigger_update_metrics_on_reaction() to check post existence
  - Updated trigger_update_metrics_on_comment() to check post existence  
  - Updated trigger_update_metrics_on_share() to check post existence
*/

-- Fix trigger function for reaction changes
CREATE OR REPLACE FUNCTION trigger_update_metrics_on_reaction()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.target_type = 'post' THEN
      -- Only update metrics if the post still exists
      IF EXISTS (SELECT 1 FROM posts WHERE id = OLD.target_id) THEN
        PERFORM update_post_engagement_metrics(OLD.target_id);
      END IF;
    END IF;
    RETURN OLD;
  ELSE
    IF NEW.target_type = 'post' THEN
      -- Only update metrics if the post still exists
      IF EXISTS (SELECT 1 FROM posts WHERE id = NEW.target_id) THEN
        PERFORM update_post_engagement_metrics(NEW.target_id);
        
        -- Create notification for post author
        INSERT INTO notifications (user_id, type, related_user_id, related_content_id)
        SELECT 
          posts.author_id,
          'reaction',
          NEW.user_id,
          NEW.target_id
        FROM posts
        WHERE posts.id = NEW.target_id
          AND posts.author_id != NEW.user_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix trigger function for comment changes
CREATE OR REPLACE FUNCTION trigger_update_metrics_on_comment()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Only update metrics if the post still exists
    IF EXISTS (SELECT 1 FROM posts WHERE id = OLD.post_id) THEN
      PERFORM update_post_engagement_metrics(OLD.post_id);
    END IF;
    RETURN OLD;
  ELSE
    -- Only update metrics if the post still exists
    IF EXISTS (SELECT 1 FROM posts WHERE id = NEW.post_id) THEN
      PERFORM update_post_engagement_metrics(NEW.post_id);
      
      -- Create notification for post author
      INSERT INTO notifications (user_id, type, related_user_id, related_content_id)
      SELECT 
        posts.author_id,
        'comment',
        NEW.author_id,
        NEW.id
      FROM posts
      WHERE posts.id = NEW.post_id
        AND posts.author_id != NEW.author_id;
      
      -- Create notification for parent comment author if it's a reply
      IF NEW.parent_comment_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, type, related_user_id, related_content_id)
        SELECT 
          comments.author_id,
          'comment_reply',
          NEW.author_id,
          NEW.id
        FROM comments
        WHERE comments.id = NEW.parent_comment_id
          AND comments.author_id != NEW.author_id;
      END IF;
    END IF;
    
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix trigger function for share changes
CREATE OR REPLACE FUNCTION trigger_update_metrics_on_share()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Only update metrics if the post still exists
    IF EXISTS (SELECT 1 FROM posts WHERE id = OLD.post_id) THEN
      PERFORM update_post_engagement_metrics(OLD.post_id);
    END IF;
    RETURN OLD;
  ELSE
    -- Only update metrics if the post still exists
    IF EXISTS (SELECT 1 FROM posts WHERE id = NEW.post_id) THEN
      PERFORM update_post_engagement_metrics(NEW.post_id);
      
      -- Create notification for post author
      INSERT INTO notifications (user_id, type, related_user_id, related_content_id)
      SELECT 
        posts.author_id,
        'share',
        NEW.user_id,
        NEW.post_id
      FROM posts
      WHERE posts.id = NEW.post_id
        AND posts.author_id != NEW.user_id;
    END IF;
    
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;