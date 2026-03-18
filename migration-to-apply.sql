/*
  # Real-Time Blog Comment Metrics Updates

  ## Overview
  This migration creates database triggers to automatically update blog_feed_metrics
  when comments are added or deleted, ensuring real-time accuracy of comment counts
  displayed in the blog wheel and throughout the platform.

  ## Changes

  ### 1. New Function: update_blog_metrics_on_comment_change()
  - Automatically recalculates metrics when comments are inserted or deleted
  - Counts only comments from the last 30 days (matching existing algorithm)
  - Recalculates comment velocity (comments per day over 30 days)
  - Updates engagement balance score based on comment-to-view ratio
  - Recalculates final engagement score using existing algorithm logic

  ### 2. Trigger: trigger_update_blog_metrics_on_comment
  - Fires AFTER INSERT OR DELETE on blog_comments table
  - Ensures metrics are updated immediately when comments change
  - Enables real-time UI updates via Supabase subscriptions

  ## Benefits
  - Blog wheel displays accurate, up-to-date comment counts
  - Real-time subscriptions in BlogFeed.tsx receive immediate updates
  - Consistent metrics across all blog-related components
*/

-- Function to update blog feed metrics when comments are added or deleted
CREATE OR REPLACE FUNCTION update_blog_metrics_on_comment_change()
RETURNS TRIGGER AS $$
DECLARE
  views_30d integer;
  comments_30d integer;
  v_velocity numeric;
  c_velocity numeric;
  total_engagement integer;
  comment_ratio numeric;
  balance_score numeric;
  final_score numeric;
  thirty_days_ago timestamptz;
  target_post_id uuid;
BEGIN
  -- Determine which post was affected
  IF TG_OP = 'DELETE' THEN
    target_post_id := OLD.post_id;
  ELSE
    target_post_id := NEW.post_id;
  END IF;

  thirty_days_ago := now() - interval '30 days';

  -- Count views from last 30 days
  SELECT COUNT(*) INTO views_30d
  FROM blog_views
  WHERE post_id = target_post_id
  AND viewed_at >= thirty_days_ago;

  -- Count comments from last 30 days
  SELECT COUNT(*) INTO comments_30d
  FROM blog_comments
  WHERE post_id = target_post_id
  AND created_at >= thirty_days_ago;

  -- Calculate velocities (per day)
  v_velocity := views_30d::numeric / 30.0;
  c_velocity := comments_30d::numeric / 30.0;

  -- Calculate engagement balance
  total_engagement := views_30d + comments_30d;

  IF total_engagement > 0 THEN
    comment_ratio := comments_30d::numeric / total_engagement::numeric;
    balance_score := 1.0 - (2.0 * ABS(comment_ratio - 0.5));
    balance_score := GREATEST(0.0, balance_score);
  ELSE
    balance_score := 0.0;
  END IF;

  -- Calculate final engagement score
  final_score := (v_velocity + (c_velocity * 2.0)) * GREATEST(0.1, balance_score);

  -- Update or insert metrics
  INSERT INTO blog_feed_metrics (
    post_id,
    total_views_30d,
    total_comments_30d,
    view_velocity,
    comment_velocity,
    engagement_balance,
    engagement_score,
    last_calculated
  ) VALUES (
    target_post_id,
    views_30d,
    comments_30d,
    v_velocity,
    c_velocity,
    balance_score,
    final_score,
    now()
  )
  ON CONFLICT (post_id) DO UPDATE SET
    total_views_30d = EXCLUDED.total_views_30d,
    total_comments_30d = EXCLUDED.total_comments_30d,
    view_velocity = EXCLUDED.view_velocity,
    comment_velocity = EXCLUDED.comment_velocity,
    engagement_balance = EXCLUDED.engagement_balance,
    engagement_score = EXCLUDED.engagement_score,
    last_calculated = EXCLUDED.last_calculated;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_blog_metrics_on_comment ON blog_comments;

-- Create trigger for comment insertions and deletions
CREATE TRIGGER trigger_update_blog_metrics_on_comment
  AFTER INSERT OR DELETE ON blog_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_metrics_on_comment_change();
