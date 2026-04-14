/*
  # Seed Hinsta Follows (Social Graph)

  Creates ~500 follow relationships among Hinsta accounts.
  hinsta_follows uses follower_id / following_id (both are hinsta account UUIDs).
  We join hinsta_accounts to get the correct IDs by user order.
*/

INSERT INTO hinsta_follows (id, follower_id, following_id, created_at)
SELECT
  gen_random_uuid(),
  ia1.id,
  ia2.id,
  NOW() - (FLOOR(RANDOM() * 200) || ' days')::interval
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY user_id) AS rn
  FROM hinsta_accounts ia
  WHERE EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = ia.user_id
    AND au.raw_app_meta_data->>'account_type' = 'seed_test'
  )
) ia1
JOIN (
  SELECT id, ROW_NUMBER() OVER (ORDER BY user_id) AS rn
  FROM hinsta_accounts ia
  WHERE EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = ia.user_id
    AND au.raw_app_meta_data->>'account_type' = 'seed_test'
  )
) ia2
  ON ia1.rn != ia2.rn
  AND (
    (ia2.rn = ((ia1.rn + 1 - 1) % 100) + 1) OR
    (ia2.rn = ((ia1.rn + 3 - 1) % 100) + 1) OR
    (ia2.rn = ((ia1.rn + 5 - 1) % 100) + 1) OR
    (ia2.rn = ((ia1.rn + 11 - 1) % 100) + 1) OR
    (ia2.rn = ((ia1.rn + 19 - 1) % 100) + 1)
  )
ON CONFLICT DO NOTHING;
