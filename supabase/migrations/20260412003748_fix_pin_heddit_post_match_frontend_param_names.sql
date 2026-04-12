
/*
  # Fix pin_heddit_post to match frontend parameter names

  ## Problem
  The previous migration renamed parameters to p_post_id/p_subreddit_id but the
  frontend RPC calls use post_id/subreddit_id as argument keys.

  ## Fix
  Recreate with original parameter names (post_id, subreddit_id) but use
  explicit table-qualified column references everywhere, including in the
  INSERT VALUES and ON CONFLICT clause, to fully eliminate ambiguity.

  The key insight: PostgreSQL resolves ambiguity in favor of the function
  parameter when both a parameter and a column share the same name EXCEPT
  in the ON CONFLICT target list which uses a different resolution context.
  The fix is to use local variables (prefixed v_) assigned from the params,
  and use those variables in the INSERT/ON CONFLICT.
*/

DROP FUNCTION IF EXISTS pin_heddit_post(uuid, uuid, boolean);

CREATE OR REPLACE FUNCTION pin_heddit_post(
  post_id uuid,
  subreddit_id uuid,
  should_pin boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_id uuid;
  v_subreddit_id uuid;
  v_pinned_count integer;
  v_has_permission boolean := false;
  v_post_in_community boolean;
BEGIN
  v_post_id := pin_heddit_post.post_id;
  v_subreddit_id := pin_heddit_post.subreddit_id;

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
