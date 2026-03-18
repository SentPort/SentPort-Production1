/*
  # Add Admin UPDATE and DELETE policies for custom tags

  1. Security Changes
    - Add UPDATE policy for admins on `heddit_custom_tags`
    - Add DELETE policy for admins on `heddit_custom_tags`
    - Allows admins to flag, unflag, ban, unban, and delete custom tags
    - Policies check `user_profiles.is_admin = true` for the authenticated user

  2. Notes
    - Existing SELECT and INSERT policies remain unchanged
    - These policies are required for the Tag Management admin panel to function
    - Without UPDATE policy, unflag and ban operations fail with 400 errors
*/

-- Add UPDATE policy for admins to manage custom tags (flag, unflag, ban, etc.)
CREATE POLICY "Admins can update custom tags"
  ON heddit_custom_tags
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Add DELETE policy for admins to delete custom tags if needed
CREATE POLICY "Admins can delete custom tags"
  ON heddit_custom_tags
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );
