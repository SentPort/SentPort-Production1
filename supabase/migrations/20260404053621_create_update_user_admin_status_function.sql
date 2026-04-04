/*
  # Create Update User Admin Status Function

  1. New Functions
    - `update_user_admin_status(target_email TEXT, new_admin_status BOOLEAN)`
      - Securely updates a user's admin status with proper authorization checks
      - Validates email verification status before granting admin privileges
      - Auto-verifies accounts when granting admin status
      - Can only be called by existing admins

  2. Security
    - Function runs with SECURITY DEFINER to bypass RLS
    - Validates caller is an admin before proceeding
    - Checks target user's email is verified in auth.users
    - Prevents granting admin to unverified accounts
    - Returns detailed error messages for debugging

  3. Business Logic
    - When adding admin (new_admin_status = TRUE):
      - Sets is_admin = TRUE
      - Sets is_verified = TRUE (auto-verification)
    - When removing admin (new_admin_status = FALSE):
      - Sets is_admin = FALSE
      - Leaves is_verified unchanged
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS update_user_admin_status(TEXT, BOOLEAN);

-- Create the secure admin status update function
CREATE OR REPLACE FUNCTION update_user_admin_status(
  target_email TEXT,
  new_admin_status BOOLEAN
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calling_user_id uuid;
  calling_user_is_admin boolean;
  target_user_id uuid;
  target_user_profile RECORD;
  auth_user RECORD;
  result jsonb;
BEGIN
  -- Get the calling user's ID
  calling_user_id := auth.uid();

  -- Check if calling user exists and is authenticated
  IF calling_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'unauthorized',
      'message', 'You must be authenticated to perform this action'
    );
  END IF;

  -- Check if calling user is an admin
  SELECT is_admin INTO calling_user_is_admin
  FROM user_profiles
  WHERE id = calling_user_id;

  IF NOT calling_user_is_admin THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'forbidden',
      'message', 'You do not have permission to manage admin status'
    );
  END IF;

  -- Find the target user profile by email
  SELECT * INTO target_user_profile
  FROM user_profiles
  WHERE email = target_email;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_found',
      'message', 'No user found with this email address'
    );
  END IF;

  target_user_id := target_user_profile.id;

  -- Check if user's email is verified in auth.users
  SELECT * INTO auth_user
  FROM auth.users
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'auth_record_missing',
      'message', 'Authentication record not found for this user'
    );
  END IF;

  -- Check email verification status
  -- In Supabase, email_confirmed_at is set when email is verified
  -- If it's NULL, the email is not verified
  IF new_admin_status = TRUE AND auth_user.email_confirmed_at IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'email_not_verified',
      'message', 'Cannot grant admin privileges to accounts with unverified email addresses'
    );
  END IF;

  -- Check current status to provide helpful messages
  IF new_admin_status = TRUE AND target_user_profile.is_admin = TRUE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_admin',
      'message', 'This user is already an admin'
    );
  END IF;

  IF new_admin_status = FALSE AND target_user_profile.is_admin = FALSE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_admin',
      'message', 'This user is not currently an admin'
    );
  END IF;

  -- Update the user's admin status
  IF new_admin_status = TRUE THEN
    -- When granting admin, also set is_verified to true
    UPDATE user_profiles
    SET
      is_admin = TRUE,
      is_verified = TRUE,
      updated_at = now()
    WHERE id = target_user_id;

    -- Check if user was auto-verified
    IF target_user_profile.is_verified = FALSE THEN
      result := jsonb_build_object(
        'success', true,
        'message', 'Admin privileges granted and account verified successfully',
        'user', jsonb_build_object(
          'email', target_email,
          'is_admin', true,
          'is_verified', true,
          'auto_verified', true
        )
      );
    ELSE
      result := jsonb_build_object(
        'success', true,
        'message', 'Admin privileges granted successfully',
        'user', jsonb_build_object(
          'email', target_email,
          'is_admin', true,
          'is_verified', true,
          'auto_verified', false
        )
      );
    END IF;
  ELSE
    -- When removing admin, just update is_admin
    UPDATE user_profiles
    SET
      is_admin = FALSE,
      updated_at = now()
    WHERE id = target_user_id;

    result := jsonb_build_object(
      'success', true,
      'message', 'Admin privileges removed successfully',
      'user', jsonb_build_object(
        'email', target_email,
        'is_admin', false,
        'is_verified', target_user_profile.is_verified
      )
    );
  END IF;

  RETURN result;
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION update_user_admin_status(TEXT, BOOLEAN) IS
'Securely updates a user''s admin status. Only callable by existing admins. Validates email verification and auto-verifies accounts when granting admin privileges.';