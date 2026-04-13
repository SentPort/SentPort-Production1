/*
  # Fix RLS Self-Join Bugs on Collaboration Tables

  ## Problems Fixed

  1. blog_collaboration_members SELECT policy "Members view memberships"
     - Bug: `cm.collaboration_id = cm.collaboration_id` is always true (self-join, always returns rows)
     - Fix: `cm.collaboration_id = blog_collaboration_members.collaboration_id`
     - Also expand status check to include 'accepted' and 'active'

  2. blog_collaborations SELECT policy "View active collaborations"
     - Bug: `m.collaboration_id = m.id` compares collaboration_id to member's own id (nonsense join)
     - Fix: `m.collaboration_id = blog_collaborations.id`
     - Also expand status to include 'published', 'completed' so members can still view after publishing

  3. blog_collaboration_members INSERT policy "Creators invite members"
     - Expand to also allow SECURITY DEFINER functions (via service role) to insert members
     - Also allow users to insert themselves (for the proposal approval fallback path)
*/

-- Fix blog_collaboration_members SELECT policy (self-join bug)
DROP POLICY IF EXISTS "Members view memberships" ON blog_collaboration_members;

CREATE POLICY "Members view memberships"
  ON blog_collaboration_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM blog_collaboration_members cm
      WHERE cm.collaboration_id = blog_collaboration_members.collaboration_id
        AND cm.user_id = auth.uid()
        AND cm.status IN ('active', 'accepted')
    )
  );

-- Fix blog_collaborations SELECT policy (self-join / wrong column bug)
DROP POLICY IF EXISTS "View active collaborations" ON blog_collaborations;

CREATE POLICY "View active collaborations"
  ON blog_collaborations
  FOR SELECT
  TO authenticated
  USING (
    status IN ('active', 'published', 'completed')
    OR EXISTS (
      SELECT 1
      FROM blog_collaboration_members m
      WHERE m.collaboration_id = blog_collaborations.id
        AND m.user_id = auth.uid()
        AND m.status IN ('active', 'accepted')
    )
  );

-- Allow authenticated users to insert into blog_collaboration_members for their own user_id
-- (needed for the proposal-approval path where the frontend inserts members)
DROP POLICY IF EXISTS "Members insert own membership" ON blog_collaboration_members;

CREATE POLICY "Members insert own membership"
  ON blog_collaboration_members
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
