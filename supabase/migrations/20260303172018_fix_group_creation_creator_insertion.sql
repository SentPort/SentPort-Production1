/*
  # Fix Group Creation - Allow Creator Insertion
  
  This migration fixes the issue where group creators cannot be automatically
  added as admins to private groups.
  
  ## Problem
  The existing RLS policy "Users can join groups" only allows insertion when:
  - user_id = auth.uid() (correct)
  - AND the group is public (blocks private group creation)
  
  ## Solution
  Add a separate policy that allows insertion when:
  - The user is the creator of the group being referenced
  - This allows the trigger function to add creators as admins for both public and private groups
  
  ## Changes
  1. Add new policy "Group creators can be added as admins" specifically for trigger function
*/

-- Add policy to allow creator to be added as admin (used by trigger)
CREATE POLICY "Group creators can be added as admins"
  ON hubook_group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM hubook_groups 
      WHERE id = group_id AND creator_id = auth.uid()
    )
  );
