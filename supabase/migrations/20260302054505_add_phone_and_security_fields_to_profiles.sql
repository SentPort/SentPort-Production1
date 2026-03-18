/*
  # Add Phone Number and Security Fields to User Profiles

  1. Schema Changes
    - Add `phone_number` (text, nullable, optional field for future SMS features)
    - Add `phone_verified` (boolean, default false, tracks phone verification status)
    - Add `last_password_change` (timestamptz, nullable, tracks when password was last changed)

  2. Important Notes
    - Phone number is completely optional and for future use
    - Phone verification starts as false
    - last_password_change will be null for existing users until they change their password
    - All fields are added safely with IF NOT EXISTS checks to prevent errors
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN phone_number text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'phone_verified'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN phone_verified boolean DEFAULT false NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'last_password_change'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN last_password_change timestamptz;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_profiles_phone_number ON user_profiles(phone_number);
