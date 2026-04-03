/*
  # Add Source Tracking and Wikipedia Learning System

  1. Changes to spell_check_log
    - Add `source` column to track where suggestions came from
    - Possible values: 'database', 'wikipedia', 'wikipedia_opensearch', 'combined'
    - Add index for efficient querying by source

  2. New Function: learn_from_wikipedia_corrections
    - Identifies Wikipedia suggestions that users clicked 3+ times
    - Imports validated corrections into spelling_corrections table
    - Marks learned corrections with source='learned_from_wikipedia'
    - Updates confidence based on click-through rate

  3. Purpose
    - Track which spell check system (database vs Wikipedia) provides suggestions
    - Learn from successful Wikipedia corrections
    - Improve internal database over time by importing proven corrections
    - Reduce reliance on external Wikipedia API calls
    - Create self-improving spell correction system
*/

-- Add source tracking column to spell_check_log
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'spell_check_log' AND column_name = 'source'
  ) THEN
    ALTER TABLE spell_check_log ADD COLUMN source text DEFAULT 'database';
  END IF;
END $$;

-- Add constraint to ensure valid source values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'spell_check_log' AND constraint_name = 'spell_check_log_source_check'
  ) THEN
    ALTER TABLE spell_check_log
    ADD CONSTRAINT spell_check_log_source_check
    CHECK (source IN ('database', 'wikipedia', 'wikipedia_opensearch', 'combined'));
  END IF;
END $$;

-- Create index for querying by source
CREATE INDEX IF NOT EXISTS spell_check_log_source_idx ON spell_check_log (source);

-- Create index for learning queries (clicked + source)
CREATE INDEX IF NOT EXISTS spell_check_log_clicked_source_idx ON spell_check_log (user_clicked, source) WHERE user_clicked = true;

-- Function to learn from Wikipedia corrections
CREATE OR REPLACE FUNCTION learn_from_wikipedia_corrections()
RETURNS TABLE (
  original text,
  correction text,
  click_count bigint,
  avg_confidence float,
  learned boolean
) AS $$
BEGIN
  RETURN QUERY
  WITH wikipedia_clicks AS (
    -- Find Wikipedia suggestions that were clicked 3+ times
    SELECT
      scl.original_query,
      scl.suggested_query,
      COUNT(*) as clicks,
      AVG(scl.confidence) as avg_conf,
      -- Calculate click-through rate based confidence
      LEAST(0.95, 0.75 + (COUNT(*) * 0.05)) as learned_confidence
    FROM spell_check_log scl
    WHERE
      scl.user_clicked = true
      AND scl.source IN ('wikipedia', 'wikipedia_opensearch')
      AND scl.suggested_query IS NOT NULL
      AND scl.original_query != scl.suggested_query
    GROUP BY scl.original_query, scl.suggested_query
    HAVING COUNT(*) >= 3
  ),
  insertions AS (
    -- Insert learned corrections into spelling_corrections table
    INSERT INTO spelling_corrections (
      misspelling,
      correction,
      confidence,
      frequency,
      source
    )
    SELECT
      wc.original_query,
      wc.suggested_query,
      wc.learned_confidence,
      wc.clicks::int,
      'learned_from_wikipedia'
    FROM wikipedia_clicks wc
    WHERE NOT EXISTS (
      -- Don't duplicate existing corrections
      SELECT 1 FROM spelling_corrections sc
      WHERE sc.misspelling = wc.original_query
      AND sc.correction = wc.suggested_query
    )
    ON CONFLICT (misspelling, correction) DO UPDATE
    SET
      frequency = spelling_corrections.frequency + EXCLUDED.frequency,
      confidence = GREATEST(spelling_corrections.confidence, EXCLUDED.confidence),
      updated_at = now()
    RETURNING misspelling, correction
  )
  SELECT
    wc.original_query as original,
    wc.suggested_query as correction,
    wc.clicks as click_count,
    wc.avg_conf as avg_confidence,
    EXISTS (
      SELECT 1 FROM insertions i
      WHERE i.misspelling = wc.original_query
      AND i.correction = wc.suggested_query
    ) as learned
  FROM wikipedia_clicks wc
  ORDER BY wc.clicks DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get learning statistics
CREATE OR REPLACE FUNCTION get_wikipedia_learning_stats()
RETURNS TABLE (
  total_wikipedia_suggestions bigint,
  clicked_suggestions bigint,
  learnable_corrections bigint,
  already_learned bigint,
  click_through_rate float
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) FILTER (WHERE source IN ('wikipedia', 'wikipedia_opensearch')) as total_wiki,
      COUNT(*) FILTER (WHERE source IN ('wikipedia', 'wikipedia_opensearch') AND user_clicked = true) as clicked_wiki,
      COUNT(DISTINCT (original_query, suggested_query)) FILTER (
        WHERE source IN ('wikipedia', 'wikipedia_opensearch')
        AND user_clicked = true
        AND suggested_query IS NOT NULL
      ) as unique_clicked
    FROM spell_check_log
  ),
  learnable AS (
    SELECT COUNT(DISTINCT (original_query, suggested_query)) as count
    FROM spell_check_log
    WHERE
      source IN ('wikipedia', 'wikipedia_opensearch')
      AND user_clicked = true
      AND suggested_query IS NOT NULL
    GROUP BY original_query, suggested_query
    HAVING COUNT(*) >= 3
  ),
  learned AS (
    SELECT COUNT(*) as count
    FROM spelling_corrections
    WHERE source = 'learned_from_wikipedia'
  )
  SELECT
    s.total_wiki,
    s.clicked_wiki,
    COALESCE((SELECT SUM(1) FROM learnable), 0)::bigint,
    COALESCE((SELECT count FROM learned), 0)::bigint,
    CASE
      WHEN s.total_wiki > 0 THEN (s.clicked_wiki::float / s.total_wiki::float)
      ELSE 0.0
    END
  FROM stats s;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION learn_from_wikipedia_corrections() TO authenticated;
GRANT EXECUTE ON FUNCTION get_wikipedia_learning_stats() TO authenticated;
