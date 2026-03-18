/*
  # Fix Group Creation RLS Bypass Issue

  1. Problem
    - The trigger function `add_creator_as_group_admin` runs with SECURITY DEFINER as postgres
    - When the trigger executes, `auth.uid()` returns NULL in the postgres context
    - The RLS policy on `hubook_group_members` checks `auth.uid()`, which fails
    - This prevents the creator from being added as admin, blocking group creation

  2. Solution
    - Update the RLS policy to allow system-level insertions from trusted triggers
    - Add a special policy that allows insertions where the user being added matches the group creator
    - This allows the trigger to add the creator as admin regardless of the execution context

  3. Changes
    - Drop the existing "Users can join groups" policy
    - Create new policies:
      - "Users can join public groups" - for normal user joins
      - "System can add creator as admin" - for trigger-based admin assignment
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can join groups" ON hubook_group_members;

-- Allow users to join public groups themselves
CREATE POLICY "Users can join public groups"
  ON hubook_group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM hubook_groups 
      WHERE id = group_id AND privacy_setting = 'public'
    )
  );

-- Allow system/triggers to add the creator as admin
-- This checks that the user being added is the group creator
CREATE POLICY "System can add creator as admin"
  ON hubook_group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hubook_groups 
      WHERE id = group_id AND creator_id = user_id
    )
  );
