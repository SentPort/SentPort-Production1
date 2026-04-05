/*
  # Reload PostgREST Schema Cache After is_user_admin Function Recreation

  1. Purpose
    - Forces PostgREST to reload its schema cache after the is_user_admin function was recreated
    - Fixes HTTP 500 errors on crawler_queue table queries
    - Resolves RLS policy recognition issues in the Supabase JS client

  2. Background
    - Migration 20260405035610 dropped and recreated is_user_admin() using CASCADE
    - This temporarily removed RLS policies, then recreated them
    - PostgREST's schema cache became stale and didn't recognize the recreated policies
    - Supabase JS client queries failed with HTTP 500 (Internal Server Error)

  3. Solution
    - Send NOTIFY command to force PostgREST schema cache reload
    - This makes PostgREST aware of the current RLS policies
    - All crawler_queue queries should work immediately after this executes

  4. Best Practice
    - Always include NOTIFY pgrst after DROP...CASCADE operations
    - Prevents schema cache staleness issues
    - Ensures API layer stays in sync with database changes
*/

-- Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';

-- Verify that is_user_admin function exists and has proper grants
DO $$
BEGIN
  -- Ensure the function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'is_user_admin'
  ) THEN
    RAISE EXCEPTION 'is_user_admin function does not exist - schema cache reload may not help';
  END IF;

  -- Re-grant execute permissions to be absolutely sure
  EXECUTE 'GRANT EXECUTE ON FUNCTION is_user_admin(uuid) TO authenticated, anon, service_role';
END $$;
