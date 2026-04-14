/*
  # Fix seed test account auth.users column values

  ## Summary
  Updates three columns in auth.users for all 100 seed test accounts
  so they match the pattern of real user accounts.

  ## Changes

  ### Modified Table: auth.users (targeted rows only)
  - `email_change_token_new`: Set from NULL to empty string ''
  - `email_change`: Set from NULL to empty string ''
  - `is_super_admin`: Set from FALSE to NULL

  ## Target
  Only affects rows where raw_app_meta_data->>'account_type' = 'seed_test'
  (the 100 seeded demo accounts). Real user accounts are not touched.

  ## Notes
  1. updated_at is intentionally NOT changed to preserve the original seed timestamps
  2. The seed_test account_type flag is the same filter used in migration
     20260414061236_fix_test_account_password_hash_cost_factor.sql
*/

UPDATE auth.users
SET
  email_change_token_new = '',
  email_change = '',
  is_super_admin = NULL
WHERE raw_app_meta_data->>'account_type' = 'seed_test';
