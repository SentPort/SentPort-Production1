/*
  # Remove Conflicting Group Member Policies

  1. Changes
    - DROP the old conflicting policy "Users can join groups or be added as admins"
    - This policy was interfering with the trigger-based admin insertion
    - Keep only the two correct policies:
      - "Users can join public groups" (for user-initiated joins)
      - "System can add creator as admin" (for trigger-based admin assignment)

  2. Security
    - Maintains proper RLS protection
    - Ensures only the correct policies are active
    - Allows the trigger to function properly
*/

-- Drop the conflicting old policy
DROP POLICY IF EXISTS "Users can join groups or be added as admins" ON hubook_group_members;
