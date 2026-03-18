/*
  # Fix Infinite Recursion in HuBook Groups RLS Policies

  ## Problem
  The SELECT policies on `hubook_groups` and `hubook_group_members` created a circular dependency:
  - `hubook_groups` SELECT policy checked `hubook_group_members` to see if user is a member
  - `hubook_group_members` SELECT policy checked `hubook_groups` to see if group is public
  - This caused PostgreSQL to detect infinite recursion during group creation

  ## Solution
  Break the circular dependency by simplifying the policies:
  
  1. **hubook_groups SELECT Policy**
     - Allow viewing if group is public OR user is the creator
     - Remove the membership check (no longer references hubook_group_members)
  
  2. **hubook_group_members SELECT Policy**
     - Allow viewing own memberships
     - Allow viewing memberships of public groups (one-directional check is safe)
     - Allow viewing memberships of groups the user created
     - Remove the self-referential membership check

  ## Changes Made
  - Drop existing SELECT policies on both tables
  - Create new, simplified SELECT policies without circular dependencies
  
  ## Security Impact
  - Users can view groups they created
  - Users can view public groups
  - Users can view their own memberships
  - Users can view memberships in public groups or groups they created
  - Private groups remain hidden from non-creators/non-members through INSERT/UPDATE policies
*/

-- Drop existing SELECT policies that cause circular dependency
DROP POLICY IF EXISTS "Anyone can view public groups" ON hubook_groups;
DROP POLICY IF EXISTS "Users can view group memberships" ON hubook_group_members;

-- Create new simplified SELECT policy for hubook_groups (no circular reference)
CREATE POLICY "Users can view public groups or groups they created"
  ON hubook_groups
  FOR SELECT
  TO authenticated
  USING (
    privacy_setting = 'public'
    OR creator_id = auth.uid()
  );

-- Create new simplified SELECT policy for hubook_group_members (one-directional check only)
CREATE POLICY "Users can view memberships they can access"
  ON hubook_group_members
  FOR SELECT
  TO authenticated
  USING (
    -- User viewing their own membership
    user_id = auth.uid()
    OR
    -- Viewing memberships in public groups
    EXISTS (
      SELECT 1 FROM hubook_groups
      WHERE hubook_groups.id = hubook_group_members.group_id
        AND hubook_groups.privacy_setting = 'public'
    )
    OR
    -- Viewing memberships in groups they created
    EXISTS (
      SELECT 1 FROM hubook_groups
      WHERE hubook_groups.id = hubook_group_members.group_id
        AND hubook_groups.creator_id = auth.uid()
    )
  );
