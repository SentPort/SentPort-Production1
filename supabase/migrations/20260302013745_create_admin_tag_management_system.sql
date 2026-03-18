/*
  # Admin Tag Management System for Heddit

  1. New Tables
    - `heddit_tag_actions` - Audit log for all tag management actions
    - `heddit_banned_tags` - Records of banned tags with reasons
    - `heddit_flagged_tags` - Tags flagged for admin review
    - `heddit_tag_merge_history` - Preserves original tag stats before merging
    - `heddit_tag_aliases` - Redirects from old tags to merged targets
    - `heddit_tag_growth_metrics` - Daily tag usage tracking for trend analysis

  2. Schema Changes
    - Add ban/flag status columns to `heddit_custom_tags`
    - Add indexes for performance optimization

  3. Functions
    - `merge_heddit_tags()` - Merge multiple tags into one
    - `ban_heddit_tag()` - Ban a tag completely
    - `unban_heddit_tag()` - Unban a tag
    - `flag_heddit_tag()` - Flag a tag for review
    - `unflag_heddit_tag()` - Clear flag status
    - `rename_heddit_tag()` - Rename a tag
    - `calculate_heddit_tag_growth()` - Calculate growth metrics
    - `get_emerging_heddit_tags()` - Get high-growth tags

  4. Security
    - Enable RLS on all new tables
    - Admin-only policies for tag management
    - SubHeddit creator policies for community-specific actions
*/

-- Add status columns to heddit_custom_tags
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'heddit_custom_tags' AND column_name = 'is_banned'
  ) THEN
    ALTER TABLE heddit_custom_tags ADD COLUMN is_banned boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'heddit_custom_tags' AND column_name = 'is_flagged'
  ) THEN
    ALTER TABLE heddit_custom_tags ADD COLUMN is_flagged boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'heddit_custom_tags' AND column_name = 'banned_at'
  ) THEN
    ALTER TABLE heddit_custom_tags ADD COLUMN banned_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'heddit_custom_tags' AND column_name = 'banned_by'
  ) THEN
    ALTER TABLE heddit_custom_tags ADD COLUMN banned_by uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'heddit_custom_tags' AND column_name = 'ban_reason'
  ) THEN
    ALTER TABLE heddit_custom_tags ADD COLUMN ban_reason text;
  END IF;
END $$;

-- Create heddit_tag_actions table for audit logging
CREATE TABLE IF NOT EXISTS heddit_tag_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL CHECK (action_type IN ('merge', 'ban', 'unban', 'flag', 'unflag', 'rename', 'bulk_ban', 'bulk_flag')),
  tag_id uuid REFERENCES heddit_custom_tags(id) ON DELETE SET NULL,
  performed_by uuid REFERENCES auth.users(id) NOT NULL,
  reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE heddit_tag_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all tag actions"
  ON heddit_tag_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert tag actions"
  ON heddit_tag_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Create heddit_banned_tags table
CREATE TABLE IF NOT EXISTS heddit_banned_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  ban_reason text NOT NULL,
  banned_by uuid REFERENCES auth.users(id) NOT NULL,
  banned_at timestamptz DEFAULT now(),
  original_usage_count integer DEFAULT 0,
  unbanned_at timestamptz,
  unbanned_by uuid REFERENCES auth.users(id),
  unban_reason text
);

ALTER TABLE heddit_banned_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage banned tags"
  ON heddit_banned_tags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Create heddit_flagged_tags table
CREATE TABLE IF NOT EXISTS heddit_flagged_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id uuid REFERENCES heddit_custom_tags(id) ON DELETE CASCADE NOT NULL,
  flag_reason text NOT NULL CHECK (flag_reason IN ('suspected_duplicate', 'needs_rename', 'potentially_inappropriate', 'manual_review', 'other')),
  flag_notes text,
  flagged_by uuid REFERENCES auth.users(id) NOT NULL,
  flagged_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  resolution_action text,
  UNIQUE(tag_id)
);

ALTER TABLE heddit_flagged_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and subreddit creators can view flagged tags"
  ON heddit_flagged_tags FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
    OR EXISTS (
      SELECT 1 FROM heddit_subreddits
      WHERE heddit_subreddits.creator_id = auth.uid()
    )
  );

CREATE POLICY "Admins and subreddit creators can flag tags"
  ON heddit_flagged_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
    OR EXISTS (
      SELECT 1 FROM heddit_subreddits
      WHERE heddit_subreddits.creator_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update flagged tags"
  ON heddit_flagged_tags FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Create heddit_tag_merge_history table
CREATE TABLE IF NOT EXISTS heddit_tag_merge_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_tag_id uuid NOT NULL,
  source_tag_name text NOT NULL,
  source_display_name text NOT NULL,
  source_usage_count integer DEFAULT 0,
  source_subreddit_usage integer DEFAULT 0,
  source_post_usage integer DEFAULT 0,
  target_tag_id uuid REFERENCES heddit_custom_tags(id) ON DELETE SET NULL,
  target_tag_name text NOT NULL,
  merged_by uuid REFERENCES auth.users(id) NOT NULL,
  merged_at timestamptz DEFAULT now(),
  merge_reason text
);

ALTER TABLE heddit_tag_merge_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view merge history"
  ON heddit_tag_merge_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert merge history"
  ON heddit_tag_merge_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Create heddit_tag_aliases table
CREATE TABLE IF NOT EXISTS heddit_tag_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  old_tag_name text NOT NULL UNIQUE,
  new_tag_id uuid REFERENCES heddit_custom_tags(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE heddit_tag_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tag aliases"
  ON heddit_tag_aliases FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage tag aliases"
  ON heddit_tag_aliases FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Create heddit_tag_growth_metrics table
CREATE TABLE IF NOT EXISTS heddit_tag_growth_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id uuid REFERENCES heddit_custom_tags(id) ON DELETE CASCADE NOT NULL,
  metric_date date NOT NULL,
  daily_usage integer DEFAULT 0,
  weekly_usage integer DEFAULT 0,
  monthly_usage integer DEFAULT 0,
  growth_rate_daily numeric(10, 2),
  growth_rate_weekly numeric(10, 2),
  growth_rate_monthly numeric(10, 2),
  created_at timestamptz DEFAULT now(),
  UNIQUE(tag_id, metric_date)
);

ALTER TABLE heddit_tag_growth_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view growth metrics"
  ON heddit_tag_growth_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "System can insert growth metrics"
  ON heddit_tag_growth_metrics FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tag_actions_created_at ON heddit_tag_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tag_actions_type ON heddit_tag_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_tag_actions_tag_id ON heddit_tag_actions(tag_id);
CREATE INDEX IF NOT EXISTS idx_banned_tags_name ON heddit_banned_tags(tag_name);
CREATE INDEX IF NOT EXISTS idx_flagged_tags_tag_id ON heddit_flagged_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_flagged_tags_resolved ON heddit_flagged_tags(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_merge_history_target ON heddit_tag_merge_history(target_tag_id);
CREATE INDEX IF NOT EXISTS idx_merge_history_merged_at ON heddit_tag_merge_history(merged_at DESC);
CREATE INDEX IF NOT EXISTS idx_tag_aliases_old_name ON heddit_tag_aliases(old_tag_name);
CREATE INDEX IF NOT EXISTS idx_growth_metrics_tag_date ON heddit_tag_growth_metrics(tag_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_custom_tags_banned ON heddit_custom_tags(is_banned) WHERE is_banned = true;
CREATE INDEX IF NOT EXISTS idx_custom_tags_flagged ON heddit_custom_tags(is_flagged) WHERE is_flagged = true;

-- Function to merge tags
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
  v_source_tag RECORD;
  v_target_tag RECORD;
  v_affected_posts integer := 0;
  v_affected_subreddits integer := 0;
  v_result jsonb;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = p_merged_by AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can merge tags';
  END IF;

  -- Get target tag
  SELECT * INTO v_target_tag FROM heddit_custom_tags WHERE id = p_target_tag_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target tag not found';
  END IF;

  -- Process each source tag
  FOREACH v_source_tag.id IN ARRAY p_source_tag_ids
  LOOP
    -- Get source tag details
    SELECT * INTO v_source_tag FROM heddit_custom_tags WHERE id = v_source_tag.id;
    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    -- Skip if source is same as target
    IF v_source_tag.id = p_target_tag_id THEN
      CONTINUE;
    END IF;

    -- Create merge history record
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

    -- Create alias
    INSERT INTO heddit_tag_aliases (old_tag_name, new_tag_id)
    VALUES (v_source_tag.tag_name, p_target_tag_id)
    ON CONFLICT (old_tag_name) DO UPDATE SET new_tag_id = p_target_tag_id;

    -- Update post tags
    UPDATE heddit_post_tags
    SET tag_id = p_target_tag_id
    WHERE tag_id = v_source_tag.id
    AND NOT EXISTS (
      SELECT 1 FROM heddit_post_tags pt2
      WHERE pt2.post_id = heddit_post_tags.post_id
      AND pt2.tag_id = p_target_tag_id
    );

    GET DIAGNOSTICS v_affected_posts = ROW_COUNT;

    -- Delete duplicate post tags
    DELETE FROM heddit_post_tags
    WHERE tag_id = v_source_tag.id;

    -- Update subreddit tags
    UPDATE heddit_subreddit_custom_tags
    SET tag_id = p_target_tag_id
    WHERE tag_id = v_source_tag.id
    AND NOT EXISTS (
      SELECT 1 FROM heddit_subreddit_custom_tags st2
      WHERE st2.subreddit_id = heddit_subreddit_custom_tags.subreddit_id
      AND st2.tag_id = p_target_tag_id
    );

    GET DIAGNOSTICS v_affected_subreddits = ROW_COUNT;

    -- Delete duplicate subreddit tags
    DELETE FROM heddit_subreddit_custom_tags
    WHERE tag_id = v_source_tag.id;

    -- Log action
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

    -- Delete source tag
    DELETE FROM heddit_custom_tags WHERE id = v_source_tag.id;
  END LOOP;

  -- Recalculate target tag usage
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

  -- Build result
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

-- Function to ban a tag
CREATE OR REPLACE FUNCTION ban_heddit_tag(
  p_tag_id uuid,
  p_banned_by uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tag RECORD;
  v_result jsonb;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = p_banned_by AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can ban tags';
  END IF;

  -- Get tag
  SELECT * INTO v_tag FROM heddit_custom_tags WHERE id = p_tag_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tag not found';
  END IF;

  -- Update tag to banned status
  UPDATE heddit_custom_tags
  SET 
    is_banned = true,
    banned_at = now(),
    banned_by = p_banned_by,
    ban_reason = p_reason,
    is_flagged = false
  WHERE id = p_tag_id;

  -- Create banned tag record
  INSERT INTO heddit_banned_tags (
    tag_name,
    display_name,
    ban_reason,
    banned_by,
    original_usage_count
  ) VALUES (
    v_tag.tag_name,
    v_tag.display_name,
    p_reason,
    p_banned_by,
    v_tag.usage_count
  )
  ON CONFLICT (tag_name) DO UPDATE
  SET 
    ban_reason = p_reason,
    banned_by = p_banned_by,
    banned_at = now(),
    unbanned_at = NULL,
    unbanned_by = NULL,
    unban_reason = NULL;

  -- Clear any flag
  DELETE FROM heddit_flagged_tags WHERE tag_id = p_tag_id;

  -- Log action
  INSERT INTO heddit_tag_actions (
    action_type,
    tag_id,
    performed_by,
    reason,
    metadata
  ) VALUES (
    'ban',
    p_tag_id,
    p_banned_by,
    p_reason,
    jsonb_build_object(
      'tag_name', v_tag.tag_name,
      'usage_count', v_tag.usage_count
    )
  );

  v_result := jsonb_build_object(
    'success', true,
    'tag_id', p_tag_id,
    'tag_name', v_tag.tag_name,
    'banned_at', now()
  );

  RETURN v_result;
END;
$$;

-- Function to unban a tag
CREATE OR REPLACE FUNCTION unban_heddit_tag(
  p_tag_id uuid,
  p_unbanned_by uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tag RECORD;
  v_result jsonb;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = p_unbanned_by AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can unban tags';
  END IF;

  -- Get tag
  SELECT * INTO v_tag FROM heddit_custom_tags WHERE id = p_tag_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tag not found';
  END IF;

  -- Update tag to unbanned status
  UPDATE heddit_custom_tags
  SET 
    is_banned = false,
    banned_at = NULL,
    banned_by = NULL,
    ban_reason = NULL
  WHERE id = p_tag_id;

  -- Update banned tag record
  UPDATE heddit_banned_tags
  SET 
    unbanned_at = now(),
    unbanned_by = p_unbanned_by,
    unban_reason = p_reason
  WHERE tag_name = v_tag.tag_name;

  -- Log action
  INSERT INTO heddit_tag_actions (
    action_type,
    tag_id,
    performed_by,
    reason,
    metadata
  ) VALUES (
    'unban',
    p_tag_id,
    p_unbanned_by,
    p_reason,
    jsonb_build_object('tag_name', v_tag.tag_name)
  );

  v_result := jsonb_build_object(
    'success', true,
    'tag_id', p_tag_id,
    'tag_name', v_tag.tag_name,
    'unbanned_at', now()
  );

  RETURN v_result;
END;
$$;

-- Function to flag a tag
CREATE OR REPLACE FUNCTION flag_heddit_tag(
  p_tag_id uuid,
  p_flagged_by uuid,
  p_flag_reason text,
  p_flag_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tag RECORD;
  v_result jsonb;
BEGIN
  -- Get tag
  SELECT * INTO v_tag FROM heddit_custom_tags WHERE id = p_tag_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tag not found';
  END IF;

  -- Check if already banned
  IF v_tag.is_banned THEN
    RAISE EXCEPTION 'Cannot flag a banned tag';
  END IF;

  -- Update tag flag status
  UPDATE heddit_custom_tags
  SET is_flagged = true
  WHERE id = p_tag_id;

  -- Create flagged tag record
  INSERT INTO heddit_flagged_tags (
    tag_id,
    flag_reason,
    flag_notes,
    flagged_by
  ) VALUES (
    p_tag_id,
    p_flag_reason,
    p_flag_notes,
    p_flagged_by
  )
  ON CONFLICT (tag_id) DO UPDATE
  SET 
    flag_reason = p_flag_reason,
    flag_notes = p_flag_notes,
    flagged_by = p_flagged_by,
    flagged_at = now(),
    resolved_at = NULL,
    resolved_by = NULL,
    resolution_action = NULL;

  -- Log action
  INSERT INTO heddit_tag_actions (
    action_type,
    tag_id,
    performed_by,
    reason,
    metadata
  ) VALUES (
    'flag',
    p_tag_id,
    p_flagged_by,
    p_flag_reason,
    jsonb_build_object(
      'tag_name', v_tag.tag_name,
      'notes', p_flag_notes
    )
  );

  v_result := jsonb_build_object(
    'success', true,
    'tag_id', p_tag_id,
    'tag_name', v_tag.tag_name,
    'flagged_at', now()
  );

  RETURN v_result;
END;
$$;

-- Function to unflag a tag
CREATE OR REPLACE FUNCTION unflag_heddit_tag(
  p_tag_id uuid,
  p_resolved_by uuid,
  p_resolution_action text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tag RECORD;
  v_result jsonb;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = p_resolved_by AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can unflag tags';
  END IF;

  -- Get tag
  SELECT * INTO v_tag FROM heddit_custom_tags WHERE id = p_tag_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tag not found';
  END IF;

  -- Update tag flag status
  UPDATE heddit_custom_tags
  SET is_flagged = false
  WHERE id = p_tag_id;

  -- Update flagged tag record
  UPDATE heddit_flagged_tags
  SET 
    resolved_at = now(),
    resolved_by = p_resolved_by,
    resolution_action = p_resolution_action
  WHERE tag_id = p_tag_id;

  -- Log action
  INSERT INTO heddit_tag_actions (
    action_type,
    tag_id,
    performed_by,
    reason,
    metadata
  ) VALUES (
    'unflag',
    p_tag_id,
    p_resolved_by,
    p_resolution_action,
    jsonb_build_object('tag_name', v_tag.tag_name)
  );

  v_result := jsonb_build_object(
    'success', true,
    'tag_id', p_tag_id,
    'tag_name', v_tag.tag_name,
    'resolved_at', now()
  );

  RETURN v_result;
END;
$$;

-- Function to rename a tag
CREATE OR REPLACE FUNCTION rename_heddit_tag(
  p_tag_id uuid,
  p_new_display_name text,
  p_renamed_by uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tag RECORD;
  v_old_display_name text;
  v_result jsonb;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = p_renamed_by AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can rename tags';
  END IF;

  -- Get tag
  SELECT * INTO v_tag FROM heddit_custom_tags WHERE id = p_tag_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tag not found';
  END IF;

  v_old_display_name := v_tag.display_name;

  -- Update tag display name
  UPDATE heddit_custom_tags
  SET display_name = p_new_display_name
  WHERE id = p_tag_id;

  -- Auto-unflag if flagged for rename
  IF v_tag.is_flagged THEN
    UPDATE heddit_flagged_tags
    SET 
      resolved_at = now(),
      resolved_by = p_renamed_by,
      resolution_action = 'renamed'
    WHERE tag_id = p_tag_id AND flag_reason = 'needs_rename';

    UPDATE heddit_custom_tags
    SET is_flagged = false
    WHERE id = p_tag_id;
  END IF;

  -- Log action
  INSERT INTO heddit_tag_actions (
    action_type,
    tag_id,
    performed_by,
    reason,
    metadata
  ) VALUES (
    'rename',
    p_tag_id,
    p_renamed_by,
    p_reason,
    jsonb_build_object(
      'tag_name', v_tag.tag_name,
      'old_display_name', v_old_display_name,
      'new_display_name', p_new_display_name
    )
  );

  v_result := jsonb_build_object(
    'success', true,
    'tag_id', p_tag_id,
    'tag_name', v_tag.tag_name,
    'old_display_name', v_old_display_name,
    'new_display_name', p_new_display_name
  );

  RETURN v_result;
END;
$$;

-- Function to calculate tag growth metrics
CREATE OR REPLACE FUNCTION calculate_heddit_tag_growth()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_tag RECORD;
  v_today date := CURRENT_DATE;
  v_yesterday date := CURRENT_DATE - INTERVAL '1 day';
  v_last_week date := CURRENT_DATE - INTERVAL '7 days';
  v_last_month date := CURRENT_DATE - INTERVAL '30 days';
  v_daily_usage integer;
  v_weekly_usage integer;
  v_monthly_usage integer;
  v_prev_daily integer;
  v_prev_weekly integer;
  v_prev_monthly integer;
  v_growth_daily numeric;
  v_growth_weekly numeric;
  v_growth_monthly numeric;
BEGIN
  FOR v_tag IN SELECT id FROM heddit_custom_tags WHERE is_banned = false
  LOOP
    -- Calculate daily usage
    SELECT COUNT(*) INTO v_daily_usage
    FROM heddit_post_tags
    WHERE tag_id = v_tag.id
    AND created_at >= v_today;

    -- Calculate weekly usage
    SELECT COUNT(*) INTO v_weekly_usage
    FROM heddit_post_tags
    WHERE tag_id = v_tag.id
    AND created_at >= v_last_week;

    -- Calculate monthly usage
    SELECT COUNT(*) INTO v_monthly_usage
    FROM heddit_post_tags
    WHERE tag_id = v_tag.id
    AND created_at >= v_last_month;

    -- Get previous metrics
    SELECT daily_usage, weekly_usage, monthly_usage
    INTO v_prev_daily, v_prev_weekly, v_prev_monthly
    FROM heddit_tag_growth_metrics
    WHERE tag_id = v_tag.id
    AND metric_date = v_yesterday;

    -- Calculate growth rates
    IF v_prev_daily > 0 THEN
      v_growth_daily := ((v_daily_usage - v_prev_daily)::numeric / v_prev_daily) * 100;
    ELSE
      v_growth_daily := NULL;
    END IF;

    IF v_prev_weekly > 0 THEN
      v_growth_weekly := ((v_weekly_usage - v_prev_weekly)::numeric / v_prev_weekly) * 100;
    ELSE
      v_growth_weekly := NULL;
    END IF;

    IF v_prev_monthly > 0 THEN
      v_growth_monthly := ((v_monthly_usage - v_prev_monthly)::numeric / v_prev_monthly) * 100;
    ELSE
      v_growth_monthly := NULL;
    END IF;

    -- Insert or update metrics
    INSERT INTO heddit_tag_growth_metrics (
      tag_id,
      metric_date,
      daily_usage,
      weekly_usage,
      monthly_usage,
      growth_rate_daily,
      growth_rate_weekly,
      growth_rate_monthly
    ) VALUES (
      v_tag.id,
      v_today,
      v_daily_usage,
      v_weekly_usage,
      v_monthly_usage,
      v_growth_daily,
      v_growth_weekly,
      v_growth_monthly
    )
    ON CONFLICT (tag_id, metric_date) DO UPDATE
    SET 
      daily_usage = v_daily_usage,
      weekly_usage = v_weekly_usage,
      monthly_usage = v_monthly_usage,
      growth_rate_daily = v_growth_daily,
      growth_rate_weekly = v_growth_weekly,
      growth_rate_monthly = v_growth_monthly;
  END LOOP;
END;
$$;

-- Function to get emerging high-growth tags
CREATE OR REPLACE FUNCTION get_emerging_heddit_tags(p_min_growth_rate numeric DEFAULT 50.0)
RETURNS TABLE (
  tag_id uuid,
  tag_name text,
  display_name text,
  usage_count integer,
  growth_rate numeric,
  weekly_usage integer
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.tag_name,
    t.display_name,
    t.usage_count,
    m.growth_rate_weekly,
    m.weekly_usage
  FROM heddit_custom_tags t
  JOIN heddit_tag_growth_metrics m ON t.id = m.tag_id
  WHERE t.is_banned = false
  AND m.metric_date = CURRENT_DATE
  AND m.growth_rate_weekly >= p_min_growth_rate
  AND m.weekly_usage >= 3
  ORDER BY m.growth_rate_weekly DESC, m.weekly_usage DESC
  LIMIT 50;
END;
$$;

-- Trigger to prevent using banned tags
CREATE OR REPLACE FUNCTION prevent_banned_tag_usage()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM heddit_custom_tags
    WHERE id = NEW.tag_id AND is_banned = true
  ) THEN
    RAISE EXCEPTION 'This tag has been banned and cannot be used';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_banned_tag_before_post_insert ON heddit_post_tags;
CREATE TRIGGER check_banned_tag_before_post_insert
  BEFORE INSERT ON heddit_post_tags
  FOR EACH ROW
  EXECUTE FUNCTION prevent_banned_tag_usage();

DROP TRIGGER IF EXISTS check_banned_tag_before_subreddit_insert ON heddit_subreddit_custom_tags;
CREATE TRIGGER check_banned_tag_before_subreddit_insert
  BEFORE INSERT ON heddit_subreddit_custom_tags
  FOR EACH ROW
  EXECUTE FUNCTION prevent_banned_tag_usage();
