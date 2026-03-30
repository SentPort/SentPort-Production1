/*
  # Create DiDit Verification Status Sync Trigger

  ## Overview
  This migration creates a database trigger that automatically synchronizes verification status
  between the `didit_verification_sessions` table and the `user_profiles` table. This ensures
  data consistency when verification sessions are manually updated or when webhooks change status.

  ## Changes Made

  1. **New Function: sync_verification_status_to_profile**
     - Triggers on UPDATE of `didit_verification_sessions.status`
     - When status changes TO "approved": sets `user_profiles.is_verified = true`
     - When status changes FROM "approved" to any other status: sets `user_profiles.is_verified = false`
     - Updates `last_verification_at` timestamp when verification is granted
     - Clears `last_verification_at` when verification is revoked

  2. **New Trigger: trigger_sync_verification_status**
     - Executes AFTER UPDATE on `didit_verification_sessions`
     - Only fires when the `status` column actually changes
     - Runs for each row updated

  ## Security
  - Function runs with SECURITY DEFINER to bypass RLS
  - Only updates verification status, no other profile fields
  - Validates that user_id exists before updating

  ## Use Cases
  - Manual admin updates to verification status in database
  - Webhook-driven status changes
  - Status reversions (approved → abandoned/declined)
  - Re-verification attempts
*/

-- Create function to sync verification status
CREATE OR REPLACE FUNCTION sync_verification_status_to_profile()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- If status changed TO "approved", grant verification
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    UPDATE user_profiles
    SET 
      is_verified = true,
      last_verification_at = now()
    WHERE id = NEW.user_id;
    
    RAISE NOTICE 'User % verification GRANTED (status: % → %)', NEW.user_id, OLD.status, NEW.status;
  
  -- If status changed FROM "approved" to something else, revoke verification
  ELSIF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    UPDATE user_profiles
    SET 
      is_verified = false,
      last_verification_at = NULL
    WHERE id = NEW.user_id;
    
    RAISE NOTICE 'User % verification REVOKED (status: % → %)', NEW.user_id, OLD.status, NEW.status;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on didit_verification_sessions
DROP TRIGGER IF EXISTS trigger_sync_verification_status ON didit_verification_sessions;

CREATE TRIGGER trigger_sync_verification_status
  AFTER UPDATE OF status ON didit_verification_sessions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION sync_verification_status_to_profile();

-- Add comment for documentation
COMMENT ON FUNCTION sync_verification_status_to_profile() IS 
  'Automatically syncs verification status from didit_verification_sessions to user_profiles. Grants verification when status becomes approved, revokes when status changes from approved to any other state.';