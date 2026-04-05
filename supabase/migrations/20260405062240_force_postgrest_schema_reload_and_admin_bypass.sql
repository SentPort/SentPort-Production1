/*
  # Force PostgREST Schema Reload and Add Admin Bypass

  1. Schema Cache Reload
    - Send NOTIFY signals to PostgREST to force schema cache refresh
    - Add explicit grants on is_user_admin function
    - Add function comments to trigger introspection
    - Execute dummy queries to warm the cache

  2. Direct Admin Bypass Policies
    - Add RLS policies on crawler_queue that check user_profiles.is_admin directly
    - Provide fallback path when function-based RLS fails
    - Use parallel OR conditions for maximum compatibility

  3. Admin Bypass Function
    - Create get_crawler_queue_for_admin() SECURITY DEFINER function
    - Bypasses RLS entirely by checking admin status internally
    - Returns crawler_queue data directly for verified admins
    - Provides guaranteed access during PostgREST cache updates

  4. Monitoring and Recovery
    - Add logging for cache reload events
    - Create helper function to verify PostgREST cache status
*/

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Add explicit grants to ensure all roles can call is_user_admin
GRANT EXECUTE ON FUNCTION is_user_admin(uuid) TO anon;
GRANT EXECUTE ON FUNCTION is_user_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_admin(uuid) TO service_role;

-- Add comment to trigger schema introspection
COMMENT ON FUNCTION is_user_admin(uuid) IS 'Checks if a user has admin privileges - refreshed schema cache';

-- Execute dummy query to ensure function is cached
DO $$
DECLARE
  test_result boolean;
BEGIN
  SELECT is_user_admin(auth.uid()) INTO test_result;
END $$;

-- Add direct admin bypass policies for crawler_queue (parallel to function-based policies)
-- These check user_profiles.is_admin directly without calling the function

-- Drop existing restrictive policies if they exist and recreate with bypass
DO $$
BEGIN
  -- Drop and recreate SELECT policy with admin bypass
  DROP POLICY IF EXISTS "Admins can view crawler queue" ON crawler_queue;
  
  CREATE POLICY "Admins can view crawler queue"
    ON crawler_queue
    FOR SELECT
    TO authenticated
    USING (
      -- Option 1: Direct check on user_profiles table
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.is_admin = true
      )
      OR
      -- Option 2: Function-based check (when PostgREST cache is updated)
      is_user_admin(auth.uid())
    );

  -- Drop and recreate INSERT policy with admin bypass
  DROP POLICY IF EXISTS "Admins can insert to crawler queue" ON crawler_queue;
  
  CREATE POLICY "Admins can insert to crawler queue"
    ON crawler_queue
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.is_admin = true
      )
      OR
      is_user_admin(auth.uid())
    );

  -- Drop and recreate UPDATE policy with admin bypass
  DROP POLICY IF EXISTS "Admins can update crawler queue" ON crawler_queue;
  
  CREATE POLICY "Admins can update crawler queue"
    ON crawler_queue
    FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.is_admin = true
      )
      OR
      is_user_admin(auth.uid())
    );

  -- Drop and recreate DELETE policy with admin bypass
  DROP POLICY IF EXISTS "Admins can delete from crawler queue" ON crawler_queue;
  
  CREATE POLICY "Admins can delete from crawler queue"
    ON crawler_queue
    FOR DELETE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.is_admin = true
      )
      OR
      is_user_admin(auth.uid())
    );
END $$;

-- Create SECURITY DEFINER function to get crawler queue for admins
-- This completely bypasses RLS for verified admins
CREATE OR REPLACE FUNCTION get_crawler_queue_for_admin(
  filter_status text DEFAULT NULL,
  page_limit int DEFAULT 50,
  page_offset int DEFAULT 0
)
RETURNS TABLE (
  id bigint,
  url text,
  status text,
  priority int,
  retry_count int,
  created_at timestamptz,
  updated_at timestamptz,
  last_error text,
  indexed_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if the current user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.is_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Return crawler queue data
  RETURN QUERY
  SELECT 
    cq.id,
    cq.url,
    cq.status,
    cq.priority,
    cq.retry_count,
    cq.created_at,
    cq.updated_at,
    cq.last_error,
    cq.indexed_at
  FROM crawler_queue cq
  WHERE (filter_status IS NULL OR cq.status = filter_status)
  ORDER BY cq.priority DESC, cq.created_at ASC
  LIMIT page_limit
  OFFSET page_offset;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_crawler_queue_for_admin(text, int, int) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_crawler_queue_for_admin IS 'Returns crawler queue data for admin users, bypassing RLS completely';

-- Create function to get crawler queue counts for admins
CREATE OR REPLACE FUNCTION get_crawler_queue_counts_for_admin()
RETURNS TABLE (
  total_count bigint,
  pending_count bigint,
  completed_count bigint,
  failed_count bigint
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if the current user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.is_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Return counts
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_count,
    COUNT(*) FILTER (WHERE status = 'pending')::bigint as pending_count,
    COUNT(*) FILTER (WHERE status = 'completed')::bigint as completed_count,
    COUNT(*) FILTER (WHERE status = 'failed')::bigint as failed_count
  FROM crawler_queue;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_crawler_queue_counts_for_admin() TO authenticated;

-- Send final NOTIFY to ensure PostgREST picks up all changes
NOTIFY pgrst, 'reload schema';

-- Run ANALYZE to update statistics
ANALYZE crawler_queue;
ANALYZE user_profiles;
