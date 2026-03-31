/*
  # Create get_backfill_status RPC function

  1. New Functions
    - `get_backfill_status()` - Returns backfill statistics for language detection
      - Returns total records, processed records, and unprocessed records
      - Runs with SECURITY DEFINER to bypass RLS issues with count queries
      - Returns JSON object with statistics

  2. Security
    - Function is accessible to public (anyone can check backfill status)
    - Read-only function, no data modification
*/

CREATE OR REPLACE FUNCTION get_backfill_status()
RETURNS json
LANGUAGE plpgsql
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
