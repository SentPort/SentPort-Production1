/*
  # Create Language Distribution Function

  1. New Functions
    - `get_language_distribution()` - Returns count of records by language
      - Groups search_index records by language column
      - Returns language code and count for each language
      - Orders by count descending

  2. Purpose
    - Provides statistics for admin dashboard
    - Shows distribution of languages in search index
    - Helps track backfill progress
*/

CREATE OR REPLACE FUNCTION get_language_distribution()
RETURNS TABLE (
  language text,
  count bigint
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(language, 'unknown') as language,
    COUNT(*) as count
  FROM search_index
  WHERE language_backfill_processed = true
  GROUP BY COALESCE(language, 'unknown')
  ORDER BY count DESC;
$$;
