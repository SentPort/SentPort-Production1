/*
  # Create Function to Backfill Language Detection

  1. Purpose
    - Create a callable function to update language for search_index entries
    - Can be called manually or in batches by admins
    - Avoids timeout issues by processing limited rows

  2. Function
    - `backfill_search_index_language(batch_size integer)`: Process limited entries at a time
*/

-- Create function to backfill language detection in batches
CREATE OR REPLACE FUNCTION backfill_search_index_language(batch_size integer DEFAULT 50)
RETURNS TABLE(processed_count integer, updated_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry RECORD;
  v_lang_result RECORD;
  v_combined_text text;
  v_processed integer := 0;
  v_updated integer := 0;
BEGIN
  -- Process entries in batches
  FOR v_entry IN 
    SELECT id, title, description, content_snippet, language
    FROM search_index
    ORDER BY created_at DESC
    LIMIT batch_size
  LOOP
    -- Combine available text fields
    v_combined_text := 
      COALESCE(v_entry.title, '') || ' ' ||
      COALESCE(v_entry.description, '') || ' ' ||
      COALESCE(v_entry.content_snippet, '');

    -- Skip if text is too minimal
    IF LENGTH(v_combined_text) < 5 THEN
      v_processed := v_processed + 1;
      CONTINUE;
    END IF;

    -- Detect language
    BEGIN
      SELECT * INTO v_lang_result FROM detect_language_simple(v_combined_text);
      
      -- Update the entry with detected language
      UPDATE search_index
      SET 
        language = COALESCE(v_lang_result.language, 'en'),
        language_confidence = COALESCE(v_lang_result.confidence, 0.7)
      WHERE id = v_entry.id;

      v_updated := v_updated + 1;
    EXCEPTION WHEN OTHERS THEN
      -- If detection fails, default to English
      UPDATE search_index
      SET 
        language = 'en',
        language_confidence = 0.5
      WHERE id = v_entry.id;
      
      v_updated := v_updated + 1;
    END;

    v_processed := v_processed + 1;
  END LOOP;

  RETURN QUERY SELECT v_processed, v_updated;
END;
$$;

-- Grant execute permission to authenticated users (admins will use this)
GRANT EXECUTE ON FUNCTION backfill_search_index_language(integer) TO authenticated;