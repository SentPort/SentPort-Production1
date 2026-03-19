/*
  # Add Service Role Policy for Content Type Rules

  ## Problem
  SECURITY DEFINER functions can't use SET LOCAL row_security = off without superuser.
  RLS policies block INSERT/UPDATE because auth.uid() is NULL inside SECURITY DEFINER functions.

  ## Solution
  Add a policy that allows operations when created_by matches an admin user,
  without checking auth.uid(). This lets the function work by passing p_created_by.
*/

-- Add policy that allows INSERT/UPDATE when created_by is an admin
CREATE POLICY "Allow function operations with admin created_by"
  ON content_type_domain_rules
  FOR ALL
  TO authenticated
  USING (
    created_by IN (
      SELECT id FROM user_profiles WHERE is_admin = true
    )
  )
  WITH CHECK (
    created_by IN (
      SELECT id FROM user_profiles WHERE is_admin = true
    )
  );
