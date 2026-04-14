/*
  # Fix Test Account Password Hash Cost Factor

  ## Problem
  All 100 seeded test accounts have bcrypt passwords hashed with cost factor 6 ($2a$06$).
  Supabase Auth enforces a minimum cost factor of 10, causing HTTP 500 "Database error
  querying schema" errors when any test account attempts to sign in.

  ## Changes
  - Updates `encrypted_password` in `auth.users` for all seed test accounts
  - Re-hashes using bcrypt cost factor 10 via pgcrypto's `crypt()` function
  - All test accounts will use the password: TestPassword123!
  - Only targets accounts with `account_type = 'seed_test'` in app metadata
  - Real user accounts are untouched

  ## Security
  - No RLS changes needed (auth.users is not a public table)
  - Only seed/demo accounts are affected
*/

UPDATE auth.users
SET 
  encrypted_password = crypt('TestPassword123!', gen_salt('bf', 10)),
  updated_at = now()
WHERE raw_app_meta_data->>'account_type' = 'seed_test';
