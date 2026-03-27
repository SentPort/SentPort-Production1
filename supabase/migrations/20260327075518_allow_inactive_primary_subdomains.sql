/*
  # Allow Inactive Subdomains as Primary

  1. Changes
    - Remove the "active only" restriction from set_primary_subdomain function
    - Update auto_set_first_primary_subdomain to set any subdomain (inactive or active) as primary
    - Update backfill to include inactive subdomains
    - Update deletion handler to include inactive subdomains

  2. Rationale
    - Users should be able to set draft subdomains as their primary
    - Primary subdomain will show status indicator (Draft Status or Published & Live)
    - This allows users to work on their primary site before publishing
*/

-- Update set_primary_subdomain to allow inactive subdomains
CREATE OR REPLACE FUNCTION set_primary_subdomain(
  p_subdomain_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subdomain_owner uuid;
  v_subdomain_status text;
  v_subdomain_name text;
BEGIN
  -- Get subdomain details
  SELECT owner_id, status, subdomain
  INTO v_subdomain_owner, v_subdomain_status, v_subdomain_name
  FROM subdomains
  WHERE id = p_subdomain_id;

  -- Check if subdomain exists
  IF v_subdomain_owner IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Subdomain not found'
    );
  END IF;

  -- Check if user owns the subdomain
  IF v_subdomain_owner != p_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'You do not own this subdomain'
    );
  END IF;

  -- REMOVED: Status check - now allow both active and inactive subdomains

  -- Update user profile with new primary subdomain
  UPDATE user_profiles
  SET primary_subdomain_id = p_subdomain_id,
      updated_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Primary subdomain updated successfully',
    'subdomain', v_subdomain_name,
    'status', v_subdomain_status
  );
END;
$$;

-- Update auto_set_first_primary_subdomain to include inactive subdomains
CREATE OR REPLACE FUNCTION auto_set_first_primary_subdomain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subdomain_count integer;
  v_has_primary boolean;
BEGIN
  -- Count user's subdomains (both active and inactive)
  SELECT COUNT(*)
  INTO v_subdomain_count
  FROM subdomains
  WHERE owner_id = NEW.owner_id;

  -- Check if user already has a primary subdomain set
  SELECT primary_subdomain_id IS NOT NULL
  INTO v_has_primary
  FROM user_profiles
  WHERE id = NEW.owner_id;

  -- If this is their first subdomain and they don't have a primary, set it
  IF v_subdomain_count = 1 AND NOT v_has_primary THEN
    UPDATE user_profiles
    SET primary_subdomain_id = NEW.id,
        updated_at = now()
    WHERE id = NEW.owner_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Update primary subdomain deletion handler to include inactive subdomains
CREATE OR REPLACE FUNCTION handle_primary_subdomain_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_subdomain_id uuid;
BEGIN
  -- Check if any user has this subdomain as their primary
  UPDATE user_profiles
  SET primary_subdomain_id = NULL,
      updated_at = now()
  WHERE primary_subdomain_id = OLD.id;

  -- Try to set another subdomain (active or inactive) as primary for affected users
  FOR v_next_subdomain_id IN
    SELECT s.id
    FROM user_profiles up
    LEFT JOIN subdomains s ON s.owner_id = up.id
    WHERE up.primary_subdomain_id IS NULL
    AND up.id = OLD.owner_id
    ORDER BY s.created_at ASC
    LIMIT 1
  LOOP
    UPDATE user_profiles
    SET primary_subdomain_id = v_next_subdomain_id,
        updated_at = now()
    WHERE id = OLD.owner_id;
  END LOOP;

  RETURN OLD;
END;
$$;

-- Backfill existing users: set their first subdomain (active or inactive) as primary if they don't have one
DO $$
DECLARE
  v_user_record RECORD;
  v_first_subdomain_id uuid;
BEGIN
  FOR v_user_record IN
    SELECT id FROM user_profiles WHERE primary_subdomain_id IS NULL
  LOOP
    -- Get user's first subdomain (regardless of status)
    SELECT id INTO v_first_subdomain_id
    FROM subdomains
    WHERE owner_id = v_user_record.id
    ORDER BY created_at ASC
    LIMIT 1;

    -- Set it as primary if found
    IF v_first_subdomain_id IS NOT NULL THEN
      UPDATE user_profiles
      SET primary_subdomain_id = v_first_subdomain_id,
          updated_at = now()
      WHERE id = v_user_record.id;
    END IF;
  END LOOP;
END $$;
