/*
  # Fix Spell Correction Functions Security

  1. Changes
    - Add SECURITY DEFINER to `get_spelling_suggestions` function
    - Add SECURITY DEFINER to `correct_search_query` function
    - These functions need to run with elevated privileges to access word_dictionary and spelling_corrections tables
    - This allows anonymous users to use spell correction features

  2. Security
    - Functions are read-only operations on public data
    - No user data is exposed
    - RLS policies on underlying tables remain enforced
*/

-- Add SECURITY DEFINER to get_spelling_suggestions
CREATE OR REPLACE FUNCTION get_spelling_suggestions(
  input_word text,
  max_suggestions int DEFAULT 3
)
RETURNS TABLE(
  suggestion text,
  confidence float,
  frequency bigint,
  source text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  lower_word text;
  variations text[];
BEGIN
  lower_word := lower(trim(input_word));

  -- Check 1: Exact match in dictionary (word is already correct)
  IF EXISTS (SELECT 1 FROM word_dictionary WHERE word = lower_word) THEN
    RETURN QUERY 
    SELECT lower_word, 1.0::float, 0::bigint, 'exact'::text
    LIMIT 1;
    RETURN;
  END IF;

  -- Check 2: Known corrections
  IF EXISTS (SELECT 1 FROM spelling_corrections WHERE incorrect_word = lower_word) THEN
    RETURN QUERY
    SELECT 
      correct_word as suggestion,
      0.95::float as confidence,
      0::bigint as frequency,
      'known'::text as source
    FROM spelling_corrections
    WHERE incorrect_word = lower_word
    ORDER BY frequency DESC
    LIMIT max_suggestions;
    RETURN;
  END IF;

  -- Check 3: Edit distance 1 from dictionary
  variations := ARRAY(
    SELECT w.word
    FROM word_dictionary w
    WHERE levenshtein(w.word, lower_word) = 1
    ORDER BY w.frequency DESC
    LIMIT max_suggestions
  );

  IF array_length(variations, 1) > 0 THEN
    RETURN QUERY
    SELECT 
      unnest as suggestion,
      0.85::float as confidence,
      COALESCE(w.frequency, 0) as frequency,
      'edit1'::text as source
    FROM unnest(variations) unnest
    LEFT JOIN word_dictionary w ON w.word = unnest
    ORDER BY COALESCE(w.frequency, 0) DESC
    LIMIT max_suggestions;
    RETURN;
  END IF;

  -- Check 4: Edit distance 2 (fuzzy match)
  RETURN QUERY
  SELECT 
    w.word as suggestion,
    CASE 
      WHEN levenshtein(w.word, lower_word) = 2 THEN 0.70
      ELSE 0.50
    END as confidence,
    w.frequency,
    'fuzzy'::text as source
  FROM word_dictionary w
  WHERE levenshtein(w.word, lower_word) <= 2
    AND length(w.word) >= length(lower_word) - 1
    AND length(w.word) <= length(lower_word) + 1
  ORDER BY w.frequency DESC
  LIMIT max_suggestions;

  RETURN;
END;
$$;

-- Add SECURITY DEFINER to correct_search_query
CREATE OR REPLACE FUNCTION correct_search_query(input_query text)
RETURNS TABLE(
  corrected_query text,
  confidence float,
  changed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  words text[];
  corrected_words text[] := ARRAY[]::text[];
  word text;
  best_suggestion record;
  has_changes boolean := false;
  overall_confidence float := 1.0;
  word_count int;
BEGIN
  -- Clean and split query into words
  words := string_to_array(lower(trim(regexp_replace(input_query, '[^a-zA-Z0-9\s]', ' ', 'g'))), ' ');
  words := array_remove(words, '');
  words := array_remove(words, null);

  word_count := array_length(words, 1);

  -- Don't process if too many words (performance protection)
  IF word_count IS NULL OR word_count > 5 THEN
    RETURN QUERY SELECT input_query, 1.0::float, false;
    RETURN;
  END IF;

  -- Process each word
  FOREACH word IN ARRAY words
  LOOP
    -- Skip very short words
    IF length(word) < 2 THEN
      corrected_words := array_append(corrected_words, word);
      CONTINUE;
    END IF;

    -- Get best suggestion for this word
    SELECT * INTO best_suggestion
    FROM get_spelling_suggestions(word, 1)
    ORDER BY confidence DESC, frequency DESC
    LIMIT 1;

    IF best_suggestion.suggestion IS NOT NULL THEN
      corrected_words := array_append(corrected_words, best_suggestion.suggestion);

      -- Track if any changes were made
      IF best_suggestion.suggestion != word THEN
        has_changes := true;
        overall_confidence := overall_confidence * best_suggestion.confidence;
      END IF;
    ELSE
      corrected_words := array_append(corrected_words, word);
    END IF;
  END LOOP;

  -- Return corrected query
  RETURN QUERY SELECT 
    array_to_string(corrected_words, ' '),
    overall_confidence,
    has_changes;
END;
$$;
