/*
  # Fix blog engagement metrics trigger for DELETE operations

  ## Problem
  The `update_blog_post_engagement_metrics` function always references `NEW.content_id`
  to determine the post_id, but on DELETE operations `NEW` is null in PostgreSQL triggers.
  This causes a "null value in column post_id violates not-null constraint" error whenever
  a user deletes a comment on any platform (heddit, hutube, etc.).

  ## Fix
  Use `OLD.content_id` when TG_OP = 'DELETE' and `NEW.content_id` for INSERT operations.
  Also correctly reference `OLD.platform` for the hublog platform guard on DELETE.
*/

CREATE OR REPLACE FUNCTION update_blog_post_engagement_metrics()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_post_id uuid;
  v_platform text;
  v_likes integer;
  v_dislikes integer;
  v_comments integer;
  v_shares integer;
  v_reports integer;
  v_total_engagements integer;
  v_report_ratio numeric;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_post_id := OLD.content_id;
    v_platform := OLD.platform;
  ELSE
    v_post_id := NEW.content_id;
    v_platform := NEW.platform;
  END IF;

  IF v_platform != 'hublog' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_likes
  FROM platform_likes
  WHERE platform = 'hublog' AND content_type = 'post' AND content_id = v_post_id;

  SELECT COUNT(*) INTO v_dislikes
  FROM platform_dislikes
  WHERE platform = 'hublog' AND content_type = 'post' AND content_id = v_post_id;

  SELECT COUNT(*) INTO v_comments
  FROM platform_comments
  WHERE platform = 'hublog' AND content_type = 'post' AND content_id = v_post_id;

  SELECT COUNT(*) INTO v_shares
  FROM platform_shares
  WHERE platform = 'hublog' AND content_type = 'post' AND content_id = v_post_id;

  SELECT COUNT(*) INTO v_reports
  FROM platform_reports
  WHERE platform = 'hublog' AND content_type = 'post' AND content_id = v_post_id;

  v_total_engagements := v_likes + v_dislikes + v_comments + v_shares;

  IF v_total_engagements > 0 THEN
    v_report_ratio := (v_reports::numeric / v_total_engagements::numeric) * 100;
  ELSE
    v_report_ratio := 0;
  END IF;

  INSERT INTO blog_engagement_metrics (
    post_id,
    total_likes,
    total_dislikes,
    total_comments,
    total_shares,
    total_reports,
    total_engagements,
    report_ratio,
    last_updated
  ) VALUES (
    v_post_id,
    v_likes,
    v_dislikes,
    v_comments,
    v_shares,
    v_reports,
    v_total_engagements,
    v_report_ratio,
    now()
  )
  ON CONFLICT (post_id) DO UPDATE SET
    total_likes = v_likes,
    total_dislikes = v_dislikes,
    total_comments = v_comments,
    total_shares = v_shares,
    total_reports = v_reports,
    total_engagements = v_total_engagements,
    report_ratio = v_report_ratio,
    last_updated = now();

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;
