/*
  # Fix User Name Change Trigger

  Changes the trigger from BEFORE UPDATE to AFTER UPDATE to avoid the
  "tuple to be updated was already modified" error when updating first_name
  or last_name fields.
*/

-- Drop the old BEFORE trigger
DROP TRIGGER IF EXISTS sync_manual_name_change ON user_profiles;

-- Recreate the trigger function to work with AFTER UPDATE
CREATE OR REPLACE FUNCTION handle_user_name_change_after()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If first_name or last_name was changed, recalculate full_name
  IF NEW.first_name IS DISTINCT FROM OLD.first_name OR
     NEW.last_name IS DISTINCT FROM OLD.last_name THEN
    -- Sync the full_name
    PERFORM sync_user_full_name(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

-- Create the new AFTER UPDATE trigger
CREATE TRIGGER sync_manual_name_change_after
  AFTER UPDATE OF first_name, last_name ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_name_change_after();
