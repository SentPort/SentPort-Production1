/*
  # Create Blog Engagement Calculation Functions

  ## Overview
  This migration creates database functions to calculate engagement metrics for the blog feed algorithm.
  The algorithm prioritizes posts based on 30-day engagement velocity and comment-to-view balance.

  ## Functions

  ### 1. calculate_blog_engagement_metrics()
  Calculates and updates engagement scores for all published public blog posts
  - Counts views and comments from last 30 days
  - Calculates velocity (per day) for both metrics
  - Computes engagement balance (penalty for deviation from 50/50 ratio)
  - Generates final engagement score combining velocity and balance

  ### 2. refresh_blog_feed_metrics()
  Wrapper function to refresh all blog feed metrics
  - Can be called manually or via scheduled job
  - Updates blog_feed_metrics table with latest scores

  ## Algorithm Details

  **View Velocity**: Total views in last 30 days divided by 30
  **Comment Velocity**: Total comments in last 30 days divided by 30

  **Engagement Balance**:
  - Optimal ratio is 50% comments to 50% views
  - Calculate comment percentage: comments / (views + comments)
  - Penalty increases as ratio deviates from 0.5
  - Balance score = 1 - (2 * |comment_ratio - 0.5|)
  - Range: 0 (worst) to 1 (perfect balance)

  **Final Engagement Score**:
  - Combines velocity and balance
  - Score = (view_velocity + comment_velocity * 2) * engagement_balance
  - Comments weighted 2x to encourage discussion
  - Balance multiplier ensures quality engagement
*/

CREATE OR REPLACE FUNCTION calculate_blog_engagement_metrics()
RETURNS void AS $$
DECLARE
  post_record RECORD;
  views_30d integer;
  comments_30d integer;
  v_velocity numeric;
  c_velocity numeric;
  total_engagement integer;
  comment_ratio numeric;
  balance_score numeric;
  final_score numeric;
  thirty_days_ago timestamptz;
BEGIN
  thirty_days_ago := now() - interval '30 days';

  FOR post_record IN
    SELECT id FROM blog_posts
    WHERE status = 'published' AND privacy = 'public'
  LOOP
    SELECT COUNT(*) INTO views_30d
    FROM blog_views
    WHERE post_id = post_record.id
    AND viewed_at >= thirty_days_ago;

    SELECT COUNT(*) INTO comments_30d
    FROM blog_comments
    WHERE post_id = post_record.id
    AND created_at >= thirty_days_ago;

    v_velocity := views_30d::numeric / 30.0;
    c_velocity := comments_30d::numeric / 30.0;

    total_engagement := views_30d + comments_30d;

    IF total_engagement > 0 THEN
      comment_ratio := comments_30d::numeric / total_engagement::numeric;
      balance_score := 1.0 - (2.0 * ABS(comment_ratio - 0.5));
      balance_score := GREATEST(0.0, balance_score);
    ELSE
      balance_score := 0.0;
    END IF;

    final_score := (v_velocity + (c_velocity * 2.0)) * GREATEST(0.1, balance_score);

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
      post_record.id,
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
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_blog_feed_metrics()
RETURNS void AS $$
BEGIN
  PERFORM calculate_blog_engagement_metrics();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_blog_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE blog_posts
  SET view_count = view_count + 1
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_increment_blog_view_count'
  ) THEN
    CREATE TRIGGER trigger_increment_blog_view_count
      AFTER INSERT ON blog_views
      FOR EACH ROW
      EXECUTE FUNCTION increment_blog_view_count();
  END IF;
END $$;