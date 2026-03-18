/*
  # Fix Group Creation Trigger RLS Bypass

  1. Problem
    - The `add_creator_as_group_admin()` trigger function fails because it runs with SECURITY DEFINER
    - In that context, `auth.uid()` returns NULL, causing RLS policies to block the insert
    - This prevents group creators from being automatically added as admins

  2. Solution
    - Modify the trigger function to disable RLS temporarily using `SET LOCAL`
    - This allows the system to insert the creator as admin regardless of RLS policies
    - The function already has SECURITY DEFINER, so it's safe to bypass RLS

  3. Changes
    - Update `add_creator_as_group_admin()` function to use `SET LOCAL row_security = off`
    - This disables RLS for the duration of the transaction
    - RLS is automatically re-enabled after the transaction completes
*/

-- Recreate the function with RLS bypass
CREATE OR REPLACE FUNCTION add_creator_as_group_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Temporarily disable RLS for this function
  SET LOCAL row_security = off;
  
  INSERT INTO hubook_group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.creator_id, 'admin');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;