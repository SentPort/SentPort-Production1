/*
  # Create Fuzzy Search Function for Typo Tolerance

  1. Function: fuzzy_search_content
    - Performs trigram similarity-based fuzzy search on search_index table
    - Handles typos and misspellings in search queries
    - Returns results ranked by similarity score

  2. Parameters
    - search_term: The user's search query (with potential typos)
    - include_external: Whether to include external content or only internal
    - similarity_threshold: Minimum similarity score (0.0 to 1.0, default 0.3)

  3. Returns
    - All search_index columns plus similarity_score
    - Ordered by similarity score descending
    - Limited to top 50 results for performance

  4. Security
    - Function uses SECURITY DEFINER to bypass RLS for search performance
    - No data modification, read-only access
    - Respects include_external filter for content preferences
*/

CREATE OR REPLACE FUNCTION fuzzy_search_content(
  search_term text,
  include_external boolean DEFAULT true,
  similarity_threshold float DEFAULT 0.3
)
RETURNS TABLE (
  id uuid,
  url text,
  title text,
  description text,
  content_snippet text,
  is_internal boolean,
  is_verified_external boolean,
  relevance_score float,
  last_indexed_at timestamptz,
  content_type text,
  source_platform text,
  thumbnail_url text,
  media_duration integer,
  publication_date timestamptz,
  author_name text,
  view_count bigint,
  image_width integer,
  image_height integer,
  alt_text text,
  parent_page_url text,
  similarity_score float
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    si.id,
    si.url,
    si.title,
    si.description,
    si.content_snippet,
    si.is_internal,
    si.is_verified_external,
    si.relevance_score,
    si.last_indexed_at,
    si.content_type,
    si.source_platform,
    si.thumbnail_url,
    si.media_duration,
    si.publication_date,
    si.author_name,
    si.view_count,
    si.image_width,
    si.image_height,
    si.alt_text,
    si.parent_page_url,
    GREATEST(
      similarity(COALESCE(si.title, ''), search_term),
      similarity(COALESCE(si.description, ''), search_term),
      similarity(COALESCE(si.content_snippet, ''), search_term)
    ) as similarity_score
  FROM search_index si
  WHERE 
    (
      similarity(COALESCE(si.title, ''), search_term) >= similarity_threshold
      OR similarity(COALESCE(si.description, ''), search_term) >= similarity_threshold
      OR similarity(COALESCE(si.content_snippet, ''), search_term) >= similarity_threshold
    )
    AND (include_external = true OR si.is_internal = true)
  ORDER BY 
    similarity_score DESC,
    si.relevance_score DESC
  LIMIT 50;
END;
$$;

-- Allow all authenticated users to call this function
GRANT EXECUTE ON FUNCTION fuzzy_search_content(text, boolean, float) TO authenticated;
GRANT EXECUTE ON FUNCTION fuzzy_search_content(text, boolean, float) TO anon;
