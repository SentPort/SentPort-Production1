/*
  # Drop stale find_or_create_conversation 2-parameter overload

  ## Problem
  PostgREST throws PGRST203 ("Could not choose the best candidate function") when
  calling find_or_create_conversation without the force_new parameter, because two
  overloads exist simultaneously:
    1. find_or_create_conversation(user_a_id uuid, user_b_id uuid)           -- stale
    2. find_or_create_conversation(user_a_id uuid, user_b_id uuid, force_new boolean DEFAULT false) -- current

  The old 2-parameter version was never explicitly dropped before the 3-parameter
  version was added with CREATE OR REPLACE, so both coexist in pg_proc.

  ## Fix
  Drop the stale 2-parameter overload. The 3-parameter version already handles
  calls without force_new via DEFAULT false, so no frontend changes are needed.
*/

DROP FUNCTION IF EXISTS public.find_or_create_conversation(uuid, uuid);
