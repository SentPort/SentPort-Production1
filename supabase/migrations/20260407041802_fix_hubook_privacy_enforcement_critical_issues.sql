/*
  # Fix Critical Privacy Enforcement Issues in HuBook

  1. Problem Identified
    - hubook_profiles has TWO conflicting SELECT policies:
      * "Users can view all HuBook profiles" with USING (true) - TOO PERMISSIVE
      * "Users can view profiles based on privacy settings" with can_view_profile() - CORRECT
    - The permissive policy overrides the privacy-enforcing policy
    - friendships table doesn't enforce who_can_see_friends_list privacy setting
    
  2. Changes
    - Remove the overly-permissive "Users can view all HuBook profiles" policy
    - Keep only the privacy-enforcing policy that uses can_view_profile()
    - Update friendships SELECT policy to enforce who_can_see_friends_list
    - Ensure users can always view their own profile and friendships
    
  3. Security Impact
    - CRITICAL FIX: Profile privacy settings will now be properly enforced
    - Users with profile_visibility='private' will only be viewable by friends
    - Users with profile_visibility='friends_only' will only be viewable by friends
    - Friends lists will respect who_can_see_friends_list privacy setting
    - Users can always view their own profile and friendships regardless of privacy

  4. Notes
    - Posts table already has correct privacy enforcement (verified)
    - This fixes the gap between frontend privacy checks and backend enforcement
    - All privacy helper functions (can_view_profile, are_users_friends, etc.) already exist
*/

-- Drop the conflicting overly-permissive policy on hubook_profiles
DROP POLICY IF EXISTS "Users can view all HuBook profiles" ON hubook_profiles;

-- The correct policy "Users can view profiles based on privacy settings" remains
-- It uses: can_view_profile(auth.uid(), id)
-- This properly enforces profile_visibility settings

-- Update friendships SELECT policy to enforce who_can_see_friends_list privacy
-- Users should only see OTHER users' friendships if allowed by privacy settings
DROP POLICY IF EXISTS "Users can view their friendships" ON friendships;

CREATE POLICY "Users can view friendships based on privacy settings"
  ON friendships
  FOR SELECT
  TO authenticated
  USING (
    -- Can always view own friendships
    (requester_id = auth.uid()) OR (addressee_id = auth.uid())
    OR
    -- Can view others' friendships if privacy allows
    (
      can_view_friends_list(
        auth.uid(),
        CASE 
          WHEN requester_id = auth.uid() THEN addressee_id
          WHEN addressee_id = auth.uid() THEN requester_id
          ELSE requester_id  -- For viewing other people's friendships
        END
      )
      AND status = 'accepted'  -- Only show accepted friendships to others
    )
  );
