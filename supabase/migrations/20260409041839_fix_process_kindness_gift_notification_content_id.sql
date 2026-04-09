/*
  # Fix process_kindness_gift Notification: Add Required content_id Column

  ## Problem
  The process_kindness_gift trigger function inserts into heddit_notifications
  without providing the content_id column, which is defined as NOT NULL with no
  default. This causes a NOT NULL constraint violation whenever anyone tries to
  give kindness to another user, completely breaking the kindness gift feature.

  ## Changes

  ### Updated Function: process_kindness_gift()
  - Added content_id = NEW.id (the kindness gift's own UUID) to the notification INSERT
  - This provides a meaningful reference - the notification points directly to
    the kindness_gift record that triggered it
  - All other logic remains identical

  ## Important Notes
  1. NEW.id refers to the heddit_kindness_gifts row that was just inserted
  2. The content_type 'kindness_gift' + content_id = gift UUID allows the
     notification to be traced back to the specific gift record
*/

CREATE OR REPLACE FUNCTION public.process_kindness_gift()
RETURNS trigger
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
    receiver.user_id,
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
