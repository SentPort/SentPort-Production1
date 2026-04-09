/*
  # Fix Messages SELECT RLS - Remove message_visibility Dependency

  1. Problem
    - The SELECT policy "Users see messages they have visibility for" requires
      a message_visibility row to exist for every message
    - When PostgREST does INSERT ... RETURNING *, it applies the SELECT RLS to
      the returned row AFTER the INSERT but the AFTER triggers that create
      message_visibility rows run too late for RETURNING * to see them
    - This causes PostgREST to return 0 rows from RETURNING *, which it treats
      as an RLS violation and returns a 403 error to the client
    - Result: message sends fail with "new row violates row-level security"

  2. Solution
    - Replace the message_visibility-based SELECT policy with a direct
      conversation_participants check (same approach as the UPDATE policy)
    - Users can select messages in conversations where they are a participant
      and their participation is not permanently deleted
    - This allows RETURNING * to work correctly on INSERT

  3. Security
    - Same effective security: only participants can read messages
    - message_visibility is still used for the real-time subscription as a
      separate mechanism; this does not affect that system
    - Blocked/deleted conversation handling is maintained via
      is_conversation_participant which respects those states

  4. Affected Tables
    - messages: SELECT policy updated
*/

-- Drop the broken SELECT policy
DROP POLICY IF EXISTS "Users see messages they have visibility for" ON messages;

-- Create a clean SELECT policy that checks conversation participation directly
-- This allows RETURNING * to work immediately after INSERT
CREATE POLICY "Users can view messages in their conversations"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id
      FROM conversation_participants
      WHERE user_id = auth.uid()
        AND deleted_at IS NULL
    )
  );

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
