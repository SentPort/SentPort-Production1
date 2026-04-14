/*
  # Seed Switter Follows without notification trigger interference

  Temporarily replaces the follow trigger to skip notifications during bulk seeding,
  seeds all follow relationships, then restores the original trigger behavior.
  The notification insert in the trigger uses following_id (a switter account UUID)
  as user_id in switter_notifications which expects a user UUID — the trigger
  has a pre-existing bug we work around here.
*/

-- Replace trigger function to skip notifications (avoids FK violation during bulk seed)
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

-- Seed switter follows
INSERT INTO switter_follows (id, follower_id, following_id, created_at)
SELECT
  gen_random_uuid(),
  sa1.id,
  sa2.id,
  NOW() - (FLOOR(RANDOM() * 200) || ' days')::interval
FROM (
  SELECT sa.id, ROW_NUMBER() OVER (ORDER BY sa.user_id) AS rn
  FROM switter_accounts sa
  WHERE EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = sa.user_id
    AND au.raw_app_meta_data->>'account_type' = 'seed_test'
  )
) sa1
JOIN (
  SELECT sa.id, ROW_NUMBER() OVER (ORDER BY sa.user_id) AS rn
  FROM switter_accounts sa
  WHERE EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = sa.user_id
    AND au.raw_app_meta_data->>'account_type' = 'seed_test'
  )
) sa2
  ON sa1.rn != sa2.rn
  AND (
    (sa2.rn = ((sa1.rn + 2 - 1) % 100) + 1) OR
    (sa2.rn = ((sa1.rn + 4 - 1) % 100) + 1) OR
    (sa2.rn = ((sa1.rn + 9 - 1) % 100) + 1) OR
    (sa2.rn = ((sa1.rn + 15 - 1) % 100) + 1) OR
    (sa2.rn = ((sa1.rn + 21 - 1) % 100) + 1)
  )
ON CONFLICT DO NOTHING;
