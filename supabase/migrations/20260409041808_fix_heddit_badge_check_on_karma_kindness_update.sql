/*
  # Fix Heddit Badge Awards: Run Badge Check After Karma/Kindness/Quality Changes

  ## Problem
  The check_and_award_badges() function exists and is correctly written, but was
  never called automatically when a user's karma, kindness, or quality_score changed.
  This means users who earned karma through posting, commenting, creating communities,
  or receiving mentions would never receive badge progression notifications.

  ## Changes

  ### 1. New Function: trigger_badge_check_on_karma_update()
  - Fires AFTER UPDATE on heddit_accounts
  - Only runs when karma, kindness, or quality_score actually changed (using WHEN clause)
  - Calls check_and_award_badges(NEW.id) to award any newly unlocked badges

  ### 2. New Trigger: trigger_heddit_badge_progression
  - AFTER UPDATE OF karma, kindness, quality_score on heddit_accounts
  - Only fires when one of those three values actually changes value

  ## Security
  - Function runs as SECURITY DEFINER to bypass RLS

  ## Important Notes
  1. This ensures badges are awarded in real time as users earn karma through activity
  2. The check_and_award_badges function uses ON CONFLICT DO NOTHING so duplicate
     badge awards are safely ignored
*/

CREATE OR REPLACE FUNCTION public.trigger_badge_check_on_karma_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM check_and_award_badges(NEW.id);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_heddit_badge_progression ON heddit_accounts;

CREATE TRIGGER trigger_heddit_badge_progression
  AFTER UPDATE OF karma, kindness, quality_score ON heddit_accounts
  FOR EACH ROW
  WHEN (
    OLD.karma IS DISTINCT FROM NEW.karma OR
    OLD.kindness IS DISTINCT FROM NEW.kindness OR
    OLD.quality_score IS DISTINCT FROM NEW.quality_score
  )
  EXECUTE FUNCTION trigger_badge_check_on_karma_update();
