/*
  # Fix Backfill Status Function Caching

  1. Changes
    - Add `VOLATILE` declaration to `get_backfill_status()` function
    - This prevents PostgREST from caching backfill status results
    - Ensures real-time status updates during auto-run
    
  2. Why This Fixes The Issue
    - Without VOLATILE, PostgREST may cache the result
    - This caused stale counts during rapid successive calls
    - VOLATILE ensures fresh counts on every request
*/

CREATE OR REPLACE FUNCTION get_backfill_status()
RETURNS json
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
AS $$
DECLARE
  total_count bigint;
  processed_count bigint;
  unprocessed_count bigint;
BEGIN
  -- Get total records
  SELECT COUNT(*) INTO total_count FROM search_index;
  
  -- Get processed records
  SELECT COUNT(*) INTO processed_count 
  FROM search_index 
  WHERE language_backfill_processed = true;
  
  -- Get unprocessed records
  SELECT COUNT(*) INTO unprocessed_count 
  FROM search_index 
  WHERE language_backfill_processed IS NULL OR language_backfill_processed = false;
  
  -- Return as JSON
  RETURN json_build_object(
    'totalRecords', total_count,
    'processedRecords', processed_count,
    'unprocessedRecords', unprocessed_count,
    'percentageComplete', CASE 
      WHEN total_count > 0 THEN (processed_count::numeric / total_count::numeric * 100)
      ELSE 0 
    END
  );
END;
$$;
