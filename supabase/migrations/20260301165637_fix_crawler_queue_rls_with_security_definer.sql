/*
  # Fix Crawler Queue RLS Circular Dependency

  1. Problem
    - crawler_queue RLS policy checks user_profiles.is_admin
    - user_profiles has RLS that restricts access
    - This creates a circular dependency causing auth failures when inserting into crawler_queue

  2. Solution
    - Create a SECURITY DEFINER function that bypasses RLS to check admin status
    - Update crawler_queue RLS policies to use this function instead of direct JOIN
    - This prevents nested RLS checks and eliminates the circular dependency

  3. Changes
    - Drop existing crawler_queue RLS policy
    - Create is_user_admin() security definer function
    - Recreate crawler_queue RLS policy using the new function
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Admin users can manage crawler queue" ON crawler_queue;

-- Create security definer function to check admin status
-- This function runs with the permissions of the owner (bypasses RLS)
CREATE OR REPLACE FUNCTION is_user_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_profiles
    WHERE id = user_id
    AND is_admin = true
  );
END;
$$;

-- Recreate the policy using the security definer function
CREATE POLICY "Admin users can manage crawler queue"
  ON crawler_queue
  FOR ALL
  TO authenticated
  USING (is_user_admin(auth.uid()))
  WITH CHECK (is_user_admin(auth.uid()));

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_user_admin(uuid) TO authenticated;
