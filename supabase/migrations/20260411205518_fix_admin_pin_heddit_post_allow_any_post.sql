/*
  # Fix Admin Pin Heddit Post - Allow Pinning Any Post

  ## Summary
  Updates the `pin_heddit_post_admin` function to remove the restriction that admins
  can only pin their own posts. Now any global SentPort admin can pin ANY active
  Heddit post from ANY user to the top of the main platform feed.

  ## Changes
  1. Removes the check for admin's Heddit account ownership
  2. Removes the check that the post must be authored by the admin
  3. Retains: caller must be a global SentPort admin (is_admin = true)
  4. Retains: global 5-pin limit across all admin-pinned posts
  5. Retains: writes to heddit_posts.is_pinned, pinned_at, pinned_by
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
  v_post_exists boolean;
  v_pinned_count integer;
BEGIN
  SELECT is_admin INTO v_is_admin
  FROM user_profiles
  WHERE user_id = auth.uid();

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
