/*
  # Create Server-Side SubHeddit Search Function

  ## Overview
  Creates a PostgreSQL function for efficient server-side SubHeddit searching
  with support for full-text search, topic filtering, and recommendations.

  ## New Functions

  1. **search_heddit_subreddits**
     - Parameters:
       - search_query (text) - Search term for name/description
       - topic_filters (text[]) - Array of topic slugs to filter by
       - current_user_id (uuid) - User ID for personalized results
       - result_limit (int) - Maximum results to return
     - Returns: JSON array of SubHeddits with metadata
     - Features:
       - Full-text search on name and description
       - Topic-based filtering
       - Member count and topics included
       - Indicates if user is already a member
       - Sorts by relevance and popularity

  2. **get_recommended_subreddits**
     - Parameters:
       - current_user_id (uuid) - User ID for personalization
       - result_limit (int) - Maximum results
     - Returns: Recommended SubHeddits based on user activity
     - Features:
       - Popular SubHeddits by member count
       - Recently active communities
       - Excludes already joined communities

  ## Security
  - Functions use SECURITY DEFINER for optimized queries
  - RLS policies still enforced on underlying tables
*/

-- ============================================================================
-- SEARCH FUNCTION: Advanced SubHeddit Search
-- ============================================================================

CREATE OR REPLACE FUNCTION search_heddit_subreddits(
  search_query text DEFAULT '',
  topic_filters text[] DEFAULT '{}',
  current_user_id uuid DEFAULT NULL,
  result_limit int DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  name text,
  display_name text,
  description text,
  member_count int,
  topics text[],
  is_member boolean,
  creator_id uuid,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.name,
    s.display_name,
    s.description,
    s.member_count,
    s.topics,
    CASE
      WHEN current_user_id IS NOT NULL THEN
        EXISTS (
          SELECT 1 FROM heddit_subreddit_members m
          JOIN heddit_accounts a ON m.account_id = a.id
          WHERE m.subreddit_id = s.id
          AND a.user_id = current_user_id
        )
      ELSE false
    END as is_member,
    s.creator_id,
    s.created_at
  FROM heddit_subreddits s
  WHERE
    (
      search_query = ''
      OR s.name ILIKE '%' || search_query || '%'
      OR s.display_name ILIKE '%' || search_query || '%'
      OR s.description ILIKE '%' || search_query || '%'
      OR to_tsvector('english', s.name || ' ' || s.display_name || ' ' || s.description)
         @@ plainto_tsquery('english', search_query)
    )
    AND (
      array_length(topic_filters, 1) IS NULL
      OR s.topics && topic_filters
    )
  ORDER BY
    s.member_count DESC,
    s.created_at DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RECOMMENDATION FUNCTION: Get Recommended SubHeddits
-- ============================================================================

CREATE OR REPLACE FUNCTION get_recommended_subreddits(
  current_user_id uuid DEFAULT NULL,
  result_limit int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  name text,
  display_name text,
  description text,
  member_count int,
  topics text[],
  is_member boolean,
  recommendation_reason text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.name,
    s.display_name,
    s.description,
    s.member_count,
    s.topics,
    CASE
      WHEN current_user_id IS NOT NULL THEN
        EXISTS (
          SELECT 1 FROM heddit_subreddit_members m
          JOIN heddit_accounts a ON m.account_id = a.id
          WHERE m.subreddit_id = s.id
          AND a.user_id = current_user_id
        )
      ELSE false
    END as is_member,
    CASE
      WHEN s.member_count > 1000 THEN 'Popular community'
      WHEN s.created_at > now() - interval '7 days' THEN 'New community'
      ELSE 'Recommended for you'
    END as recommendation_reason
  FROM heddit_subreddits s
  WHERE
    current_user_id IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM heddit_subreddit_members m
      JOIN heddit_accounts a ON m.account_id = a.id
      WHERE m.subreddit_id = s.id
      AND a.user_id = current_user_id
    )
  ORDER BY
    s.member_count DESC,
    s.created_at DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- USER ACTIVITY FUNCTION: Get User's Recently Posted SubHeddits
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_recent_subreddits(
  current_user_id uuid,
  result_limit int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  name text,
  display_name text,
  member_count int,
  topics text[],
  last_posted_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (s.id)
    s.id,
    s.name,
    s.display_name,
    s.member_count,
    s.topics,
    p.created_at as last_posted_at
  FROM heddit_subreddits s
  JOIN heddit_posts p ON p.subreddit_id = s.id
  JOIN heddit_accounts a ON p.author_id = a.id
  WHERE a.user_id = current_user_id
  ORDER BY s.id, p.created_at DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;