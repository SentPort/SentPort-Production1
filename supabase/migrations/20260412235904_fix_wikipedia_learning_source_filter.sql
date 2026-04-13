/*
  # Fix Wikipedia Learning Source Filter

  ## Problem
  The `learn_from_wikipedia_corrections` function only counts clicks where
  `source IN ('wikipedia', 'wikipedia_opensearch')`. However, when the database
  already has a pre-seeded suggestion (e.g. "nyc" -> "New York City"), the
  suggestion is served with `source = 'database'`, so all clicks on it are
  tagged as 'database' and are completely invisible to the learning function.

  The threshold of 3 clicks can never be reached via this path.

  ## Fix
  Broaden the source filter to also include 'database' source clicks, since
  those suggestions were themselves originally seeded from Wikipedia data.
  Any clicked suggestion with a valid suggested_query counts toward learning.

  ## Changes
  - Rewrites `learn_from_wikipedia_corrections` to accept clicks from ALL
    sources (wikipedia, wikipedia_opensearch, database, combined), not just
    Wikipedia-tagged ones.
*/

CREATE OR REPLACE FUNCTION public.learn_from_wikipedia_corrections()
RETURNS TABLE(original text, correction text, click_count bigint, avg_confidence double precision, learned boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH wikipedia_clicks AS (
    SELECT
      scl.original_query,
      scl.suggested_query,
      COUNT(*) AS clicks,
      AVG(scl.confidence) AS avg_conf,
      LEAST(0.95, 0.75 + (COUNT(*) * 0.05)) AS learned_confidence
    FROM spell_check_log scl
    WHERE
      scl.user_clicked = true
      AND scl.suggested_query IS NOT NULL
      AND scl.original_query != scl.suggested_query
    GROUP BY scl.original_query, scl.suggested_query
    HAVING COUNT(*) >= 3
  ),
  insertions AS (
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
    wc.original_query AS original,
    wc.suggested_query AS correction,
    wc.clicks AS click_count,
    wc.avg_conf AS avg_confidence,
    EXISTS (
      SELECT 1 FROM insertions i
      WHERE i.misspelling = wc.original_query
      AND i.correction = wc.suggested_query
    ) AS learned
  FROM wikipedia_clicks wc
  ORDER BY wc.clicks DESC;
END;
$function$;
