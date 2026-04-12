
/*
  # Fix pin_heddit_post parameter name ambiguity

  ## Problem
  The function parameters `post_id` and `subreddit_id` conflict with column names
  of the same name in the `heddit_community_pins` table, causing PostgreSQL error:
  "column reference 'post_id' is ambiguous"

  ## Fix
  Rename parameters to `p_post_id` and `p_subreddit_id` to eliminate any ambiguity.
  Remove intermediate local variables since they are no longer needed.
*/

DROP FUNCTION IF EXISTS pin_heddit_post(uuid, uuid, boolean);

CREATE OR REPLACE FUNCTION pin_heddit_post(
  p_post_id uuid,
  p_subreddit_id uuid,
  should_pin boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pinned_count integer;
  v_has_permission boolean := false;
  v_post_in_community boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM heddit_post_subreddits hps
    WHERE hps.post_id = p_post_id
    AND hps.subreddit_id = p_subreddit_id
  ) INTO v_post_in_community;

  IF NOT v_post_in_community THEN
    RAISE EXCEPTION 'Post does not belong to this community';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM heddit_subreddits hs
    WHERE hs.id = p_subreddit_id
    AND hs.creator_id = auth.uid()
  ) INTO v_has_permission;

  IF NOT v_has_permission THEN
    SELECT EXISTS (
      SELECT 1 FROM heddit_subreddit_moderators hsm
      WHERE hsm.subreddit_id = p_subreddit_id
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
    WHERE hcp.subreddit_id = p_subreddit_id;

    IF v_pinned_count >= 5 THEN
      RAISE EXCEPTION 'Maximum of 5 posts can be pinned at once in this community';
    END IF;

    INSERT INTO heddit_community_pins (post_id, subreddit_id, pinned_by, pinned_at)
    VALUES (p_post_id, p_subreddit_id, auth.uid(), now())
    ON CONFLICT (post_id, subreddit_id) DO NOTHING;
  ELSE
    DELETE FROM heddit_community_pins hcp
    WHERE hcp.post_id = p_post_id
    AND hcp.subreddit_id = p_subreddit_id;
  END IF;
END;
$$;
