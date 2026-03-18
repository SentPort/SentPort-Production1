/*
  # Update Auto-Moderation to Create Flagged Content Notifications

  1. Changes
    - Update check_and_pause_post_if_needed function to call create_flagged_hubook_notification
    - This ensures users get popup notifications when their HuBook posts are flagged

  2. Notes
    - The function already creates entries in notifications table
    - Now it also creates entries in flagged_post_notifications for popup display
    - Notification will appear as a modal to inform users of 24-48 hour review time
*/

-- Update the check_and_pause_post_if_needed function to also create flagged notifications
CREATE OR REPLACE FUNCTION check_and_pause_post_if_needed(p_post_id uuid)
RETURNS void AS $$
DECLARE
  v_metrics RECORD;
  v_post RECORD;
  v_total_engagement integer;
  v_threshold numeric := 0.15; -- 15% report ratio threshold
  v_min_engagements integer := 10; -- Minimum engagements before checking
BEGIN
  -- Get current metrics
  SELECT * INTO v_metrics
  FROM post_engagement_metrics
  WHERE post_id = p_post_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

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

    -- Notify the post author (existing notification system)
    INSERT INTO notifications (user_id, type, related_content_id)
    SELECT 
      author_id,
      'post_under_review',
      p_post_id
    FROM posts
    WHERE id = p_post_id;

    -- Create flagged content notification for popup display
    PERFORM create_flagged_hubook_notification(p_post_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;