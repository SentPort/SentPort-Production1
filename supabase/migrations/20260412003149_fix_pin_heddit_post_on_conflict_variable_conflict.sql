
/*
  # Fix pin_heddit_post ON CONFLICT with variable conflict mode

  ## Problem
  The function uses `#variable_conflict use_variable` which causes `ON CONFLICT (post_id, subreddit_id)`
  to fail because PostgreSQL cannot resolve the column names in the ON CONFLICT clause when variable
  names shadow column names. The error is "there is no unique or exclusion constraint matching the
  ON CONFLICT specification".

  ## Fix
  Use a CTE or explicit table-qualified column reference in the INSERT to avoid the ambiguity.
  We store parameter values into local variables with distinct names and use those throughout.
*/

CREATE OR REPLACE FUNCTION pin_heddit_post(
  post_id uuid,
  subreddit_id uuid,
  should_pin boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_post_id uuid := post_id;
  v_subreddit_id uuid := subreddit_id;
  v_pinned_count integer;
  v_has_permission boolean := false;
  v_post_in_community boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM heddit_post_subreddits hps
    WHERE hps.post_id = v_post_id
    AND hps.subreddit_id = v_subreddit_id
  ) INTO v_post_in_community;

  IF NOT v_post_in_community THEN
    RAISE EXCEPTION 'Post does not belong to this community';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM heddit_subreddits hs
    WHERE hs.id = v_subreddit_id
    AND hs.creator_id = auth.uid()
  ) INTO v_has_permission;

  IF NOT v_has_permission THEN
    SELECT EXISTS (
      SELECT 1 FROM heddit_subreddit_moderators hsm
      WHERE hsm.subreddit_id = v_subreddit_id
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
    WHERE hcp.subreddit_id = v_subreddit_id;

    IF v_pinned_count >= 5 THEN
      RAISE EXCEPTION 'Maximum of 5 posts can be pinned at once in this community';
    END IF;

    INSERT INTO heddit_community_pins (post_id, subreddit_id, pinned_by, pinned_at)
    VALUES (v_post_id, v_subreddit_id, auth.uid(), now())
    ON CONFLICT (post_id, subreddit_id) DO NOTHING;
  ELSE
    DELETE FROM heddit_community_pins hcp
    WHERE hcp.post_id = v_post_id
    AND hcp.subreddit_id = v_subreddit_id;
  END IF;
END;
$$;
