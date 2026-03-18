/*
  # Create Individual Subdomain Deletion System

  1. New Functions
    - `delete_individual_subdomain(p_subdomain_id uuid, p_user_id uuid)`
      - Allows users to permanently delete a specific subdomain they own
      - Verifies ownership before deletion
      - Immediate permanent deletion with no grace period
      - Cascades to all related data (pages, analytics, assets)
      - Returns deleted subdomain information

  2. Security
    - Function enforces ownership verification
    - Only the subdomain owner can delete their subdomain
    - Admin users cannot delete other users' subdomains through this function

  3. Purpose
    - Enable users to delete individual subdomains while keeping their account
    - Free up subdomain names immediately for other users
    - Provide clean separation between account deletion (30-day grace) and subdomain deletion (immediate)
*/

-- Create function to delete an individual subdomain
CREATE OR REPLACE FUNCTION delete_individual_subdomain(
  p_subdomain_id uuid,
  p_user_id uuid
)
RETURNS TABLE(
  deleted_subdomain_name text,
  deleted_at timestamptz,
  success boolean,
  message text
) AS $$
DECLARE
  v_subdomain_name text;
  v_owner_id uuid;
BEGIN
  -- Check if subdomain exists and get owner info
  SELECT subdomain, owner_id
  INTO v_subdomain_name, v_owner_id
  FROM subdomains
  WHERE id = p_subdomain_id;

  -- If subdomain doesn't exist
  IF v_subdomain_name IS NULL THEN
    RETURN QUERY SELECT 
      NULL::text,
      now(),
      false,
      'Subdomain not found'::text;
    RETURN;
  END IF;

  -- Verify ownership
  IF v_owner_id != p_user_id THEN
    RETURN QUERY SELECT 
      NULL::text,
      now(),
      false,
      'You do not have permission to delete this subdomain'::text;
    RETURN;
  END IF;

  -- Delete the subdomain (CASCADE handles all related data)
  DELETE FROM subdomains
  WHERE id = p_subdomain_id;

  -- Return success
  RETURN QUERY SELECT 
    v_subdomain_name,
    now(),
    true,
    'Subdomain successfully deleted'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_individual_subdomain(uuid, uuid) TO authenticated;
