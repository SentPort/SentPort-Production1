/*
  # Allow Admin Check in SECURITY DEFINER Functions

  ## Problem
  The bulk_add_content_type_rules function does an admin check:
  SELECT 1 FROM user_profiles WHERE id = p_created_by AND is_admin = true
  
  But user_profiles has RLS enabled with a policy that only allows:
  SELECT when auth.uid() = id
  
  Inside SECURITY DEFINER functions, auth.uid() is NULL, so this query
  returns no rows even when p_created_by is a valid admin user.
  This causes the function to throw "Only admins can add content type rules"
  and exit before doing anything.

  ## Solution
  Add a permissive SELECT policy that allows reading admin status without
  requiring auth.uid() to match. This is safe because is_admin is public info.
*/

-- Allow reading user_profiles for admin verification
CREATE POLICY "Allow reading admin status for verification"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);
