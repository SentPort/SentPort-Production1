/*
  # Fix Language Distribution Function Caching

  1. Changes
    - Change `get_language_distribution()` from `LANGUAGE sql` to `LANGUAGE plpgsql`
    - Add `VOLATILE` declaration to prevent PostgREST from caching results
    - This ensures fresh data is returned on every call
    
  2. Why This Fixes The Issue
    - SQL functions are marked as STABLE by default, allowing caching
    - VOLATILE explicitly tells PostgreSQL/PostgREST not to cache
    - Ensures admin dashboard always shows current language statistics
*/

CREATE OR REPLACE FUNCTION get_language_distribution()
RETURNS TABLE (
  language text,
  count bigint
) 
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(si.language, 'unknown') as language,
    COUNT(*) as count
  FROM search_index si
  WHERE si.language_backfill_processed = true
  GROUP BY COALESCE(si.language, 'unknown')
  ORDER BY count DESC;
END;
$$;
