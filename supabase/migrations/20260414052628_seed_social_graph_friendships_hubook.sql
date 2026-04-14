/*
  # Seed HuBook Friendships (Social Graph)

  Creates ~400 accepted friendships among the 100 seed users.
  Uses a deterministic pattern: each user befriends ~8 others
  based on offset patterns to create a realistic social graph.
  The friendships table uses requester_id / addressee_id with status='accepted'.
  HuBook profile IDs match user IDs directly (a1000001... format).
*/

INSERT INTO friendships (id, requester_id, addressee_id, status, created_at, updated_at)
SELECT
  gen_random_uuid(),
  u1.uid::uuid,
  u2.uid::uuid,
  'accepted',
  NOW() - (FLOOR(RANDOM() * 180) || ' days')::interval,
  NOW() - (FLOOR(RANDOM() * 30) || ' days')::interval
FROM (
  SELECT 'a100' || LPAD(n::text, 4, '0') || '-0000-0000-0000-' || LPAD(n::text, 12, '0') AS uid, n
  FROM generate_series(1, 100) AS n
) u1
JOIN (
  SELECT 'a100' || LPAD(n::text, 4, '0') || '-0000-0000-0000-' || LPAD(n::text, 12, '0') AS uid, n
  FROM generate_series(1, 100) AS n
) u2
  ON u2.n != u1.n
  AND (
    (u2.n = ((u1.n + 1 - 1) % 100) + 1) OR
    (u2.n = ((u1.n + 2 - 1) % 100) + 1) OR
    (u2.n = ((u1.n + 3 - 1) % 100) + 1) OR
    (u2.n = ((u1.n + 7 - 1) % 100) + 1) OR
    (u2.n = ((u1.n + 13 - 1) % 100) + 1) OR
    (u2.n = ((u1.n + 17 - 1) % 100) + 1) OR
    (u2.n = ((u1.n + 23 - 1) % 100) + 1) OR
    (u2.n = ((u1.n + 29 - 1) % 100) + 1)
  )
  AND u1.n < u2.n
ON CONFLICT DO NOTHING;
