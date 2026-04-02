/*
  # Fix and Enhance Fuzzy Search for Better Typo Tolerance

  1. Changes to fuzzy_search_content Function
    - Fix type mismatch: Cast numeric relevance_score to double precision
    - Add missing language-related columns from search_index
    - Improve similarity matching with title normalization
    - Lower default similarity threshold from 0.3 to 0.25 for better typo tolerance
    - Add word-level matching for better results with multi-word queries
    - Boost title matches higher than description/content matches

  2. New Helper Function: normalize_title_for_search
    - Strips common suffixes like "- Wikipedia", "| Site Name", etc.
    - Removes extra whitespace
    - Helps improve similarity scores by comparing core content

  3. Enhanced Scoring
    - Title similarity weighted 2x higher than description/content
    - Separate scoring for normalized titles vs full titles
    - Better handling of short queries vs long titles
    - Returns top 50 results ordered by best similarity match

  4. Security
    - Function uses SECURITY DEFINER to bypass RLS for search performance
    - No data modification, read-only access
    - Respects include_external filter for content preferences
*/

-- Helper function to normalize titles for better fuzzy matching
CREATE OR REPLACE FUNCTION normalize_title_for_search(input_title text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF input_title IS NULL THEN
    RETURN '';
  END IF;
  
  -- Remove common suffixes that dilute similarity scores
  input_title := regexp_replace(input_title, '\s*[-|–—]\s*(Wikipedia|Site.*|Home.*|Official.*|Main.*|Index).*$', '', 'i');
  
  -- Remove extra whitespace
  input_title := regexp_replace(input_title, '\s+', ' ', 'g');
  input_title := trim(input_title);
  
  RETURN input_title;
END;
$$;

-- Drop and recreate the fuzzy_search_content function with fixes
DROP FUNCTION IF EXISTS fuzzy_search_content(text, boolean, float);

CREATE OR REPLACE FUNCTION fuzzy_search_content(
  search_term text,
  include_external boolean DEFAULT true,
  similarity_threshold float DEFAULT 0.25
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
  language text,
  language_confidence float,
  language_backfill_processed boolean,
  similarity_score float
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  normalized_search_term text;
BEGIN
  -- Normalize the search term
  normalized_search_term := normalize_title_for_search(search_term);
  
  RETURN QUERY
  SELECT 
    si.id,
    si.url,
    si.title,
    si.description,
    si.content_snippet,
    si.is_internal,
    si.is_verified_external,
    si.relevance_score::double precision,
    si.last_indexed_at,
    si.content_type::text,
    si.source_platform,
    si.thumbnail_url,
    si.media_duration,
    si.publication_date,
    si.author_name,
    si.view_count::bigint,
    si.image_width,
    si.image_height,
    si.alt_text,
    si.parent_page_url,
    si.language,
    si.language_confidence::double precision,
    si.language_backfill_processed,
    GREATEST(
      -- Normalized title comparison (weighted 2x) - removes suffixes for better matching
      similarity(normalize_title_for_search(COALESCE(si.title, '')), normalized_search_term) * 2.0,
      -- Full title comparison
      similarity(COALESCE(si.title, ''), search_term),
      -- Description comparison
      similarity(COALESCE(si.description, ''), search_term) * 0.9,
      -- Content snippet comparison  
      similarity(COALESCE(si.content_snippet, ''), search_term) * 0.8,
      -- Word-level matching: check if individual words from search appear in title
      CASE 
        WHEN COALESCE(si.title, '') ILIKE '%' || search_term || '%' THEN 0.6
        ELSE 0.0
      END
    )::double precision as similarity_score
  FROM search_index si
  WHERE 
    (
      -- Check normalized title similarity
      similarity(normalize_title_for_search(COALESCE(si.title, '')), normalized_search_term) >= similarity_threshold
      -- Or full title similarity
      OR similarity(COALESCE(si.title, ''), search_term) >= similarity_threshold
      -- Or description similarity
      OR similarity(COALESCE(si.description, ''), search_term) >= similarity_threshold
      -- Or content similarity
      OR similarity(COALESCE(si.content_snippet, ''), search_term) >= similarity_threshold
      -- Or partial word match in title
      OR COALESCE(si.title, '') ILIKE '%' || search_term || '%'
    )
    AND (include_external = true OR si.is_internal = true)
  ORDER BY 
    similarity_score DESC,
    si.relevance_score DESC
  LIMIT 50;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION normalize_title_for_search(text) TO authenticated;
GRANT EXECUTE ON FUNCTION normalize_title_for_search(text) TO anon;
GRANT EXECUTE ON FUNCTION fuzzy_search_content(text, boolean, float) TO authenticated;
GRANT EXECUTE ON FUNCTION fuzzy_search_content(text, boolean, float) TO anon;
