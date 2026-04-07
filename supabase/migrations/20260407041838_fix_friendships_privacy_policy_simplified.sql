/*
  # Simplify Friendships Privacy Policy

  1. Problem
    - Previous policy logic was overly complex for determining whose friendships to show
    - The CASE statement was confusing and may not work correctly for all scenarios
    
  2. Solution
    - Users can always view their own friendships (requester or addressee)
    - Users can view friendships of OTHER users only if:
      * The friendship is accepted (no pending requests visible to outsiders)
      * The profile owner's who_can_see_friends_list privacy allows it
    - Simplify by checking both requester and addressee separately
    
  3. Security
    - More restrictive and clearer logic
    - Properly enforces who_can_see_friends_list privacy setting
    - Users can always see their own friendships regardless of privacy
*/

-- Drop the previous complex policy
DROP POLICY IF EXISTS "Users can view friendships based on privacy settings" ON friendships;

-- Create simplified and correct policy
CREATE POLICY "Users can view friendships based on privacy settings"
  ON friendships
  FOR SELECT
  TO authenticated
  USING (
    -- Can always view own friendships (as requester or addressee)
    (requester_id = auth.uid()) 
    OR 
    (addressee_id = auth.uid())
    OR
    -- Can view if friendship is accepted AND privacy allows viewing requester's friends list
    (
      status = 'accepted'
      AND can_view_friends_list(auth.uid(), requester_id)
    )
    OR
    -- Can view if friendship is accepted AND privacy allows viewing addressee's friends list
    (
      status = 'accepted'
      AND can_view_friends_list(auth.uid(), addressee_id)
    )
  );
