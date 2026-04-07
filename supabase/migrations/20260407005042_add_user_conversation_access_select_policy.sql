/*
  # Add SELECT Policy to user_conversation_access Table
  
  1. Problem
    - user_conversation_access has RLS enabled but NO SELECT policy
    - This blocks all reads, even from other RLS policies
    - messages INSERT policy cannot verify conversation access
    - Results in "new row violates row-level security policy" error
  
  2. Root Cause
    - Table was created with RLS enabled in migration 20260406174045
    - No SELECT policy was ever added
    - Without a SELECT policy, the table is invisible to authenticated users
    - Other policies that try to check this table fail
  
  3. Solution
    - Add SELECT policy allowing users to see their own access records
    - Simple condition: user_id = auth.uid()
    - This unblocks the messages INSERT policy
  
  4. Security
    - Users can only see their own conversation access records
    - No information leakage about other users' conversations
    - Maintains security while fixing functionality
*/

-- Add SELECT policy for user_conversation_access
CREATE POLICY "Users can view their own conversation access"
  ON user_conversation_access
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';
