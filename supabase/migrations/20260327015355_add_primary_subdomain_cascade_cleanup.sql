/*
  # Add Automatic Primary Subdomain Preference Cleanup

  ## Overview
  This migration ensures that when a subdomain is deleted, if it was set as a user's
  primary subdomain, the preference is automatically cleaned up or updated to point
  to another available subdomain.

  ## Changes

  ### 1. Add Foreign Key Constraint with CASCADE
  - Add foreign key constraint to `user_subdomain_preferences.primary_subdomain_id`
  - Set to CASCADE DELETE to automatically remove preference when subdomain is deleted
  - This prevents orphaned references to deleted subdomains

  ### 2. Trigger Function: auto_update_primary_on_subdomain_delete
  - Automatically updates primary preference when primary subdomain is deleted
  - If user has other subdomains, sets the oldest remaining one as primary
  - If no subdomains remain, deletes the preference record entirely

  ### 3. Trigger: trigger_update_primary_on_subdomain_delete
  - Fires BEFORE DELETE on subdomains table
  - Ensures seamless user experience when deleting primary subdomain

  ## Benefits
  - No orphaned preference records
  - Automatic fallback to next available subdomain
  - Clean database with no manual intervention needed
  - Prevents errors from referencing deleted subdomains
*/

-- First, ensure the table exists (it should from a previous migration)
CREATE TABLE IF NOT EXISTS user_subdomain_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  primary_subdomain_id uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- Enable RLS if not already enabled
ALTER TABLE user_subdomain_preferences ENABLE ROW LEVEL SECURITY;

-- Add policies if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_subdomain_preferences' 
    AND policyname = 'Users can read own preferences'
  ) THEN
    CREATE POLICY "Users can read own preferences"
      ON user_subdomain_preferences
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_subdomain_preferences' 
    AND policyname = 'Users can insert own preferences'
  ) THEN
    CREATE POLICY "Users can insert own preferences"
      ON user_subdomain_preferences
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_subdomain_preferences' 
    AND policyname = 'Users can update own preferences'
  ) THEN
    CREATE POLICY "Users can update own preferences"
      ON user_subdomain_preferences
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_subdomain_preferences' 
    AND policyname = 'Users can delete own preferences'
  ) THEN
    CREATE POLICY "Users can delete own preferences"
      ON user_subdomain_preferences
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Add foreign key constraint with CASCADE DELETE
-- First drop if exists to avoid conflicts
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_subdomain_preferences_primary_subdomain_id_fkey'
  ) THEN
    ALTER TABLE user_subdomain_preferences 
    DROP CONSTRAINT user_subdomain_preferences_primary_subdomain_id_fkey;
  END IF;
END $$;

-- Add the foreign key constraint
ALTER TABLE user_subdomain_preferences
  ADD CONSTRAINT user_subdomain_preferences_primary_subdomain_id_fkey
  FOREIGN KEY (primary_subdomain_id)
  REFERENCES subdomains(id)
  ON DELETE CASCADE;

-- Create trigger function to handle primary subdomain deletion
CREATE OR REPLACE FUNCTION auto_update_primary_on_subdomain_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_next_subdomain_id uuid;
BEGIN
  -- Get the owner of the subdomain being deleted
  v_user_id := OLD.owner_id;

  -- Check if this subdomain is set as primary for the user
  IF EXISTS (
    SELECT 1 FROM user_subdomain_preferences
    WHERE user_id = v_user_id
    AND primary_subdomain_id = OLD.id
  ) THEN
    -- Find the next available subdomain for this user (oldest first)
    SELECT id INTO v_next_subdomain_id
    FROM subdomains
    WHERE owner_id = v_user_id
    AND id != OLD.id
    AND status IN ('active', 'inactive')
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_next_subdomain_id IS NOT NULL THEN
      -- Update to next available subdomain
      UPDATE user_subdomain_preferences
      SET primary_subdomain_id = v_next_subdomain_id,
          updated_at = now()
      WHERE user_id = v_user_id;
    ELSE
      -- No other subdomains, delete the preference (CASCADE will handle this anyway)
      DELETE FROM user_subdomain_preferences
      WHERE user_id = v_user_id;
    END IF;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_primary_on_subdomain_delete ON subdomains;

-- Create trigger
CREATE TRIGGER trigger_update_primary_on_subdomain_delete
  BEFORE DELETE ON subdomains
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_primary_on_subdomain_delete();
