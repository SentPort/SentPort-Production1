/*
  # Seed Blog Follows (Social Graph)

  Creates ~500 follow relationships among Blog accounts.
  blog_follows uses follower_id / following_id (blog account UUIDs = user UUIDs).
*/

INSERT INTO blog_follows (id, follower_id, following_id, created_at)
SELECT
  gen_random_uuid(),
  ba1.id,
  ba2.id,
  NOW() - (FLOOR(RANDOM() * 200) || ' days')::interval
FROM (
  SELECT ba.id, ROW_NUMBER() OVER (ORDER BY ba.id) AS rn
  FROM blog_accounts ba
  WHERE EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = ba.id
    AND au.raw_app_meta_data->>'account_type' = 'seed_test'
  )
) ba1
JOIN (
  SELECT ba.id, ROW_NUMBER() OVER (ORDER BY ba.id) AS rn
  FROM blog_accounts ba
  WHERE EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = ba.id
    AND au.raw_app_meta_data->>'account_type' = 'seed_test'
  )
) ba2
  ON ba1.rn != ba2.rn
  AND (
    (ba2.rn = ((ba1.rn + 2 - 1) % 100) + 1) OR
    (ba2.rn = ((ba1.rn + 5 - 1) % 100) + 1) OR
    (ba2.rn = ((ba1.rn + 11 - 1) % 100) + 1) OR
    (ba2.rn = ((ba1.rn + 18 - 1) % 100) + 1) OR
    (ba2.rn = ((ba1.rn + 27 - 1) % 100) + 1)
  )
ON CONFLICT DO NOTHING;
