
/*
  # Fix pin_heddit_post ambiguous column reference

  ## Problem
  The `pin_heddit_post` function parameters `post_id` and `subreddit_id` clash
  with identically-named columns in `heddit_community_pins`, causing PostgreSQL
  to throw "column reference \"post_id\" is ambiguous" errors.

  ## Fix
  Drop the old function and recreate it with `p_` prefixed parameter names.
  All internal references updated to use the new prefixed names.
*/

DROP FUNCTION IF EXISTS public.pin_heddit_post(uuid, uuid, boolean);

CREATE OR REPLACE FUNCTION public.pin_heddit_post(p_post_id uuid, p_subreddit_id uuid, p_should_pin boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_pinned_count integer;
  v_has_permission boolean := false;
  v_post_in_community boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM heddit_post_subreddits
    WHERE heddit_post_subreddits.post_id = p_post_id
    AND heddit_post_subreddits.subreddit_id = p_subreddit_id
  ) INTO v_post_in_community;

  IF NOT v_post_in_community THEN
    RAISE EXCEPTION 'Post does not belong to this community';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM heddit_subreddits
    WHERE heddit_subreddits.id = p_subreddit_id
    AND heddit_subreddits.creator_id = auth.uid()
  ) INTO v_has_permission;

  IF NOT v_has_permission THEN
    SELECT EXISTS (
      SELECT 1 FROM heddit_subreddit_moderators
      WHERE heddit_subreddit_moderators.subreddit_id = p_subreddit_id
      AND heddit_subreddit_moderators.account_id = auth.uid()
      AND (heddit_subreddit_moderators.permissions->>'pin_posts')::boolean = true
    ) INTO v_has_permission;
  END IF;

  IF NOT v_has_permission THEN
    SELECT COALESCE(user_profiles.is_admin, false) INTO v_has_permission
    FROM user_profiles
    WHERE user_profiles.id = auth.uid();
  END IF;

  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'permission: You do not have permission to pin posts in this community';
  END IF;

  IF p_should_pin THEN
    SELECT COUNT(*) INTO v_pinned_count
    FROM heddit_community_pins
    WHERE heddit_community_pins.subreddit_id = p_subreddit_id;

    IF v_pinned_count >= 5 THEN
      RAISE EXCEPTION 'Maximum of 5 posts can be pinned at once in this community';
    END IF;

    INSERT INTO heddit_community_pins (post_id, subreddit_id, pinned_by, pinned_at)
    VALUES (p_post_id, p_subreddit_id, auth.uid(), now())
    ON CONFLICT (post_id, subreddit_id) DO NOTHING;
  ELSE
    DELETE FROM heddit_community_pins
    WHERE heddit_community_pins.post_id = p_post_id
    AND heddit_community_pins.subreddit_id = p_subreddit_id;
  END IF;
END;
$function$;
