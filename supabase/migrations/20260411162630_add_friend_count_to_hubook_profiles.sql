/*
  # Add friend_count to hubook_profiles

  ## Summary
  Adds a denormalized friend_count column to hubook_profiles so that the
  public profile page can display an accurate friend count without a
  full COUNT query on every page load.

  ## Changes

  ### Modified Tables
  - `hubook_profiles`
    - New column `friend_count` (integer, default 0) — tracks number of accepted friendships

  ### New Functions
  - `update_hubook_friend_count()` — trigger function that increments/decrements
    friend_count on both involved profiles when a friendship is accepted or deleted

  ### New Triggers
  - `trigger_update_hubook_friend_count` — fires AFTER INSERT, UPDATE, or DELETE
    on the `friendships` table to keep friend_count in sync

  ### Backfill
  - All existing hubook_profiles rows are updated with the correct count derived
    from the current accepted rows in the `friendships` table

  ## Notes
  1. The trigger handles three cases:
     - INSERT with status = 'accepted': increment both profiles
     - UPDATE where status changes to 'accepted': increment both profiles
     - UPDATE where status changes away from 'accepted': decrement both profiles
     - DELETE where status was 'accepted': decrement both profiles
  2. The backfill uses a subquery so it runs in one pass and is safe to run
     on an already-populated table
  3. friend_count is set NOT NULL with a default of 0 to prevent nulls
*/

-- 1. Add the column
ALTER TABLE hubook_profiles
  ADD COLUMN IF NOT EXISTS friend_count integer NOT NULL DEFAULT 0;

-- 2. Create the trigger function
CREATE OR REPLACE FUNCTION update_hubook_friend_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'accepted' THEN
      UPDATE hubook_profiles SET friend_count = friend_count + 1 WHERE id = NEW.requester_id;
      UPDATE hubook_profiles SET friend_count = friend_count + 1 WHERE id = NEW.addressee_id;
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'accepted' AND NEW.status = 'accepted' THEN
      UPDATE hubook_profiles SET friend_count = friend_count + 1 WHERE id = NEW.requester_id;
      UPDATE hubook_profiles SET friend_count = friend_count + 1 WHERE id = NEW.addressee_id;
    ELSIF OLD.status = 'accepted' AND NEW.status != 'accepted' THEN
      UPDATE hubook_profiles SET friend_count = GREATEST(friend_count - 1, 0) WHERE id = NEW.requester_id;
      UPDATE hubook_profiles SET friend_count = GREATEST(friend_count - 1, 0) WHERE id = NEW.addressee_id;
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'accepted' THEN
      UPDATE hubook_profiles SET friend_count = GREATEST(friend_count - 1, 0) WHERE id = OLD.requester_id;
      UPDATE hubook_profiles SET friend_count = GREATEST(friend_count - 1, 0) WHERE id = OLD.addressee_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 3. Attach the trigger
DROP TRIGGER IF EXISTS trigger_update_hubook_friend_count ON friendships;
CREATE TRIGGER trigger_update_hubook_friend_count
  AFTER INSERT OR UPDATE OR DELETE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION update_hubook_friend_count();

-- 4. Backfill existing profiles
UPDATE hubook_profiles hp
SET friend_count = (
  SELECT COUNT(*)
  FROM friendships f
  WHERE f.status = 'accepted'
    AND (f.requester_id = hp.id OR f.addressee_id = hp.id)
);
