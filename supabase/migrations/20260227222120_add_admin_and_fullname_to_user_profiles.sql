/*
  # Add Admin and Full Name to User Profiles

  1. Schema Changes
    - Add `is_admin` column to `user_profiles` (boolean, default false)
    - Add `full_name` column to `user_profiles` (text, nullable)
  
  2. Automatic Profile Creation
    - Create trigger function to auto-create user_profiles when auth.users are created
    - Backfill user_profiles for existing auth.users without profiles
  
  3. Important Notes
    - All existing users will have is_admin = false by default
    - full_name starts as null and can be updated by users
    - New signups will automatically get a user_profile entry
*/

-- Add missing columns to user_profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_admin boolean DEFAULT false NOT NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN full_name text;
  END IF;
END $$;

-- Create function to auto-create user_profiles on signup
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, is_verified, is_admin)
  VALUES (NEW.id, NEW.email, false, false)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create profiles for new users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION create_user_profile();
  END IF;
END $$;

-- Backfill user_profiles for existing auth.users without profiles
INSERT INTO public.user_profiles (id, email, is_verified, is_admin)
SELECT 
  au.id, 
  au.email, 
  false, 
  false
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL
ON CONFLICT (id) DO NOTHING;
