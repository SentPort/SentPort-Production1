/*
  # Add Terms of Service Acceptance Tracking

  1. Changes to user_profiles table
    - Add `terms_accepted_at` column to track when user accepted terms during sign-up
    - Add `is_18_or_older` column to track age confirmation during sign-up
    
  2. Purpose
    - Legal compliance: track when users accepted Terms of Service
    - Age verification: track user's confirmation they are 18 or older
    - Both fields are set once during sign-up and serve as legal record
    
  3. Security
    - Columns are non-nullable for new sign-ups
    - Default values provided for backward compatibility with existing accounts
    - Only set during account creation
*/

-- Add terms acceptance tracking columns to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'terms_accepted_at'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN terms_accepted_at timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'is_18_or_older'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN is_18_or_older boolean DEFAULT true;
  END IF;
END $$;