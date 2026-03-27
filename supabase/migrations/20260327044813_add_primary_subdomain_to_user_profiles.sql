/*
  # Add Primary Subdomain to User Profiles

  1. Changes
    - Add `primary_subdomain_id` column to `user_profiles` table
    - Create function to set primary subdomain with validation
    - Create function to auto-set first subdomain as primary
    - Create trigger to auto-set primary on first subdomain creation
    - Update subdomain deletion to handle primary subdomain cascade

  2. Security
    - Users can only set their own subdomains as primary
    - Only active subdomains can be set as primary
    - Automatic cleanup when primary subdomain is deleted
*/

-- Add primary_subdomain_id column to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'primary_subdomain_id'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN primary_subdomain_id uuid REFERENCES subdomains(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_user_profiles_primary_subdomain 
    ON user_profiles(primary_subdomain_id);
  END IF;
END $$;

-- Function to set primary subdomain
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

  -- Check if subdomain is active
  IF v_subdomain_status != 'active' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Only active subdomains can be set as primary'
    );
  END IF;

  -- Update user profile with new primary subdomain
  UPDATE user_profiles
  SET primary_subdomain_id = p_subdomain_id,
      updated_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Primary subdomain updated successfully',
    'subdomain', v_subdomain_name
  );
END;
$$;

-- Function to auto-set primary subdomain when user creates their first
CREATE OR REPLACE FUNCTION auto_set_first_primary_subdomain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subdomain_count integer;
  v_has_primary boolean;
BEGIN
  -- Count user's active subdomains
  SELECT COUNT(*)
  INTO v_subdomain_count
  FROM subdomains
  WHERE owner_id = NEW.owner_id
  AND status = 'active';

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

-- Create trigger for auto-setting first subdomain as primary
DROP TRIGGER IF EXISTS trigger_auto_set_first_primary_subdomain ON subdomains;
CREATE TRIGGER trigger_auto_set_first_primary_subdomain
  AFTER INSERT ON subdomains
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_first_primary_subdomain();

-- Function to handle primary subdomain deletion
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

  -- Try to set another active subdomain as primary for affected users
  FOR v_next_subdomain_id IN
    SELECT s.id
    FROM user_profiles up
    LEFT JOIN subdomains s ON s.owner_id = up.id AND s.status = 'active'
    WHERE up.primary_subdomain_id IS NULL
    AND up.id = OLD.owner_id
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

-- Create trigger for handling primary subdomain deletion
DROP TRIGGER IF EXISTS trigger_handle_primary_subdomain_deletion ON subdomains;
CREATE TRIGGER trigger_handle_primary_subdomain_deletion
  BEFORE DELETE ON subdomains
  FOR EACH ROW
  EXECUTE FUNCTION handle_primary_subdomain_deletion();

-- Backfill existing users: set their first active subdomain as primary if they don't have one
DO $$
DECLARE
  v_user_record RECORD;
  v_first_subdomain_id uuid;
BEGIN
  FOR v_user_record IN
    SELECT id FROM user_profiles WHERE primary_subdomain_id IS NULL
  LOOP
    -- Get user's first active subdomain
    SELECT id INTO v_first_subdomain_id
    FROM subdomains
    WHERE owner_id = v_user_record.id
    AND status = 'active'
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
