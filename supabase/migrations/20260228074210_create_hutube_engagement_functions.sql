/*
  # Create HuTube Engagement Calculation Functions

  ## Overview
  This migration creates database functions to calculate engagement metrics for the HuTube feed algorithm.
  The algorithm prioritizes videos based on 30-day engagement velocity, interaction quality, and watch completion.

  ## Functions

  ### 1. calculate_hutube_engagement_metrics()
  Calculates and updates engagement scores for all HuTube videos
  - Counts views, comments, likes, dislikes, shares from last 30 days
  - Calculates velocity (per day) for each metric
  - Computes like ratio (positive reception indicator)
  - Generates engagement balance score (comment-to-view ratio quality)
  - Applies age boost for newer videos (under 7 days get 1.2x multiplier)
  - Generates final engagement score combining all factors

  ### 2. refresh_hutube_feed_metrics()
  Wrapper function to refresh all HuTube feed metrics
  - Can be called manually or via scheduled job
  - Updates hutube_feed_metrics table with latest scores

  ### 3. increment_hutube_view_count()
  Trigger function to update view counts when new views are recorded
  - Automatically increments view_count on hutube_videos table

  ## Algorithm Details

  **View Velocity**: Total unique views in last 30 days divided by 30
  **Comment Velocity**: Total comments in last 30 days divided by 30
  **Share Velocity**: Total shares in last 30 days divided by 30

  **Like Ratio**:
  - Measures positive reception: likes / (likes + dislikes)
  - Range: 0 (all dislikes) to 1 (all likes)
  - Videos with no engagement get 0.5 (neutral)

  **Engagement Balance**:
  - Target comment-to-view ratio for videos: 5-15% (lower than blogs)
  - Optimal ratio is 10% comments to views
  - Calculate comment percentage: comments / (views + comments)
  - Balance score = 1 - (10 * |comment_ratio - 0.1|)
  - Range: 0 (worst) to 1 (perfect balance at 10%)

  **Age Boost**:
  - Videos under 7 days old get 1.2x multiplier
  - Helps surface fresh content alongside evergreen content

  **Final Engagement Score**:
  - Base score = (view_velocity * 0.5) + (comment_velocity * 3) + (share_velocity * 2)
  - Quality multiplier = like_ratio * MAX(0.1, engagement_balance)
  - Age boost = 1.2 if video age < 7 days, else 1.0
  - Final score = base_score * quality_multiplier * age_boost
*/

CREATE OR REPLACE FUNCTION calculate_hutube_engagement_metrics()
RETURNS void AS $$
DECLARE
  video_record RECORD;
  views_30d integer;
  comments_30d integer;
  likes_30d integer;
  dislikes_30d integer;
  shares_30d integer;
  v_velocity numeric;
  c_velocity numeric;
  s_velocity numeric;
  total_reactions integer;
  like_ratio_val numeric;
  total_engagement integer;
  comment_ratio numeric;
  balance_score numeric;
  base_score numeric;
  quality_multiplier numeric;
  age_boost numeric;
  final_score numeric;
  thirty_days_ago timestamptz;
  video_age_days integer;
BEGIN
  thirty_days_ago := now() - interval '30 days';

  FOR video_record IN
    SELECT id, created_at FROM hutube_videos
  LOOP
    SELECT COUNT(DISTINCT user_id) INTO views_30d
    FROM hutube_video_views
    WHERE video_id = video_record.id
    AND viewed_at >= thirty_days_ago;

    SELECT COUNT(*) INTO comments_30d
    FROM platform_comments
    WHERE platform = 'hutube'
    AND content_type = 'video'
    AND content_id = video_record.id
    AND created_at >= thirty_days_ago;

    SELECT COUNT(*) INTO likes_30d
    FROM platform_likes
    WHERE platform = 'hutube'
    AND content_type = 'video'
    AND content_id = video_record.id
    AND created_at >= thirty_days_ago;

    SELECT COUNT(*) INTO dislikes_30d
    FROM platform_dislikes
    WHERE platform = 'hutube'
    AND content_type = 'video'
    AND content_id = video_record.id
    AND created_at >= thirty_days_ago;

    SELECT COUNT(*) INTO shares_30d
    FROM platform_shares
    WHERE platform = 'hutube'
    AND content_type = 'video'
    AND content_id = video_record.id
    AND created_at >= thirty_days_ago;

    v_velocity := views_30d::numeric / 30.0;
    c_velocity := comments_30d::numeric / 30.0;
    s_velocity := shares_30d::numeric / 30.0;

    total_reactions := likes_30d + dislikes_30d;
    IF total_reactions > 0 THEN
      like_ratio_val := likes_30d::numeric / total_reactions::numeric;
    ELSE
      like_ratio_val := 0.5;
    END IF;

    total_engagement := views_30d + comments_30d;
    IF total_engagement > 0 THEN
      comment_ratio := comments_30d::numeric / total_engagement::numeric;
      balance_score := 1.0 - (10.0 * ABS(comment_ratio - 0.1));
      balance_score := GREATEST(0.0, balance_score);
    ELSE
      balance_score := 0.0;
    END IF;

    base_score := (v_velocity * 0.5) + (c_velocity * 3.0) + (s_velocity * 2.0);
    quality_multiplier := like_ratio_val * GREATEST(0.1, balance_score);

    video_age_days := EXTRACT(DAY FROM (now() - video_record.created_at));
    IF video_age_days < 7 THEN
      age_boost := 1.2;
    ELSE
      age_boost := 1.0;
    END IF;

    final_score := base_score * quality_multiplier * age_boost;

    INSERT INTO hutube_feed_metrics (
      video_id,
      total_views_30d,
      total_comments_30d,
      total_likes_30d,
      total_dislikes_30d,
      total_shares_30d,
      view_velocity,
      comment_velocity,
      share_velocity,
      like_ratio,
      engagement_balance,
      engagement_score,
      last_calculated
    ) VALUES (
      video_record.id,
      views_30d,
      comments_30d,
      likes_30d,
      dislikes_30d,
      shares_30d,
      v_velocity,
      c_velocity,
      s_velocity,
      like_ratio_val,
      balance_score,
      final_score,
      now()
    )
    ON CONFLICT (video_id) DO UPDATE SET
      total_views_30d = EXCLUDED.total_views_30d,
      total_comments_30d = EXCLUDED.total_comments_30d,
      total_likes_30d = EXCLUDED.total_likes_30d,
      total_dislikes_30d = EXCLUDED.total_dislikes_30d,
      total_shares_30d = EXCLUDED.total_shares_30d,
      view_velocity = EXCLUDED.view_velocity,
      comment_velocity = EXCLUDED.comment_velocity,
      share_velocity = EXCLUDED.share_velocity,
      like_ratio = EXCLUDED.like_ratio,
      engagement_balance = EXCLUDED.engagement_balance,
      engagement_score = EXCLUDED.engagement_score,
      last_calculated = EXCLUDED.last_calculated;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_hutube_feed_metrics()
RETURNS void AS $$
BEGIN
  PERFORM calculate_hutube_engagement_metrics();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_hutube_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE hutube_videos
  SET view_count = view_count + 1
  WHERE id = NEW.video_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_increment_hutube_view_count'
  ) THEN
    CREATE TRIGGER trigger_increment_hutube_view_count
      AFTER INSERT ON hutube_video_views
      FOR EACH ROW
      EXECUTE FUNCTION increment_hutube_view_count();
  END IF;
END $$;
