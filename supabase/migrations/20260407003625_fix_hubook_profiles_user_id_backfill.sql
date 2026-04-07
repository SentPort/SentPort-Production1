/*
  # Fix HuBook Profiles user_id Column

  1. Changes
    - Backfill user_id for all existing profiles (set to id which references auth.users)
    - Add foreign key constraint on user_id to reference auth.users
    - Make user_id NOT NULL
    - Add trigger to auto-populate user_id on insert

  2. Security
    - Maintains existing RLS policies
    - Ensures data integrity with foreign key
*/

-- Step 1: Backfill user_id for existing profiles
-- hubook_profiles.id references user_profiles.id which references auth.users.id
-- So user_id should be the same as id
UPDATE hubook_profiles
SET user_id = id
WHERE user_id IS NULL;

-- Step 2: Add foreign key constraint to auth.users
ALTER TABLE hubook_profiles
  DROP CONSTRAINT IF EXISTS hubook_profiles_user_id_fkey;

ALTER TABLE hubook_profiles
  ADD CONSTRAINT hubook_profiles_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- Step 3: Make user_id NOT NULL (now that all existing records are populated)
ALTER TABLE hubook_profiles
  ALTER COLUMN user_id SET NOT NULL;

-- Step 4: Create trigger to auto-populate user_id on insert
CREATE OR REPLACE FUNCTION set_hubook_profile_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_hubook_profile_user_id ON hubook_profiles;

CREATE TRIGGER ensure_hubook_profile_user_id
  BEFORE INSERT ON hubook_profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_hubook_profile_user_id();
