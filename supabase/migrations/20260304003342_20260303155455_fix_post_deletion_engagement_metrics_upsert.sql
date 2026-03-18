/*
  # Fix Post Deletion Foreign Key Constraint Error

  ## Problem
  When deleting a post, the CASCADE delete triggers AFTER DELETE triggers on reactions, 
  comments, and shares tables. These triggers call update_post_engagement_metrics() which 
  attempts to UPSERT into post_engagement_metrics with a post_id that's being deleted, 
  causing a foreign key constraint violation.

  ## Root Cause
  The update_post_engagement_metrics() function doesn't check if the post exists before 
  attempting to INSERT/UPDATE the metrics table. Even though the trigger functions check 
  post existence, the core function should also be defensive.

  ## Solution
  Add a post existence check at the beginning of update_post_engagement_metrics().
  If the post doesn't exist (being deleted or already deleted), exit early without 
  attempting any database modifications.

  ## Changes
  - Modified update_post_engagement_metrics() to check post existence first
  - Function now returns early if post is being deleted or doesn't exist
  - This prevents foreign key violations during cascade deletes
*/

-- Update the core engagement metrics function to check post existence
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
  -- CRITICAL: Check if the post still exists before attempting any updates
  -- This prevents foreign key violations when the post is being deleted
  IF NOT EXISTS (SELECT 1 FROM posts WHERE id = p_post_id) THEN
    RETURN;
  END IF;

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

  -- Insert or update metrics (only if post exists, which we verified above)
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