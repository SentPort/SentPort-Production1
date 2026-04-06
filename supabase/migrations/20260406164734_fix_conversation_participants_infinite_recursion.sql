/*
  # Fix Infinite Recursion in conversation_participants RLS Policy

  1. Problem
    - INSERT policy on conversation_participants causes infinite recursion
    - When inserting TWO rows (sender + recipient), the policy check triggers SELECT policy
    - SELECT policy queries conversation_participants table, creating infinite loop
    - Error: "infinite recursion detected in policy for relation conversation_participants"

  2. Solution
    - Modify INSERT policy to allow users to always add themselves without recursion
    - Only check messaging privacy when adding OTHER users
    - Policy logic: (user_id = auth.uid() OR can_message_user(auth.uid(), user_id))
    - This prevents recursion because self-insertion doesn't trigger the privacy check

  3. Changes
    - Drop existing INSERT policy
    - Create new INSERT policy with self-insertion bypass
    - Maintains security: still checks privacy for adding others
*/

-- Drop the existing INSERT policy that causes recursion
DROP POLICY IF EXISTS "Users can add participants based on messaging privacy" ON conversation_participants;

-- Create new INSERT policy that allows self-insertion without recursion
CREATE POLICY "Users can add participants based on messaging privacy"
  ON conversation_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow users to always add themselves to any conversation
    user_id = auth.uid()
    OR
    -- For adding others, check messaging privacy (only applies when adding the OTHER person)
    can_message_user(auth.uid(), user_id)
  );