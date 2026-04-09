/*
  # Retroactive Badge Check for All Existing Heddit Users

  ## Purpose
  Since the badge check trigger was never wired up previously, existing users
  who had karma/kindness/quality scores qualifying for badges never received them.
  This migration runs check_and_award_badges() for every existing heddit account
  to ensure all earned badges and their notifications are properly awarded.

  ## What This Does
  - Loops through every heddit_accounts record
  - Calls check_and_award_badges(id) for each one
  - The function uses ON CONFLICT DO NOTHING so no duplicate badges are created
  - Users who already have correct badges (like Travis) are unaffected
  - Users who were missing badges they qualified for will receive them now

  ## Important Notes
  1. Dakota's account was already fixed directly before this migration
  2. This migration is safe to run multiple times (idempotent via ON CONFLICT)
  3. Badge notifications will be created for any newly awarded badges
*/

DO $$
DECLARE
  account_record RECORD;
BEGIN
  FOR account_record IN SELECT id FROM heddit_accounts LOOP
    PERFORM check_and_award_badges(account_record.id);
  END LOOP;
END $$;
