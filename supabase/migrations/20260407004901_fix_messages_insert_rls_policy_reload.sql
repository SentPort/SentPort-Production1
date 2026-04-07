/*
  # Fix Messages INSERT RLS Policy - Force Reload
  
  1. Problem
    - Users getting 403 "new row violates row-level security policy" when sending messages
    - Policy logic is correct but may not be properly applied by PostgREST
    - Need to force a complete policy reload
  
  2. Changes
    - Drop and recreate the INSERT policy for messages
    - Ensure the policy correctly checks both user_conversation_access and conversation_participants
    - Force PostgREST schema cache reload
  
  3. Security
    - Maintains existing security model
    - User must be sender (sender_id = auth.uid())
    - User must be participant in the conversation
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;

-- Recreate the INSERT policy with proper checks
CREATE POLICY "Users can send messages to their conversations"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User must be the sender
    sender_id = auth.uid()
    AND (
      -- Check if user has access via helper table (fast)
      conversation_id IN (
        SELECT conversation_id
        FROM user_conversation_access
        WHERE user_id = auth.uid()
      )
      -- OR check if user is a participant (authoritative)
      OR conversation_id IN (
        SELECT conversation_id
        FROM conversation_participants
        WHERE user_id = auth.uid()
      )
    )
  );

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
