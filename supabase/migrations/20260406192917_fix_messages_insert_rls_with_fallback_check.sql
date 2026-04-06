/*
  # Fix Messages INSERT RLS Policy with Fallback Check

  1. Problem
    - Current RLS policy only checks user_conversation_access helper table
    - Helper table may not be immediately synchronized when conversations are created
    - Timing issues cause legitimate message sends to be blocked by RLS
    - Users see "new row violates row-level security policy" error

  2. Root Cause
    - Policy relies solely on helper table: user_conversation_access
    - If helper table entry is missing or delayed, policy blocks valid inserts
    - No fallback to check conversation_participants directly
    - Creates race condition between conversation creation and first message

  3. Solution
    - Update INSERT policy to check BOTH tables
    - Primary check: user_conversation_access (fast, optimized)
    - Fallback check: conversation_participants (authoritative source)
    - This ensures users who are legitimate participants can always send messages
    - Maintains security while being resilient to sync issues

  4. Security
    - Still requires sender_id = auth.uid() (user can only send as themselves)
    - Verifies user is a participant in the conversation
    - No change to security model, just more resilient implementation
*/

-- Drop the old policy
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;

-- Create new policy with fallback check to conversation_participants
CREATE POLICY "Users can send messages to their conversations"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      -- Primary check: user_conversation_access helper table (optimized)
      conversation_id IN (
        SELECT conversation_id
        FROM user_conversation_access
        WHERE user_id = auth.uid()
      )
      -- Fallback check: conversation_participants (authoritative)
      OR conversation_id IN (
        SELECT conversation_id
        FROM conversation_participants
        WHERE user_id = auth.uid()
      )
    )
  );
