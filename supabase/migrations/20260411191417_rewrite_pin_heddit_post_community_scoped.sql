/*
  # Rewrite pin_heddit_post to be Community-Scoped

  ## Summary
  Replaces the global admin-only pin function with a community-scoped version.
  A moderator of community X can only pin/unpin a post within community X.
  Pinning in community X has no effect on community Y, even if the same post
  was cross-posted to both.

  ## Changes
  - Drops the old pin_heddit_post(uuid, boolean) signature
  - Creates new pin_heddit_post(post_id uuid, subreddit_id uuid, should_pin boolean)
  - Permission check: caller must be the community creator OR a moderator with pin_posts=true
    for the given subreddit_id (not a global admin check)
  - 5-pin limit is now per-community (counts pins in heddit_community_pins for that subreddit)
  - Pin: inserts a row into heddit_community_pins
  - Unpin: deletes the matching row from heddit_community_pins

  ## Security
  - SECURITY DEFINER so the function can write to heddit_community_pins regardless of RLS
  - All permission enforcement is inside the function body
*/

DROP FUNCTION IF EXISTS pin_heddit_post(uuid, boolean);

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
  v_pinned_count integer;
  v_has_permission boolean := false;
  v_post_in_community boolean;
BEGIN
  -- Verify the post actually belongs to this community
  SELECT EXISTS (
    SELECT 1 FROM heddit_post_subreddits
    WHERE heddit_post_subreddits.post_id = pin_heddit_post.post_id
      AND heddit_post_subreddits.subreddit_id = pin_heddit_post.subreddit_id
  ) INTO v_post_in_community;

  IF NOT v_post_in_community THEN
    RAISE EXCEPTION 'Post does not belong to this community';
  END IF;

  -- Check if the caller is the community creator
  SELECT EXISTS (
    SELECT 1 FROM heddit_subreddits
    WHERE heddit_subreddits.id = pin_heddit_post.subreddit_id
      AND heddit_subreddits.creator_id = auth.uid()
  ) INTO v_has_permission;

  -- If not the creator, check if they are a moderator with pin_posts permission
  IF NOT v_has_permission THEN
    SELECT EXISTS (
      SELECT 1 FROM heddit_subreddit_moderators
      WHERE heddit_subreddit_moderators.subreddit_id = pin_heddit_post.subreddit_id
        AND heddit_subreddit_moderators.user_id = auth.uid()
        AND heddit_subreddit_moderators.pin_posts = true
    ) INTO v_has_permission;
  END IF;

  -- Also allow global admins to pin in any community
  IF NOT v_has_permission THEN
    SELECT COALESCE(user_profiles.is_admin, false) INTO v_has_permission
    FROM user_profiles
    WHERE user_profiles.id = auth.uid();
  END IF;

  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'permission: You do not have permission to pin posts in this community';
  END IF;

  IF should_pin THEN
    -- Enforce 5-pin limit per community
    SELECT COUNT(*) INTO v_pinned_count
    FROM heddit_community_pins
    WHERE heddit_community_pins.subreddit_id = pin_heddit_post.subreddit_id;

    IF v_pinned_count >= 5 THEN
      RAISE EXCEPTION 'Maximum of 5 posts can be pinned at once in this community';
    END IF;

    -- Insert community-scoped pin (ON CONFLICT DO NOTHING handles duplicate attempts)
    INSERT INTO heddit_community_pins (post_id, subreddit_id, pinned_by, pinned_at)
    VALUES (pin_heddit_post.post_id, pin_heddit_post.subreddit_id, auth.uid(), now())
    ON CONFLICT (post_id, subreddit_id) DO NOTHING;
  ELSE
    DELETE FROM heddit_community_pins
    WHERE heddit_community_pins.post_id = pin_heddit_post.post_id
      AND heddit_community_pins.subreddit_id = pin_heddit_post.subreddit_id;
  END IF;
END;
$$;
