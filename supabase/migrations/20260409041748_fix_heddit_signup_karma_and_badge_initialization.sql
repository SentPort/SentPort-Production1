/*
  # Fix Heddit Signup: Award 50 Karma and Initialize Badges on Account Creation

  ## Problem
  When a new Heddit account is created, the following was NOT happening:
  - karma column defaults to 0 instead of 50 (the welcome bonus)
  - check_and_award_badges() was never called on INSERT, so no badges were awarded
  - The Newcomer badge (quality threshold 0) and First Steps badge (karma threshold 50)
    were never granted to new users
  - No badge earned notifications were created for new users

  ## Changes

  ### 1. New Function: initialize_heddit_account()
  - Triggered AFTER INSERT on heddit_accounts
  - Sets karma = 50 (welcome bonus)
  - Recomputes quality_score = 50 * 1 = 50 via direct UPDATE
  - Calls check_and_award_badges() to award Newcomer and First Steps badges
    and create their notifications

  ### 2. New Trigger: trigger_initialize_heddit_account
  - AFTER INSERT on heddit_accounts
  - Calls initialize_heddit_account()

  ## Security
  - Function runs as SECURITY DEFINER to bypass RLS during initialization

  ## Important Notes
  1. This only fires for NEW accounts created after this migration
  2. Existing affected accounts (like Dakota) will be fixed in a separate migration
  3. The karma column default remains 0; the trigger sets it to 50 after insert
     so that the quality_score trigger (BEFORE UPDATE) also fires correctly
*/

CREATE OR REPLACE FUNCTION public.initialize_heddit_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE heddit_accounts
  SET karma = 50
  WHERE id = NEW.id;

  PERFORM check_and_award_badges(NEW.id);

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_initialize_heddit_account ON heddit_accounts;

CREATE TRIGGER trigger_initialize_heddit_account
  AFTER INSERT ON heddit_accounts
  FOR EACH ROW
  EXECUTE FUNCTION initialize_heddit_account();
