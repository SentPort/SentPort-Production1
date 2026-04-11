/*
  # Fix Heddit Pin Functions Column Name Bugs

  ## Problem
  Two pin-related functions had incorrect column name references:

  1. `pin_heddit_post_admin` - queried `user_profiles WHERE user_id = auth.uid()`
     but the column is `id`, not `user_id`. This caused a 400 error for all admin pin attempts.

  2. `pin_heddit_post` - queried `heddit_subreddit_moderators WHERE user_id = ...`
     but the column is `account_id`. Also referenced `pin_posts = true` as a boolean column
     but `pin_posts` is stored inside a JSONB `permissions` field.

  ## Fixes
  - Fix `pin_heddit_post_admin`: change `WHERE user_id = auth.uid()` to `WHERE id = auth.uid()`
  - Fix `pin_heddit_post`: change `user_id` to `account_id` and fix the JSONB permission check
*/

CREATE OR REPLACE FUNCTION public.pin_heddit_post_admin(post_id uuid, should_pin boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
v_is_admin boolean;
v_post_exists boolean;
v_pinned_count integer;
BEGIN
SELECT is_admin INTO v_is_admin
FROM user_profiles
WHERE id = auth.uid();

IF NOT COALESCE(v_is_admin, false) THEN
RAISE EXCEPTION 'Only SentPort admins can use admin pinning';
END IF;

SELECT EXISTS(
SELECT 1 FROM heddit_posts WHERE id = post_id
) INTO v_post_exists;

IF NOT v_post_exists THEN
RAISE EXCEPTION 'Post not found';
END IF;

IF should_pin THEN
SELECT COUNT(*) INTO v_pinned_count
FROM heddit_posts
WHERE is_pinned = true;

IF v_pinned_count >= 5 THEN
RAISE EXCEPTION 'Maximum of 5 posts can be pinned at once. Please unpin another post first.';
END IF;

UPDATE heddit_posts
SET is_pinned = true,
pinned_at = now(),
pinned_by = auth.uid()
WHERE id = post_id;
ELSE
UPDATE heddit_posts
SET is_pinned = false,
pinned_at = NULL,
pinned_by = NULL
WHERE id = post_id;
END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.pin_heddit_post(post_id uuid, subreddit_id uuid, should_pin boolean)
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
SELECT 1 FROM heddit_post_subreddits
WHERE heddit_post_subreddits.post_id = pin_heddit_post.post_id
AND heddit_post_subreddits.subreddit_id = pin_heddit_post.subreddit_id
) INTO v_post_in_community;

IF NOT v_post_in_community THEN
RAISE EXCEPTION 'Post does not belong to this community';
END IF;

SELECT EXISTS (
SELECT 1 FROM heddit_subreddits
WHERE heddit_subreddits.id = pin_heddit_post.subreddit_id
AND heddit_subreddits.creator_id = auth.uid()
) INTO v_has_permission;

IF NOT v_has_permission THEN
SELECT EXISTS (
SELECT 1 FROM heddit_subreddit_moderators
WHERE heddit_subreddit_moderators.subreddit_id = pin_heddit_post.subreddit_id
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

IF should_pin THEN
SELECT COUNT(*) INTO v_pinned_count
FROM heddit_community_pins
WHERE heddit_community_pins.subreddit_id = pin_heddit_post.subreddit_id;

IF v_pinned_count >= 5 THEN
RAISE EXCEPTION 'Maximum of 5 posts can be pinned at once in this community';
END IF;

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
