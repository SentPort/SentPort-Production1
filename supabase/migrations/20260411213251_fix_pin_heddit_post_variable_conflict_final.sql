/*
  # Fix pin_heddit_post ambiguous column reference - final fix

  ## Problem
  PostgreSQL raises "column reference post_id is ambiguous" because the function
  parameters (post_id, subreddit_id) share names with columns in the tables being
  queried. Even using v_ prefixed variables in the body doesn't fully resolve this
  because the DECLARE initializers (v_post_id uuid := post_id) are still parsed
  in a context where post_id could refer to the column.

  ## Solution
  Use the `#variable_conflict use_variable` directive which tells PostgreSQL to
  always prefer the local variable/parameter over a column name when ambiguous.
  This is the official PostgreSQL-recommended solution for this exact scenario.

  ## Changes
  - Drops and recreates pin_heddit_post(uuid, uuid, boolean) with the directive
  - Drops and recreates admin_pin_heddit_post(uuid, uuid, boolean) with the directive
  - No behavioral changes - same logic, same permissions
*/

DROP FUNCTION IF EXISTS public.pin_heddit_post(uuid, uuid, boolean);
DROP FUNCTION IF EXISTS public.admin_pin_heddit_post(uuid, uuid, boolean);

CREATE OR REPLACE FUNCTION public.pin_heddit_post(
  post_id uuid,
  subreddit_id uuid,
  should_pin boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
#variable_conflict use_variable
DECLARE
  v_pinned_count integer;
  v_has_permission boolean := false;
  v_post_in_community boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM heddit_post_subreddits hps
    WHERE hps.post_id = post_id
    AND hps.subreddit_id = subreddit_id
  ) INTO v_post_in_community;

  IF NOT v_post_in_community THEN
    RAISE EXCEPTION 'Post does not belong to this community';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM heddit_subreddits hs
    WHERE hs.id = subreddit_id
    AND hs.creator_id = auth.uid()
  ) INTO v_has_permission;

  IF NOT v_has_permission THEN
    SELECT EXISTS (
      SELECT 1 FROM heddit_subreddit_moderators hsm
      WHERE hsm.subreddit_id = subreddit_id
      AND hsm.account_id = auth.uid()
      AND (hsm.permissions->>'pin_posts')::boolean = true
    ) INTO v_has_permission;
  END IF;

  IF NOT v_has_permission THEN
    SELECT COALESCE(up.is_admin, false) INTO v_has_permission
    FROM user_profiles up
    WHERE up.id = auth.uid();
  END IF;

  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'permission: You do not have permission to pin posts in this community';
  END IF;

  IF should_pin THEN
    SELECT COUNT(*) INTO v_pinned_count
    FROM heddit_community_pins hcp
    WHERE hcp.subreddit_id = subreddit_id;

    IF v_pinned_count >= 5 THEN
      RAISE EXCEPTION 'Maximum of 5 posts can be pinned at once in this community';
    END IF;

    INSERT INTO heddit_community_pins (post_id, subreddit_id, pinned_by, pinned_at)
    VALUES (post_id, subreddit_id, auth.uid(), now())
    ON CONFLICT (post_id, subreddit_id) DO NOTHING;
  ELSE
    DELETE FROM heddit_community_pins hcp
    WHERE hcp.post_id = post_id
    AND hcp.subreddit_id = subreddit_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_pin_heddit_post(
  post_id uuid,
  subreddit_id uuid,
  should_pin boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
#variable_conflict use_variable
DECLARE
  v_pinned_count integer;
  v_is_admin boolean := false;
BEGIN
  SELECT COALESCE(up.is_admin, false) INTO v_is_admin
  FROM user_profiles up
  WHERE up.id = auth.uid();

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'permission: Admin access required';
  END IF;

  IF should_pin THEN
    SELECT COUNT(*) INTO v_pinned_count
    FROM heddit_community_pins hcp
    WHERE hcp.subreddit_id = subreddit_id;

    IF v_pinned_count >= 5 THEN
      RAISE EXCEPTION 'Maximum of 5 posts can be pinned at once in this community';
    END IF;

    INSERT INTO heddit_community_pins (post_id, subreddit_id, pinned_by, pinned_at)
    VALUES (post_id, subreddit_id, auth.uid(), now())
    ON CONFLICT (post_id, subreddit_id) DO NOTHING;
  ELSE
    DELETE FROM heddit_community_pins hcp
    WHERE hcp.post_id = post_id
    AND hcp.subreddit_id = subreddit_id;
  END IF;
END;
$$;
