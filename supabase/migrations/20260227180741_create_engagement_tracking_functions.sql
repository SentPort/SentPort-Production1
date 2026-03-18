/*
  # Create Engagement Tracking and Auto-Moderation Functions

  ## Overview
  This migration creates database functions and triggers to automatically:
  1. Track engagement metrics (reactions, comments, shares)
  2. Calculate report ratios
  3. Auto-pause posts when report threshold is exceeded
  4. Create moderation queue entries
  5. Send notifications

  ## Functions Created

  ### 1. update_post_engagement_metrics()
  Recalculates all engagement metrics for a post including report ratio

  ### 2. check_and_pause_post()
  Checks if post exceeds report threshold and auto-pauses if needed

  ### 3. create_notification()
  Helper function to create notifications for users

  ## Triggers Created

  - After INSERT/UPDATE/DELETE on reactions → update engagement metrics
  - After INSERT/DELETE on comments → update engagement metrics
  - After INSERT/DELETE on shares → update engagement metrics
  - After INSERT on post_reports → update metrics and check threshold
  - After UPDATE on post_engagement_metrics → check if pause needed
*/

-- Function to update post engagement metrics
CREATE OR REPLACE FUNCTION update_post_engagement_metrics(p_post_id uuid)
RETURNS void AS $$
DECLARE
  v_reactions integer;
  v_comments integer;
  v_shares integer;
  v_reports integer;
  v_total_engagement integer;
  v_ratio numeric;
BEGIN
  -- Count reactions for this post
  SELECT COUNT(*)
  INTO v_reactions
  FROM reactions
  WHERE target_id = p_post_id AND target_type = 'post';

  -- Count comments for this post
  SELECT COUNT(*)
  INTO v_comments
  FROM comments
  WHERE post_id = p_post_id;

  -- Count shares for this post
  SELECT COUNT(*)
  INTO v_shares
  FROM shares
  WHERE post_id = p_post_id;

  -- Count unique reports for this post
  SELECT COUNT(*)
  INTO v_reports
  FROM post_reports
  WHERE post_id = p_post_id;

  -- Calculate total engagement
  v_total_engagement := v_reactions + v_comments + v_shares;

  -- Calculate report ratio (avoid division by zero)
  IF v_total_engagement > 0 THEN
    v_ratio := v_reports::numeric / v_total_engagement::numeric;
  ELSE
    -- If no engagement, ratio is 1.0 if there are any reports, 0 otherwise
    v_ratio := CASE WHEN v_reports > 0 THEN 1.0 ELSE 0.0 END;
  END IF;

  -- Insert or update metrics
  INSERT INTO post_engagement_metrics (
    post_id,
    total_reactions,
    total_comments,
    total_shares,
    report_count,
    report_ratio,
    last_updated
  )
  VALUES (
    p_post_id,
    v_reactions,
    v_comments,
    v_shares,
    v_reports,
    v_ratio,
    now()
  )
  ON CONFLICT (post_id) DO UPDATE SET
    total_reactions = v_reactions,
    total_comments = v_comments,
    total_shares = v_shares,
    report_count = v_reports,
    report_ratio = v_ratio,
    last_updated = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check report threshold and auto-pause post
CREATE OR REPLACE FUNCTION check_and_pause_post(p_post_id uuid)
RETURNS void AS $$
DECLARE
  v_threshold numeric;
  v_min_engagements integer;
  v_metrics record;
  v_post record;
  v_total_engagement integer;
BEGIN
  -- Get threshold settings
  SELECT value::numeric INTO v_threshold
  FROM admin_settings
  WHERE key = 'report_ratio_threshold';

  SELECT value::integer INTO v_min_engagements
  FROM admin_settings
  WHERE key = 'min_engagements_before_check';

  -- Get post metrics
  SELECT * INTO v_metrics
  FROM post_engagement_metrics
  WHERE post_id = p_post_id;

  -- Get post details
  SELECT * INTO v_post
  FROM posts
  WHERE id = p_post_id;

  -- Calculate total engagement
  v_total_engagement := v_metrics.total_reactions + v_metrics.total_comments + v_metrics.total_shares;

  -- Check if we should pause the post
  IF v_metrics.report_ratio >= v_threshold 
     AND v_total_engagement >= v_min_engagements
     AND v_post.status = 'active' THEN
    
    -- Pause the post
    UPDATE posts
    SET 
      status = 'paused',
      moderation_status = 'under_review',
      updated_at = now()
    WHERE id = p_post_id;

    -- Add to moderation queue if not already there
    INSERT INTO moderation_queue (post_id, flagged_at)
    VALUES (p_post_id, now())
    ON CONFLICT DO NOTHING;

    -- Notify the post author
    INSERT INTO notifications (user_id, type, related_content_id)
    SELECT 
      author_id,
      'post_under_review',
      p_post_id
    FROM posts
    WHERE id = p_post_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notifications
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_type text,
  p_related_user_id uuid DEFAULT NULL,
  p_related_content_id uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO notifications (user_id, type, related_user_id, related_content_id)
  VALUES (p_user_id, p_type, p_related_user_id, p_related_content_id)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for reaction changes
CREATE OR REPLACE FUNCTION trigger_update_metrics_on_reaction()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.target_type = 'post' THEN
      PERFORM update_post_engagement_metrics(OLD.target_id);
    END IF;
    RETURN OLD;
  ELSE
    IF NEW.target_type = 'post' THEN
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
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for comment changes
CREATE OR REPLACE FUNCTION trigger_update_metrics_on_comment()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM update_post_engagement_metrics(OLD.post_id);
    RETURN OLD;
  ELSE
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
    
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for share changes
CREATE OR REPLACE FUNCTION trigger_update_metrics_on_share()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM update_post_engagement_metrics(OLD.post_id);
    RETURN OLD;
  ELSE
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
    
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for report changes
CREATE OR REPLACE FUNCTION trigger_update_metrics_on_report()
RETURNS trigger AS $$
BEGIN
  PERFORM update_post_engagement_metrics(NEW.post_id);
  PERFORM check_and_pause_post(NEW.post_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for friendship changes (notifications)
CREATE OR REPLACE FUNCTION trigger_friendship_notification()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Notify addressee of friend request
    INSERT INTO notifications (user_id, type, related_user_id)
    VALUES (NEW.addressee_id, 'friend_request', NEW.requester_id);
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    -- Notify requester that request was accepted
    INSERT INTO notifications (user_id, type, related_user_id)
    VALUES (NEW.requester_id, 'friend_request_accepted', NEW.addressee_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for reactions
DROP TRIGGER IF EXISTS trigger_reaction_insert ON reactions;
CREATE TRIGGER trigger_reaction_insert
  AFTER INSERT ON reactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_metrics_on_reaction();

DROP TRIGGER IF EXISTS trigger_reaction_update ON reactions;
CREATE TRIGGER trigger_reaction_update
  AFTER UPDATE ON reactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_metrics_on_reaction();

DROP TRIGGER IF EXISTS trigger_reaction_delete ON reactions;
CREATE TRIGGER trigger_reaction_delete
  AFTER DELETE ON reactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_metrics_on_reaction();

-- Create triggers for comments
DROP TRIGGER IF EXISTS trigger_comment_insert ON comments;
CREATE TRIGGER trigger_comment_insert
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_metrics_on_comment();

DROP TRIGGER IF EXISTS trigger_comment_delete ON comments;
CREATE TRIGGER trigger_comment_delete
  AFTER DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_metrics_on_comment();

-- Create triggers for shares
DROP TRIGGER IF EXISTS trigger_share_insert ON shares;
CREATE TRIGGER trigger_share_insert
  AFTER INSERT ON shares
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_metrics_on_share();

DROP TRIGGER IF EXISTS trigger_share_delete ON shares;
CREATE TRIGGER trigger_share_delete
  AFTER DELETE ON shares
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_metrics_on_share();

-- Create triggers for reports
DROP TRIGGER IF EXISTS trigger_report_insert ON post_reports;
CREATE TRIGGER trigger_report_insert
  AFTER INSERT ON post_reports
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_metrics_on_report();

-- Create triggers for friendships
DROP TRIGGER IF EXISTS trigger_friendship_changes ON friendships;
CREATE TRIGGER trigger_friendship_changes
  AFTER INSERT OR UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION trigger_friendship_notification();

-- Initialize metrics for existing posts
INSERT INTO post_engagement_metrics (post_id)
SELECT id FROM posts
ON CONFLICT (post_id) DO NOTHING;