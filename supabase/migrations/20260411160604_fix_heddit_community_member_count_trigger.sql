/*
  # Fix Heddit Community Member Count Trigger

  ## Problem
  When users join or leave Heddit communities, the `member_count` column on
  `heddit_subreddits` was never updated in the database. Only React local state
  was patched optimistically, so page refreshes or other users viewing the
  community would always see the stale original count.

  ## Changes

  ### New Function: update_heddit_member_count()
  - Trigger function that fires after INSERT or DELETE on `heddit_subreddit_members`
  - On INSERT: increments `member_count` on the matching subreddit row
  - On DELETE: decrements `member_count`, floored at 0 to prevent negatives

  ### New Trigger: trigger_update_heddit_member_count
  - Fires AFTER INSERT OR DELETE on `heddit_subreddit_members`
  - One row at a time (FOR EACH ROW)

  ### Backfill
  - Recalculates correct `member_count` for every existing community based on
    the actual rows in `heddit_subreddit_members`
*/

CREATE OR REPLACE FUNCTION update_heddit_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE heddit_subreddits
    SET member_count = member_count + 1
    WHERE id = NEW.subreddit_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE heddit_subreddits
    SET member_count = GREATEST(0, member_count - 1)
    WHERE id = OLD.subreddit_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_heddit_member_count ON heddit_subreddit_members;

CREATE TRIGGER trigger_update_heddit_member_count
  AFTER INSERT OR DELETE ON heddit_subreddit_members
  FOR EACH ROW
  EXECUTE FUNCTION update_heddit_member_count();

UPDATE heddit_subreddits s
SET member_count = (
  SELECT COUNT(*)
  FROM heddit_subreddit_members m
  WHERE m.subreddit_id = s.id
);
