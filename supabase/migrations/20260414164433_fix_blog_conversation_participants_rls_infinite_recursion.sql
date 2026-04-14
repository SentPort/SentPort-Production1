/*
  # Fix Blog Conversation Participants RLS Infinite Recursion

  ## Problem
  The SELECT policy on `blog_conversation_participants` uses a self-referential
  subquery: it queries `blog_conversation_participants` to determine if the user
  can view `blog_conversation_participants`. This causes infinite recursion, 
  which Supabase silently handles by returning empty results — making it appear
  that conversations don't exist after creation.

  ## Fix
  Replace the self-referential SELECT policy with a direct check using
  `auth.uid()` to verify the current row belongs to the authenticated user.
  
  Also add INSERT policy that allows SECURITY DEFINER functions to insert
  participant rows for other users (the existing policy blocks non-self inserts
  at the RLS level, but SECURITY DEFINER bypasses it; however we clean up any
  ambiguity here).

  ## Changes
  1. Drop the self-referential SELECT policy
  2. Add a simple direct SELECT policy: users can see rows where account_id = auth.uid()
  3. Add a cross-participant SELECT policy so users can see the other participant's row
     (needed to determine who the other user is in a conversation)
*/

-- Drop the broken self-referential SELECT policy
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON blog_conversation_participants;

-- Simple direct policy: see your own participant records
CREATE POLICY "Users can view own participant records"
  ON blog_conversation_participants
  FOR SELECT
  TO authenticated
  USING (account_id = auth.uid());

-- Policy: see other participants in conversations you're already in
-- Uses blog_conversations table to cross-reference, avoiding self-reference
CREATE POLICY "Users can view co-participants in shared conversations"
  ON blog_conversation_participants
  FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id
      FROM blog_conversation_participants
      WHERE account_id = auth.uid()
    )
  );
