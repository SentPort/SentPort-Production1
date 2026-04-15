/*
  # Backfill Blog Reaction Counts

  ## Summary
  Recalculates and corrects all reaction count columns in `blog_posts` based on
  the actual data in the `blog_reactions` table. This fixes any posts that
  already have reactions recorded but show zero counts due to the previously
  missing trigger.

  ## Changes

  ### Updated Table: `blog_posts`
  - Recalculates: `like_count`, `love_count`, `insightful_count`, `inspiring_count`,
    `thoughtful_count`, `helpful_count`, `mindblown_count`, `total_reaction_count`
  - Sets all counts to 0 first, then recomputes from aggregated `blog_reactions` data

  ## Notes
  - Safe to run multiple times (idempotent)
  - Runs as a single UPDATE with a subquery aggregate for accuracy
*/

UPDATE blog_posts bp
SET
  like_count       = COALESCE(r.like_count,       0),
  love_count       = COALESCE(r.love_count,       0),
  insightful_count = COALESCE(r.insightful_count, 0),
  inspiring_count  = COALESCE(r.inspiring_count,  0),
  thoughtful_count = COALESCE(r.thoughtful_count, 0),
  helpful_count    = COALESCE(r.helpful_count,    0),
  mindblown_count  = COALESCE(r.mindblown_count,  0),
  total_reaction_count = COALESCE(r.total_count,  0)
FROM (
  SELECT
    post_id,
    COUNT(*) FILTER (WHERE reaction_type = 'like')        AS like_count,
    COUNT(*) FILTER (WHERE reaction_type = 'love')        AS love_count,
    COUNT(*) FILTER (WHERE reaction_type = 'insightful')  AS insightful_count,
    COUNT(*) FILTER (WHERE reaction_type = 'inspiring')   AS inspiring_count,
    COUNT(*) FILTER (WHERE reaction_type = 'thoughtful')  AS thoughtful_count,
    COUNT(*) FILTER (WHERE reaction_type = 'helpful')     AS helpful_count,
    COUNT(*) FILTER (WHERE reaction_type = 'mindblown')   AS mindblown_count,
    COUNT(*)                                               AS total_count
  FROM blog_reactions
  GROUP BY post_id
) r
WHERE bp.id = r.post_id;

UPDATE blog_posts
SET
  like_count       = 0,
  love_count       = 0,
  insightful_count = 0,
  inspiring_count  = 0,
  thoughtful_count = 0,
  helpful_count    = 0,
  mindblown_count  = 0,
  total_reaction_count = 0
WHERE id NOT IN (SELECT DISTINCT post_id FROM blog_reactions);
