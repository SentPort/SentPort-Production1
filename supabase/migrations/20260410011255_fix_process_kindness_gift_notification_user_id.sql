
/*
  # Fix process_kindness_gift trigger notification user_id

  ## Problem
  The `process_kindness_gift` trigger was inserting `receiver.user_id` (the Supabase Auth UID)
  into `heddit_notifications.user_id`, but that column has a foreign key constraint pointing to
  `heddit_accounts(id)` -- not to auth.users. This caused a foreign key violation on every
  kindness gift attempt, which was caught by the WHEN OTHERS handler in `give_kindness()` and
  returned the generic "An error occurred while giving kindness" error.

  ## Fix
  Change the notification INSERT to use `receiver.id` (the heddit_accounts primary key UUID)
  instead of `receiver.user_id` (the auth UID) for the `user_id` column.
*/

CREATE OR REPLACE FUNCTION process_kindness_gift()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE heddit_accounts
  SET karma = karma + 20
  WHERE id = NEW.giver_id;

  UPDATE heddit_accounts
  SET kindness = kindness + 50
  WHERE id = NEW.receiver_id;

  INSERT INTO heddit_notifications (user_id, actor_id, type, content_type, content_id, message)
  SELECT
    receiver.id,
    NEW.giver_id,
    'kindness_received',
    'kindness_gift',
    NEW.id,
    giver.display_name || ' gave you kindness! You received +50 kindness!'
  FROM heddit_accounts giver, heddit_accounts receiver
  WHERE giver.id = NEW.giver_id AND receiver.id = NEW.receiver_id;

  RETURN NEW;
END;
$$;
