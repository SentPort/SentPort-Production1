/*
  # Fix switter follow counts trigger

  The update_switter_follow_counts function references 'type' column
  in switter_notifications but the actual column is 'notification_type'.
  This fix corrects the column name so follows can be inserted.
*/

CREATE OR REPLACE FUNCTION update_switter_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE switter_accounts
    SET following_count = following_count + 1
    WHERE user_id = NEW.follower_id;

    UPDATE switter_accounts
    SET follower_count = follower_count + 1
    WHERE user_id = NEW.following_id;

    INSERT INTO switter_notifications (user_id, notification_type, actor_id, created_at)
    VALUES (NEW.following_id, 'follow', NEW.follower_id, now());

    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE switter_accounts
    SET following_count = GREATEST(0, following_count - 1)
    WHERE user_id = OLD.follower_id;

    UPDATE switter_accounts
    SET follower_count = GREATEST(0, follower_count - 1)
    WHERE user_id = OLD.following_id;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
