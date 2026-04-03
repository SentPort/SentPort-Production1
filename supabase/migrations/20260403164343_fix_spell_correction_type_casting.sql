/*
  # Fix Type Casting in Spell Correction Function

  1. Changes
    - Add proper type casting to confidence values
    - Ensure all confidence values are explicitly cast to float
    - Fix "numeric does not match expected type double precision" error

  2. Impact
    - Fixes runtime error in spell correction
    - Allows spell suggestions to return properly
*/

-- Fix type casting in get_spelling_suggestions
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
  IF EXISTS (SELECT 1 FROM spelling_corrections WHERE misspelling = lower_word) THEN
    RETURN QUERY
    SELECT 
      correction as suggestion,
      0.95::float as confidence,
      frequency::bigint as frequency,
      'known'::text as source
    FROM spelling_corrections
    WHERE misspelling = lower_word
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

  -- Check 4: Edit distance 2 (fuzzy match) - FIX: Explicit type casting
  RETURN QUERY
  SELECT 
    w.word as suggestion,
    (CASE 
      WHEN levenshtein(w.word, lower_word) = 2 THEN 0.70
      ELSE 0.50
    END)::float as confidence,
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
