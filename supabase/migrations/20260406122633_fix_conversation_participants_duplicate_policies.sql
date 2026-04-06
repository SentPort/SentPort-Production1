/*
  # Fix Conversation Participants Duplicate INSERT Policies

  1. Changes
    - Remove the overly permissive "Users can add participants to conversations" INSERT policy
    - Keep only the privacy-respecting "Users can add participants based on messaging privacy" policy
    - This resolves the 500 Internal Server Error when creating conversations

  2. Security
    - The remaining policy properly checks messaging privacy via can_message_user() function
    - Ensures users can only add participants to conversations if messaging privacy allows it
*/

-- Drop the overly permissive policy that allows unrestricted inserts
DROP POLICY IF EXISTS "Users can add participants to conversations" ON conversation_participants;
