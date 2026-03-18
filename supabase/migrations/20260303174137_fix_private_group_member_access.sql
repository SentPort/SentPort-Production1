/*
  # Fix Private Group Access for Members

  1. Problem
    - Private groups can only be viewed by their creators
    - Members of private groups cannot view the group page
    - This causes the GroupDetail page to fail when members try to access private groups

  2. Solution
    - Update the SELECT policy on `hubook_groups` to allow members to view groups they belong to
    - Add membership check: user must be in `hubook_group_members` for that group
    - This mirrors the pattern used in `hubook_group_posts` which works correctly

  3. Security
    - Public groups: anyone can view
    - Private groups: only creator and members can view
    - Non-members cannot view private groups
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view public groups or groups they created" ON hubook_groups;

-- Create new policy that allows members to view private groups
CREATE POLICY "Users can view accessible groups"
  ON hubook_groups
  FOR SELECT
  TO authenticated
  USING (
    privacy_setting = 'public'
    OR creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 
      FROM hubook_group_members 
      WHERE hubook_group_members.group_id = hubook_groups.id 
        AND hubook_group_members.user_id = auth.uid()
    )
  );
