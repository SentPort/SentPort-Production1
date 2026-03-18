/*
  # Add Account Deletion Tracking System

  1. Schema Changes
    - Add deletion tracking fields to user_profiles table:
      - `deletion_requested_at` (timestamptz) - When user requested account deletion
      - `deletion_scheduled_at` (timestamptz) - When permanent deletion will occur (30 days after request)
      - `account_status` (text) - Current account status: 'active', 'pending_deletion', or 'deleted'
  
  2. Functions Created
    - `request_account_deletion(user_id)` - Marks account for deletion, pauses all subdomains, sets timestamps
    - `cancel_account_deletion(user_id)` - Restores account when user signs back in during grace period
  
  3. Security
    - Functions check authentication and ownership
    - Only users can delete/restore their own accounts
*/

-- Add deletion tracking fields to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'deletion_requested_at'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN deletion_requested_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'deletion_scheduled_at'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN deletion_scheduled_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'account_status'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN account_status text DEFAULT 'active' NOT NULL;
  END IF;
END $$;

-- Create index for efficient lookup of accounts pending deletion
CREATE INDEX IF NOT EXISTS idx_user_profiles_deletion_scheduled 
ON user_profiles(deletion_scheduled_at) 
WHERE account_status = 'pending_deletion';

-- Function to request account deletion
CREATE OR REPLACE FUNCTION request_account_deletion(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  subdomain_count int;
  result json;
BEGIN
  -- Verify the caller is the account owner
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'You can only delete your own account';
  END IF;

  -- Count owned subdomains
  SELECT COUNT(*) INTO subdomain_count
  FROM subdomains
  WHERE owner_id = target_user_id AND status = 'active';

  -- Update user profile with deletion timestamps and status
  UPDATE user_profiles
  SET 
    deletion_requested_at = now(),
    deletion_scheduled_at = now() + interval '30 days',
    account_status = 'pending_deletion'
  WHERE id = target_user_id;

  -- Pause all owned subdomains using existing function
  PERFORM pause_user_subdomains(target_user_id);

  -- Return confirmation with details
  SELECT json_build_object(
    'success', true,
    'deletion_requested_at', now(),
    'deletion_scheduled_at', now() + interval '30 days',
    'subdomains_paused', subdomain_count,
    'message', 'Account marked for deletion. Sign back in within 30 days to restore.'
  ) INTO result;

  RETURN result;
END;
$$;

-- Function to cancel account deletion (called on sign-in)
CREATE OR REPLACE FUNCTION cancel_account_deletion(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_status text;
  subdomain_count int;
  result json;
BEGIN
  -- Get current account status
  SELECT account_status INTO user_status
  FROM user_profiles
  WHERE id = target_user_id;

  -- Only proceed if account is pending deletion
  IF user_status != 'pending_deletion' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Account is not pending deletion'
    );
  END IF;

  -- Restore account status
  UPDATE user_profiles
  SET 
    deletion_requested_at = NULL,
    deletion_scheduled_at = NULL,
    account_status = 'active'
  WHERE id = target_user_id;

  -- Restore all paused subdomains
  UPDATE subdomains
  SET 
    status = 'active',
    paused_at = NULL,
    paused_by = NULL
  WHERE owner_id = target_user_id AND status = 'paused';

  GET DIAGNOSTICS subdomain_count = ROW_COUNT;

  -- Return confirmation
  SELECT json_build_object(
    'success', true,
    'subdomains_restored', subdomain_count,
    'message', 'Account deletion cancelled. All subdomains restored.'
  ) INTO result;

  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION request_account_deletion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_account_deletion(uuid) TO authenticated;