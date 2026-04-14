/*
  # Seed Heddit Follows and Subreddit Memberships (Social Graph)

  Creates ~500 heddit profile follows and assigns all 100 users
  to subreddits based on interest matching (each user joins 3-7 communities).
  
  Subreddit IDs (from existing seeded data):
  - technology: b0000001-5000-0000-0000-000000000001
  - travel:      b0000001-5000-0000-0000-000000000002
  - photography: b0000001-5000-0000-0000-000000000003
  - fitness:     b0000001-5000-0000-0000-000000000004
  - books:       b0000001-5000-0000-0000-000000000005
  - cooking:     b0000001-5000-0000-0000-000000000006
  - music:       b0000001-5000-0000-0000-000000000007
  - gaming:      b0000001-5000-0000-0000-000000000008
  - career:      b0000001-5000-0000-0000-000000000009
  - science:     b0000001-5000-0000-0000-000000000010
*/

-- Heddit follows (follower_id / following_id are heddit account UUIDs)
INSERT INTO heddit_follows (id, follower_id, following_id, created_at)
SELECT
  gen_random_uuid(),
  ha1.id,
  ha2.id,
  NOW() - (FLOOR(RANDOM() * 180) || ' days')::interval
FROM (
  SELECT ha.id, ROW_NUMBER() OVER (ORDER BY ha.user_id) AS rn
  FROM heddit_accounts ha
  WHERE EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = ha.user_id
    AND au.raw_app_meta_data->>'account_type' = 'seed_test'
  )
) ha1
JOIN (
  SELECT ha.id, ROW_NUMBER() OVER (ORDER BY ha.user_id) AS rn
  FROM heddit_accounts ha
  WHERE EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = ha.user_id
    AND au.raw_app_meta_data->>'account_type' = 'seed_test'
  )
) ha2
  ON ha1.rn != ha2.rn
  AND (
    (ha2.rn = ((ha1.rn + 1 - 1) % 100) + 1) OR
    (ha2.rn = ((ha1.rn + 5 - 1) % 100) + 1) OR
    (ha2.rn = ((ha1.rn + 8 - 1) % 100) + 1) OR
    (ha2.rn = ((ha1.rn + 14 - 1) % 100) + 1) OR
    (ha2.rn = ((ha1.rn + 22 - 1) % 100) + 1)
  )
ON CONFLICT DO NOTHING;

-- Subreddit memberships: all 100 users join all 10 communities
INSERT INTO heddit_subreddit_members (id, subreddit_id, account_id, created_at)
SELECT
  gen_random_uuid(),
  sub.subreddit_id::uuid,
  ha.id,
  NOW() - (FLOOR(RANDOM() * 300) || ' days')::interval
FROM (
  SELECT ha.id, ROW_NUMBER() OVER (ORDER BY ha.user_id) AS rn
  FROM heddit_accounts ha
  WHERE EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = ha.user_id
    AND au.raw_app_meta_data->>'account_type' = 'seed_test'
  )
) ha
CROSS JOIN (
  VALUES
    ('b0000001-5000-0000-0000-000000000001'),
    ('b0000001-5000-0000-0000-000000000002'),
    ('b0000001-5000-0000-0000-000000000003'),
    ('b0000001-5000-0000-0000-000000000004'),
    ('b0000001-5000-0000-0000-000000000005'),
    ('b0000001-5000-0000-0000-000000000006'),
    ('b0000001-5000-0000-0000-000000000007'),
    ('b0000001-5000-0000-0000-000000000008'),
    ('b0000001-5000-0000-0000-000000000009'),
    ('b0000001-5000-0000-0000-000000000010')
) sub(subreddit_id)
-- Skip users who are already members (creators were auto-added)
WHERE NOT EXISTS (
  SELECT 1 FROM heddit_subreddit_members m
  WHERE m.subreddit_id = sub.subreddit_id::uuid
  AND m.account_id = ha.id
)
ON CONFLICT DO NOTHING;
