/*
  # Fix pin_heddit_post ON CONFLICT ambiguous column reference

  ## Problem
  The ON CONFLICT (post_id, subreddit_id) clause causes PostgreSQL error 42702
  "column reference post_id is ambiguous" because the conflict target column list
  is parsed in a special context where function parameter names (post_id, subreddit_id)
  are still visible, even though the function body uses v_ prefixed variables everywhere else.

  ## Fix
  Replace ON CONFLICT (post_id, subreddit_id) with ON CONFLICT ON CONSTRAINT heddit_community_pins_unique
  which references the unique index by name, bypassing the column name resolution entirely.

  ## Changes
  - Drops and recreates pin_heddit_post function
  - Uses ON CONFLICT ON CONSTRAINT heddit_community_pins_unique instead of column list
  - All other logic remains identical
*/

CREATE OR REPLACE FUNCTION public.pin_heddit_post(post_id uuid, subreddit_id uuid, should_pin boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    ON CONFLICT ON CONSTRAINT heddit_community_pins_unique DO NOTHING;
  ELSE
    DELETE FROM heddit_community_pins hcp
    WHERE hcp.post_id = v_post_id
    AND hcp.subreddit_id = v_subreddit_id;
  END IF;
END;
$$;
