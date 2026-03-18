/*
  # Create HuTube Discovery Injection System

  ## Overview
  This migration creates the discovery injection system for HuTube to surface diverse,
  high-quality video content to users outside their typical viewing patterns.

  ## Function

  ### get_hutube_discovery_videos(p_user_id uuid, p_limit integer)
  Returns a curated list of discovery videos for a specific user
  - Finds high-quality videos outside user's typical viewing patterns
  - Excludes videos already shown to user recently (within 7 days)
  - Prioritizes videos with high engagement scores
  - Ensures diversity by selecting from different channels
  - Returns videos with engagement_score above threshold (minimum quality)

  ## Discovery Algorithm Logic

  1. **Identify user's typical interests**:
     - Look at channels/interests user has viewed before
     - Find videos NOT from those channels/interests

  2. **Quality filtering**:
     - Only include videos with engagement_score > 1.0 (minimum quality threshold)
     - Prioritize videos with balanced engagement (not just views)

  3. **Freshness and diversity**:
     - Exclude videos already shown to user in last 7 days
     - Limit to one video per channel to ensure creator diversity

  4. **Ranking**:
     - Order by engagement_score descending
     - Return top N videos for injection

  ## Usage Example

  To get 5 discovery videos for a user:
  ```sql
  SELECT * FROM get_hutube_discovery_videos('user-uuid-here', 5);
  ```

  This can be called from the frontend to inject discovery videos into the feed.
*/

CREATE OR REPLACE FUNCTION get_hutube_discovery_videos(
  p_user_id uuid,
  p_limit integer DEFAULT 5
)
RETURNS TABLE (
  video_id uuid,
  channel_id uuid,
  title text,
  description text,
  thumbnail_url text,
  video_url text,
  duration integer,
  view_count integer,
  engagement_score numeric,
  is_discovery boolean
) AS $$
BEGIN
  RETURN QUERY
  WITH user_viewed_channels AS (
    SELECT DISTINCT hv.channel_id
    FROM hutube_video_views hvv
    JOIN hutube_videos hv ON hv.id = hvv.video_id
    WHERE hvv.user_id = p_user_id
  ),
  recently_shown AS (
    SELECT video_id
    FROM hutube_discovery_injections
    WHERE user_id = p_user_id
    AND shown_at >= now() - interval '7 days'
  ),
  candidate_videos AS (
    SELECT DISTINCT ON (hv.channel_id)
      hv.id,
      hv.channel_id,
      hv.title,
      hv.description,
      hv.thumbnail_url,
      hv.video_url,
      hv.duration,
      hv.view_count,
      COALESCE(hfm.engagement_score, 0) as score
    FROM hutube_videos hv
    LEFT JOIN hutube_feed_metrics hfm ON hfm.video_id = hv.id
    WHERE hv.channel_id NOT IN (SELECT channel_id FROM user_viewed_channels)
    AND hv.id NOT IN (SELECT video_id FROM recently_shown)
    AND COALESCE(hfm.engagement_score, 0) > 1.0
    ORDER BY hv.channel_id, COALESCE(hfm.engagement_score, 0) DESC
  )
  SELECT
    cv.id,
    cv.channel_id,
    cv.title,
    cv.description,
    cv.thumbnail_url,
    cv.video_url,
    cv.duration,
    cv.view_count,
    cv.score,
    true as is_discovery
  FROM candidate_videos cv
  ORDER BY cv.score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION record_hutube_discovery_impression(
  p_user_id uuid,
  p_video_id uuid
)
RETURNS void AS $$
BEGIN
  INSERT INTO hutube_discovery_injections (user_id, video_id, shown_at, clicked)
  VALUES (p_user_id, p_video_id, now(), false)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION mark_hutube_discovery_clicked(
  p_user_id uuid,
  p_video_id uuid
)
RETURNS void AS $$
BEGIN
  UPDATE hutube_discovery_injections
  SET clicked = true
  WHERE user_id = p_user_id
  AND video_id = p_video_id
  AND clicked = false;
END;
$$ LANGUAGE plpgsql;
