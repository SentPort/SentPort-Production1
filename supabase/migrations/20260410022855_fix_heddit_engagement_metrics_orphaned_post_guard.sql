/*
  # Fix heddit_post_engagement_metrics FK violation on comment delete

  ## Problem
  When a user deletes a comment on the Heddit profile page, the trigger
  `trigger_heddit_engagement_comments` fires `trigger_heddit_engagement_update()`,
  which calls `update_heddit_post_engagement_metrics(OLD.content_id)`.

  If the parent post no longer exists in `heddit_posts` (e.g. it was deleted),
  the subsequent UPSERT into `heddit_post_engagement_metrics` violates the FK
  constraint `heddit_post_engagement_metrics_post_id_fkey` with error code 23503.

  ## Fix
  Add an existence check at the top of `update_heddit_post_engagement_metrics`.
  If the post is not found in `heddit_posts`, the function returns early without
  attempting the upsert, so no FK violation occurs.

  ## Changes
  - Modified function: `update_heddit_post_engagement_metrics(uuid)`
    - Added: early return if post_id does not exist in heddit_posts
*/

CREATE OR REPLACE FUNCTION public.update_heddit_post_engagement_metrics(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_reactions integer;
  v_total_comments integer;
  v_total_shares integer;
  v_total_reports integer;
  v_total_engagement integer;
  v_report_ratio numeric;
  v_post_exists boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM heddit_posts WHERE id = p_post_id)
  INTO v_post_exists;

  IF NOT v_post_exists THEN
    RETURN;
  END IF;

  SELECT
    COALESCE(COUNT(*), 0)
  INTO v_total_reactions
  FROM platform_likes
  WHERE platform = 'heddit' AND content_type = 'post' AND content_id = p_post_id;

  SELECT
    COALESCE(COUNT(*), 0) + v_total_reactions
  INTO v_total_reactions
  FROM platform_dislikes
  WHERE platform = 'heddit' AND content_type = 'post' AND content_id = p_post_id;

  SELECT
    COALESCE(COUNT(*), 0)
  INTO v_total_comments
  FROM platform_comments
  WHERE platform = 'heddit' AND content_type = 'post' AND content_id = p_post_id;

  SELECT
    COALESCE(COUNT(*), 0)
  INTO v_total_shares
  FROM platform_shares
  WHERE platform = 'heddit' AND content_type = 'post' AND content_id = p_post_id;

  SELECT
    COALESCE(COUNT(*), 0)
  INTO v_total_reports
  FROM platform_reports
  WHERE platform = 'heddit' AND content_type = 'post' AND content_id = p_post_id;

  v_total_engagement := v_total_reactions + v_total_comments + v_total_shares;

  IF v_total_engagement > 0 THEN
    v_report_ratio := v_total_reports::numeric / v_total_engagement::numeric;
  ELSE
    v_report_ratio := 0;
  END IF;

  INSERT INTO heddit_post_engagement_metrics (
    post_id, total_reactions, total_comments, total_shares, total_reports, report_ratio, last_updated
  ) VALUES (
    p_post_id, v_total_reactions, v_total_comments, v_total_shares, v_total_reports, v_report_ratio, now()
  )
  ON CONFLICT (post_id) DO UPDATE SET
    total_reactions = EXCLUDED.total_reactions,
    total_comments = EXCLUDED.total_comments,
    total_shares = EXCLUDED.total_shares,
    total_reports = EXCLUDED.total_reports,
    report_ratio = EXCLUDED.report_ratio,
    last_updated = now();
END;
$$;
