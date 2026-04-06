/*
  # Fix Conversations SELECT RLS Policy for Foreign Key Validation
  
  1. Problem
    - When inserting messages, the foreign key constraint triggers a SELECT on conversations table
    - Current SELECT policy only checks conversation_participants table
    - If user_conversation_access is populated but there's a timing issue, FK validation can fail
    - This causes "new row violates row-level security policy" error on messages INSERT
  
  2. Root Cause
    - Foreign key validation: messages.conversation_id -> conversations.id
    - FK check requires SELECT permission on conversations table
    - SELECT policy uses conversation_participants which may have sync delays
    - No fallback to user_conversation_access helper table
  
  3. Solution
    - Update conversations SELECT policy to also check user_conversation_access
    - This ensures FK validation succeeds when user has access via helper table
    - Maintains security while being resilient to sync timing issues
  
  4. Security
    - No reduction in security - still validates user is a participant
    - Just adds fallback path to helper table for reliability
*/

-- Drop the old SELECT policy on conversations
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;

-- Create new SELECT policy with fallback to user_conversation_access
CREATE POLICY "Users can view their conversations"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (
    -- Primary check: conversation_participants (authoritative)
    id IN (
      SELECT conversation_id
      FROM conversation_participants
      WHERE user_id = auth.uid()
    )
    -- Fallback check: user_conversation_access helper table (optimized)
    OR id IN (
      SELECT conversation_id
      FROM user_conversation_access
      WHERE user_id = auth.uid()
    )
  );
