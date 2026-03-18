/*
  # Simplify HuBook Groups to Public-Only

  1. Changes
    - Remove private group option
    - Convert all existing groups to public
    - Update privacy_setting constraint to only allow 'public'
    - Simplify RLS policies since all groups are now public

  2. Security
    - All users can view all groups
    - Only authenticated users can create groups
    - Only admins/moderators can update group settings
    - Group membership tracking remains unchanged
*/

-- Update all existing groups to be public
UPDATE hubook_groups
SET privacy_setting = 'public'
WHERE privacy_setting = 'private';

-- Drop the old constraint
ALTER TABLE hubook_groups
DROP CONSTRAINT IF EXISTS hubook_groups_privacy_setting_check;

-- Add new constraint that only allows 'public'
ALTER TABLE hubook_groups
ADD CONSTRAINT hubook_groups_privacy_setting_check
CHECK (privacy_setting = 'public');

-- Update default to 'public' (it already was, but making it explicit)
ALTER TABLE hubook_groups
ALTER COLUMN privacy_setting SET DEFAULT 'public';

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view accessible groups" ON hubook_groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON hubook_groups;
DROP POLICY IF EXISTS "Group admins can update groups" ON hubook_groups;
DROP POLICY IF EXISTS "Group admins can delete groups" ON hubook_groups;

-- Create simplified RLS policies for public-only groups
CREATE POLICY "Anyone can view all groups"
  ON hubook_groups
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create groups"
  ON hubook_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Group admins can update group settings"
  ON hubook_groups
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hubook_group_members
      WHERE hubook_group_members.group_id = hubook_groups.id
      AND hubook_group_members.user_id = auth.uid()
      AND hubook_group_members.role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hubook_group_members
      WHERE hubook_group_members.group_id = hubook_groups.id
      AND hubook_group_members.user_id = auth.uid()
      AND hubook_group_members.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Group admins can delete groups"
  ON hubook_groups
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hubook_group_members
      WHERE hubook_group_members.group_id = hubook_groups.id
      AND hubook_group_members.user_id = auth.uid()
      AND hubook_group_members.role = 'admin'
    )
  );

-- Simplify group members policies since all groups are public
DROP POLICY IF EXISTS "Members can view group membership" ON hubook_group_members;
DROP POLICY IF EXISTS "Anyone can view public group membership" ON hubook_group_members;
DROP POLICY IF EXISTS "Users can view group membership" ON hubook_group_members;

CREATE POLICY "Anyone can view group membership"
  ON hubook_group_members
  FOR SELECT
  TO authenticated
  USING (true);