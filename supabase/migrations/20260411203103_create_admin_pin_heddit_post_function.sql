/*
  # Create Admin-Only Heddit Post Pinning Function

  ## Summary
  Adds a dedicated `pin_heddit_post_admin` function separate from the community moderator
  pinning system. This function is for SentPort global admins only and pins posts to the
  top of the main Heddit platform feed (not a specific community feed).

  ## Key Rules
  1. Caller must be a global SentPort admin (user_profiles.is_admin = true)
  2. The post being pinned must have been authored by the calling admin's own Heddit account
  3. Writes to heddit_posts.is_pinned / pinned_at / pinned_by (the existing admin pin columns)
  4. Enforces a global 5-pin limit across all admin-pinned posts
  5. Completely separate from pin_heddit_post(post_id, subreddit_id, should_pin)
     which is the community moderator pinning system

  ## Notes
  - Admin pins appear on the main Heddit feed only, not inside community feeds
  - Community moderator pins (heddit_community_pins table) are unaffected
*/

CREATE OR REPLACE FUNCTION pin_heddit_post_admin(
  post_id uuid,
  should_pin boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_admin_account_id uuid;
  v_post_author_id uuid;
  v_pinned_count integer;
BEGIN
  SELECT is_admin INTO v_is_admin
  FROM user_profiles
  WHERE user_id = auth.uid();

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only SentPort admins can use admin pinning';
  END IF;

  SELECT id INTO v_admin_account_id
  FROM heddit_accounts
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_admin_account_id IS NULL THEN
    RAISE EXCEPTION 'Admin does not have a Heddit account';
  END IF;

  SELECT author_id INTO v_post_author_id
  FROM heddit_posts
  WHERE id = post_id;

  IF v_post_author_id IS NULL THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  IF v_post_author_id != v_admin_account_id THEN
    RAISE EXCEPTION 'Admins can only pin their own posts to the platform feed';
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
