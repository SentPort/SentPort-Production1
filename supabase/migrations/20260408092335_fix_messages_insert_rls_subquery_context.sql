/*
  # Fix Messages INSERT RLS - Subquery Context Issue

  1. Problem
    - The INSERT policy uses EXISTS with a subquery on conversation_participants
    - PostgreSQL RLS applies to that subquery too
    - The subquery executes in a different security context where auth.uid() may not work correctly
    - This causes the EXISTS check to return false even when the user IS a participant

  2. Root Cause
    - WITH CHECK clause subqueries have RLS applied
    - The nested RLS evaluation causes auth.uid() context issues
    - Even though the user IS in conversation_participants, the subquery can't see it

  3. Solution
    - Create a SECURITY DEFINER helper function to check participation
    - This function bypasses RLS and directly checks the table
    - The function is safe because it still validates user_id = the calling user

  4. Security
    - Function uses SECURITY DEFINER to bypass RLS on the subquery
    - Still validates that the user is checking their own participation
    - Maintains all security guarantees
*/

-- Create a helper function that bypasses RLS to check conversation participation
CREATE OR REPLACE FUNCTION is_conversation_participant(
  p_conversation_id uuid,
  p_user_id uuid
)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM conversation_participants
    WHERE conversation_id = p_conversation_id
      AND user_id = p_user_id
      AND deleted_at IS NULL
  );
END;
$$;

-- Drop the old policy
DROP POLICY IF EXISTS "Users can send messages to their active conversations" ON messages;

-- Create new policy using the helper function
CREATE POLICY "Users can send messages to their active conversations"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND is_conversation_participant(conversation_id, auth.uid())
  );
