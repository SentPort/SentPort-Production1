/*
  # Fix Messages Insert RLS - Remove Duplicate Policy

  1. Problem
    - Two INSERT policies on messages table are both required to pass (AND logic)
    - This causes conflicts where valid message sends are blocked
    - Error: "new row violates row-level security policy for table 'messages'"

  2. Solution
    - Drop the redundant "Users can send messages to their conversations" policy
    - Keep "Users can send messages to their active conversations" which properly validates:
      - User is a participant in the conversation
      - The conversation participation is not deleted (deleted_at IS NULL)
    
  3. Security Impact
    - No reduction in security - the remaining policy is more restrictive and correct
    - Users can only send messages to conversations they actively participate in
    - Deleted/blocked conversations are properly excluded
*/

-- Drop the redundant and conflicting INSERT policy
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;
