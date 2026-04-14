/*
  # Fix Blog Conversation Participants RLS - Use Conversations Table to Avoid Recursion

  ## Problem
  The previous fix still has a self-referential SELECT policy which causes
  infinite recursion. The co-participant policy queries blog_conversation_participants
  to check blog_conversation_participants.

  ## Fix
  Use blog_conversations.participant_1_id and participant_2_id to check membership
  instead of querying blog_conversation_participants recursively. This breaks the
  recursion cycle entirely.

  ## Changes
  1. Drop the still-recursive co-participant policy
  2. Replace with a policy that joins through blog_conversations directly
*/

-- Drop the still-recursive co-participant policy
DROP POLICY IF EXISTS "Users can view co-participants in shared conversations" ON blog_conversation_participants;

-- Join through blog_conversations table (no recursion) to see fellow participants
CREATE POLICY "Users can view co-participants via conversations"
  ON blog_conversation_participants
  FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM blog_conversations
      WHERE participant_1_id = auth.uid()
         OR participant_2_id = auth.uid()
    )
  );
