/*
  # Create Switter Engagement Calculation Functions

  ## Overview
  This migration creates database functions to calculate engagement metrics for Switter's
  "Top Sweets" feature. The algorithm prioritizes fresh, engaging content with strong
  time decay to surface trending tweets.

  ## Functions

  ### 1. calculate_switter_engagement_metrics()
  Calculates and updates engagement scores for all tweets
  - Counts views, likes, dislikes, replies, retweets from last 30 days
  - Calculates velocity (per day) for views, engagements, and shares
  - Computes like ratio (positive reception indicator)
  - Generates reply quality score (discussion depth)
  - Applies exponential time decay (heavily penalizes tweets over 48 hours old)
  - Generates final engagement score with time decay applied

  ### 2. refresh_switter_feed_metrics()
  Wrapper function to refresh all Switter feed metrics
  - Can be called manually or via scheduled job (recommended every 15 minutes)
  - Updates switter_feed_metrics table with latest scores

  ### 3. get_top_switter_tweets(p_limit integer)
  Returns top-ranked tweets for "Top Sweets" feed
  - Orders by engagement_score descending
  - Includes full tweet data with author info
  - Limit defaults to 30 tweets

  ## Algorithm Details

  **View Velocity**: Total views in last 30 days divided by 30
  **Engagement Velocity**: Total (likes + comments + retweets) in last 30 days divided by 30
  **Share Velocity**: Total retweets in last 30 days divided by 30

  **Like Ratio**:
  - Measures positive reception: likes / (likes + dislikes)
  - Range: 0 (all dislikes) to 1 (all likes)
  - Tweets with no reactions get 0.5 (neutral)

  **Reply Quality Score**:
  - Measures discussion depth: replies / (total_engagements)
  - Higher reply ratio indicates meaningful conversation
  - Range: 0 (no replies) to 1 (all engagement is replies)

  **Time Decay Factor**:
  - Exponential decay based on tweet age in hours
  - Formula: e^(-0.05 * hours_old)
  - At 24 hours: ~30% of original score
  - At 48 hours: ~8% of original score
  - At 72 hours: ~2.5% of original score
  - This ensures "Top Sweets" shows recent trending content

  **Final Engagement Score**:
  - Base score = (view_velocity * 0.3) + (engagement_velocity * 2) + (share_velocity * 1.5)
  - Quality multiplier = like_ratio * (0.5 + (reply_quality_score * 0.5))
  - Time decay = e^(-0.05 * hours_since_creation)
  - Final score = base_score * quality_multiplier * time_decay
*/

CREATE OR REPLACE FUNCTION calculate_switter_engagement_metrics()
RETURNS void AS $$
DECLARE
  tweet_record RECORD;
  views_30d integer;
  likes_30d integer;
  dislikes_30d integer;
  replies_30d integer;
  retweets_30d integer;
  total_engagements integer;
  v_velocity numeric;
  e_velocity numeric;
  s_velocity numeric;
  total_reactions integer;
  like_ratio_val numeric;
  reply_quality numeric;
  base_score numeric;
  quality_multiplier numeric;
  hours_old numeric;
  time_decay numeric;
  final_score numeric;
  thirty_days_ago timestamptz;
BEGIN
  thirty_days_ago := now() - interval '30 days';

  FOR tweet_record IN
    SELECT id, created_at FROM switter_tweets
    WHERE reply_to_id IS NULL
  LOOP
    SELECT COUNT(*) INTO views_30d
    FROM switter_tweet_views
    WHERE tweet_id = tweet_record.id
    AND viewed_at >= thirty_days_ago;

    SELECT COUNT(*) INTO likes_30d
    FROM platform_likes
    WHERE platform = 'switter'
    AND content_type = 'tweet'
    AND content_id = tweet_record.id
    AND created_at >= thirty_days_ago;

    SELECT COUNT(*) INTO dislikes_30d
    FROM platform_dislikes
    WHERE platform = 'switter'
    AND content_type = 'tweet'
    AND content_id = tweet_record.id
    AND created_at >= thirty_days_ago;

    SELECT COUNT(*) INTO replies_30d
    FROM platform_comments
    WHERE platform = 'switter'
    AND content_type = 'tweet'
    AND content_id = tweet_record.id
    AND created_at >= thirty_days_ago;

    SELECT COUNT(*) INTO retweets_30d
    FROM switter_tweets
    WHERE retweet_of_id = tweet_record.id
    AND created_at >= thirty_days_ago;

    total_engagements := likes_30d + dislikes_30d + replies_30d + retweets_30d;

    v_velocity := views_30d::numeric / 30.0;
    e_velocity := total_engagements::numeric / 30.0;
    s_velocity := retweets_30d::numeric / 30.0;

    total_reactions := likes_30d + dislikes_30d;
    IF total_reactions > 0 THEN
      like_ratio_val := likes_30d::numeric / total_reactions::numeric;
    ELSE
      like_ratio_val := 0.5;
    END IF;

    IF total_engagements > 0 THEN
      reply_quality := replies_30d::numeric / total_engagements::numeric;
    ELSE
      reply_quality := 0.0;
    END IF;

    base_score := (v_velocity * 0.3) + (e_velocity * 2.0) + (s_velocity * 1.5);
    quality_multiplier := like_ratio_val * (0.5 + (reply_quality * 0.5));

    hours_old := EXTRACT(EPOCH FROM (now() - tweet_record.created_at)) / 3600.0;
    time_decay := exp(-0.05 * hours_old);

    final_score := base_score * quality_multiplier * time_decay;

    INSERT INTO switter_feed_metrics (
      tweet_id,
      total_views_30d,
      total_engagements_30d,
      total_likes_30d,
      total_dislikes_30d,
      total_replies_30d,
      total_retweets_30d,
      view_velocity,
      engagement_velocity,
      share_velocity,
      like_ratio,
      reply_quality_score,
      time_decay_factor,
      engagement_score,
      last_calculated
    ) VALUES (
      tweet_record.id,
      views_30d,
      total_engagements,
      likes_30d,
      dislikes_30d,
      replies_30d,
      retweets_30d,
      v_velocity,
      e_velocity,
      s_velocity,
      like_ratio_val,
      reply_quality,
      time_decay,
      final_score,
      now()
    )
    ON CONFLICT (tweet_id) DO UPDATE SET
      total_views_30d = EXCLUDED.total_views_30d,
      total_engagements_30d = EXCLUDED.total_engagements_30d,
      total_likes_30d = EXCLUDED.total_likes_30d,
      total_dislikes_30d = EXCLUDED.total_dislikes_30d,
      total_replies_30d = EXCLUDED.total_replies_30d,
      total_retweets_30d = EXCLUDED.total_retweets_30d,
      view_velocity = EXCLUDED.view_velocity,
      engagement_velocity = EXCLUDED.engagement_velocity,
      share_velocity = EXCLUDED.share_velocity,
      like_ratio = EXCLUDED.like_ratio,
      reply_quality_score = EXCLUDED.reply_quality_score,
      time_decay_factor = EXCLUDED.time_decay_factor,
      engagement_score = EXCLUDED.engagement_score,
      last_calculated = EXCLUDED.last_calculated;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_switter_feed_metrics()
RETURNS void AS $$
BEGIN
  PERFORM calculate_switter_engagement_metrics();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_top_switter_tweets(p_limit integer DEFAULT 30)
RETURNS TABLE (
  id uuid,
  content text,
  media_url text,
  like_count integer,
  dislike_count integer,
  comment_count integer,
  share_count integer,
  retweet_count integer,
  created_at timestamptz,
  author_handle text,
  author_display_name text,
  author_avatar_url text,
  author_verified boolean,
  engagement_score numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    st.id,
    st.content,
    st.media_url,
    st.like_count,
    st.dislike_count,
    st.comment_count,
    st.share_count,
    st.retweet_count,
    st.created_at,
    sa.handle,
    sa.display_name,
    sa.avatar_url,
    sa.verified_badge,
    COALESCE(sfm.engagement_score, 0) as score
  FROM switter_tweets st
  JOIN switter_accounts sa ON sa.id = st.author_id
  LEFT JOIN switter_feed_metrics sfm ON sfm.tweet_id = st.id
  WHERE st.reply_to_id IS NULL
  AND st.retweet_of_id IS NULL
  ORDER BY COALESCE(sfm.engagement_score, 0) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
