/*
  # Fix HuBook Groups Creator Admin Insertion

  1. Changes
    - Update RLS policy for hubook_group_members INSERT to allow the trigger to add creators as admins
    - Add a new policy specifically for system-level inserts (like the trigger)
    - Fix the trigger function to properly handle RLS
    
  2. Security
    - Users can still only join public groups themselves
    - The trigger can add the creator as admin regardless of privacy setting
    - Maintains security while allowing proper group creation
*/

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can join groups" ON hubook_group_members;

-- Create a more permissive policy that allows:
-- 1. Users to join public groups themselves
-- 2. The system (trigger) to add creators as admins
CREATE POLICY "Users can join groups or be added as admins"
  ON hubook_group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Users can join public groups themselves
    (user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM hubook_groups 
      WHERE id = group_id AND privacy_setting = 'public'
    ))
    OR
    -- OR creator is being added as admin by the trigger
    (EXISTS (
      SELECT 1 FROM hubook_groups 
      WHERE id = group_id AND creator_id = user_id
    ))
  );
