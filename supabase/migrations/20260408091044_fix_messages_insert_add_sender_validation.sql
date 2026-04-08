/*
  # Fix Messages INSERT RLS - Add Missing sender_id Validation

  1. Problem
    - Current policy validates user is a conversation participant
    - BUT it doesn't check that sender_id = auth.uid()
    - This causes inserts to fail because sender_id isn't validated
    - Critical security check is missing

  2. Solution
    - Update the policy to include sender_id = auth.uid() check
    - This ensures users can only send messages as themselves
    - Maintains all existing conversation participant checks

  3. Security
    - Prevents user impersonation (can't set sender_id to another user)
    - Validates user is an active participant (deleted_at IS NULL)
    - More secure than before
*/

-- Drop the incomplete policy
DROP POLICY IF EXISTS "Users can send messages to their active conversations" ON messages;

-- Create the complete policy with proper sender_id validation
CREATE POLICY "Users can send messages to their active conversations"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
        AND cp.deleted_at IS NULL
    )
  );
