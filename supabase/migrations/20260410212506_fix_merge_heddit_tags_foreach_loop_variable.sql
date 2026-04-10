/*
  # Fix merge_heddit_tags FOREACH loop variable bug

  ## Problem
  The `merge_heddit_tags` function used `FOREACH v_source_tag.id IN ARRAY p_source_tag_ids`,
  which is invalid in PL/pgSQL. PostgreSQL's FOREACH loop can only iterate into a simple
  scalar variable, not a field of a RECORD type. This caused the error:
    "record v_source_tag is not assigned yet"
  ...because the engine tried to resolve `v_source_tag.id` before the RECORD was ever populated.

  ## Fix
  - Add a new scalar variable `v_source_tag_id uuid` to the DECLARE block
  - Change the FOREACH loop to iterate into `v_source_tag_id` (valid scalar)
  - Change the subsequent SELECT to use `v_source_tag_id` instead of `v_source_tag.id`
  - All remaining references to `v_source_tag.*` are unchanged (they come after the SELECT populates the RECORD)

  ## Impact
  - No data changes, purely a function logic fix
  - Tag merging now works regardless of whether source tags have any post/subreddit usage
*/

CREATE OR REPLACE FUNCTION merge_heddit_tags(
  p_source_tag_ids uuid[],
  p_target_tag_id uuid,
  p_merged_by uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_source_tag_id uuid;
  v_source_tag RECORD;
  v_target_tag RECORD;
  v_affected_posts integer := 0;
  v_affected_subreddits integer := 0;
  v_result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = p_merged_by AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can merge tags';
  END IF;

  SELECT * INTO v_target_tag FROM heddit_custom_tags WHERE id = p_target_tag_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target tag not found';
  END IF;

  FOREACH v_source_tag_id IN ARRAY p_source_tag_ids
  LOOP
    SELECT * INTO v_source_tag FROM heddit_custom_tags WHERE id = v_source_tag_id;
    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    IF v_source_tag.id = p_target_tag_id THEN
      CONTINUE;
    END IF;

    INSERT INTO heddit_tag_merge_history (
      source_tag_id,
      source_tag_name,
      source_display_name,
      source_usage_count,
      source_subreddit_usage,
      source_post_usage,
      target_tag_id,
      target_tag_name,
      merged_by,
      merge_reason
    ) VALUES (
      v_source_tag.id,
      v_source_tag.tag_name,
      v_source_tag.display_name,
      v_source_tag.usage_count,
      v_source_tag.subreddit_usage_count,
      v_source_tag.post_usage_count,
      p_target_tag_id,
      v_target_tag.tag_name,
      p_merged_by,
      p_reason
    );

    INSERT INTO heddit_tag_aliases (old_tag_name, new_tag_id)
    VALUES (v_source_tag.tag_name, p_target_tag_id)
    ON CONFLICT (old_tag_name) DO UPDATE SET new_tag_id = p_target_tag_id;

    UPDATE heddit_post_tags
    SET tag_id = p_target_tag_id
    WHERE tag_id = v_source_tag.id
    AND NOT EXISTS (
      SELECT 1 FROM heddit_post_tags pt2
      WHERE pt2.post_id = heddit_post_tags.post_id
      AND pt2.tag_id = p_target_tag_id
    );

    GET DIAGNOSTICS v_affected_posts = ROW_COUNT;

    DELETE FROM heddit_post_tags
    WHERE tag_id = v_source_tag.id;

    UPDATE heddit_subreddit_custom_tags
    SET tag_id = p_target_tag_id
    WHERE tag_id = v_source_tag.id
    AND NOT EXISTS (
      SELECT 1 FROM heddit_subreddit_custom_tags st2
      WHERE st2.subreddit_id = heddit_subreddit_custom_tags.subreddit_id
      AND st2.tag_id = p_target_tag_id
    );

    GET DIAGNOSTICS v_affected_subreddits = ROW_COUNT;

    DELETE FROM heddit_subreddit_custom_tags
    WHERE tag_id = v_source_tag.id;

    INSERT INTO heddit_tag_actions (
      action_type,
      tag_id,
      performed_by,
      reason,
      metadata
    ) VALUES (
      'merge',
      v_source_tag.id,
      p_merged_by,
      p_reason,
      jsonb_build_object(
        'source_tag', v_source_tag.tag_name,
        'target_tag', v_target_tag.tag_name,
        'affected_posts', v_affected_posts,
        'affected_subreddits', v_affected_subreddits
      )
    );

    DELETE FROM heddit_custom_tags WHERE id = v_source_tag.id;
  END LOOP;

  UPDATE heddit_custom_tags
  SET 
    usage_count = (
      SELECT COUNT(DISTINCT post_id) FROM heddit_post_tags WHERE tag_id = p_target_tag_id
    ) + (
      SELECT COUNT(DISTINCT subreddit_id) FROM heddit_subreddit_custom_tags WHERE tag_id = p_target_tag_id
    ),
    post_usage_count = (
      SELECT COUNT(*) FROM heddit_post_tags WHERE tag_id = p_target_tag_id
    ),
    subreddit_usage_count = (
      SELECT COUNT(*) FROM heddit_subreddit_custom_tags WHERE tag_id = p_target_tag_id
    ),
    last_used_at = now()
  WHERE id = p_target_tag_id;

  SELECT jsonb_build_object(
    'success', true,
    'target_tag_id', p_target_tag_id,
    'target_tag_name', tag_name,
    'merged_count', array_length(p_source_tag_ids, 1),
    'new_usage_count', usage_count
  ) INTO v_result
  FROM heddit_custom_tags
  WHERE id = p_target_tag_id;

  RETURN v_result;
END;
$$;
