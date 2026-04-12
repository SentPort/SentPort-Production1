/*
  # Add Atomic Comment Count Update Function

  ## Summary
  Creates a database-level function to safely increment or decrement
  like_count and dislike_count on platform_comments using atomic SQL updates.

  ## Problem Being Solved
  The previous client-side approach read the stale count from the component
  prop, added/subtracted 1, then wrote that absolute value back. Under
  concurrent access (two users liking the same comment), both users would
  read count=0 and both write count=1, resulting in a final value of 1
  instead of 2.

  ## New Function
  - `adjust_comment_count(p_comment_id uuid, p_field text, p_delta integer)`
    - Updates the specified count column by the given delta atomically
    - Uses GREATEST(0, col + delta) to prevent negative counts
    - Only allows 'like_count' or 'dislike_count' as valid field names
    - SECURITY DEFINER so it can bypass RLS while still being called by
      authenticated users

  ## Security
  - Validates the field name to prevent SQL injection
  - Returns void; errors are raised for invalid input
*/

CREATE OR REPLACE FUNCTION adjust_comment_count(
  p_comment_id uuid,
  p_field text,
  p_delta integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_field = 'like_count' THEN
    UPDATE platform_comments
    SET like_count = GREATEST(0, like_count + p_delta)
    WHERE id = p_comment_id;
  ELSIF p_field = 'dislike_count' THEN
    UPDATE platform_comments
    SET dislike_count = GREATEST(0, dislike_count + p_delta)
    WHERE id = p_comment_id;
  ELSE
    RAISE EXCEPTION 'Invalid field: %. Must be like_count or dislike_count.', p_field;
  END IF;
END;
$$;
