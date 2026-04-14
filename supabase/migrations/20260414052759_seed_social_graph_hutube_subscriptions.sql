/*
  # Seed HuTube Subscriptions (Social Graph)

  Creates ~500 channel subscriptions among the 100 seed users.
  hutube_subscriptions uses channel_id (hutube channel UUID) and user_id (auth user UUID).
  Each user subscribes to ~5 other channels using offset patterns.
*/

INSERT INTO hutube_subscriptions (id, channel_id, user_id, created_at)
SELECT
  gen_random_uuid(),
  hc.id AS channel_id,
  u2.user_id,
  NOW() - (FLOOR(RANDOM() * 180) || ' days')::interval
FROM (
  SELECT hc.id, hc.user_id, ROW_NUMBER() OVER (ORDER BY hc.user_id) AS rn
  FROM hutube_channels hc
  WHERE EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = hc.user_id
    AND au.raw_app_meta_data->>'account_type' = 'seed_test'
  )
) hc
JOIN (
  SELECT hc2.user_id, ROW_NUMBER() OVER (ORDER BY hc2.user_id) AS rn
  FROM hutube_channels hc2
  WHERE EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = hc2.user_id
    AND au.raw_app_meta_data->>'account_type' = 'seed_test'
  )
) u2
  ON hc.rn != u2.rn
  AND hc.user_id != u2.user_id
  AND (
    (u2.rn = ((hc.rn + 3 - 1) % 100) + 1) OR
    (u2.rn = ((hc.rn + 6 - 1) % 100) + 1) OR
    (u2.rn = ((hc.rn + 10 - 1) % 100) + 1) OR
    (u2.rn = ((hc.rn + 16 - 1) % 100) + 1) OR
    (u2.rn = ((hc.rn + 24 - 1) % 100) + 1)
  )
ON CONFLICT DO NOTHING;
