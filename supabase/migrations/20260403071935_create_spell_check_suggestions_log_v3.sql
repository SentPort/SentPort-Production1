/*
  # Create Spell Check Suggestions Log

  1. New Tables
    - `spell_check_log`
      - `id` (uuid, primary key)
      - `original_query` (text) - The user's original search query
      - `suggested_query` (text) - The suggested corrected query (null if no suggestion)
      - `confidence` (float) - Confidence score of the suggestion
      - `user_clicked` (boolean) - Whether user clicked the suggestion
      - `result_count_original` (int) - Number of results for original query
      - `result_count_suggested` (int) - Number of results for suggested query (if clicked)
      - `created_at` (timestamptz)
      - `user_id` (uuid, nullable) - User who performed the search (if logged in)

  2. Indexes
    - B-tree index on original_query for analytics
    - B-tree index on user_clicked for learning
    - B-tree index on created_at for time-based queries
    - B-tree index on confidence for quality metrics

  3. Security
    - Enable RLS
    - Anyone can insert their own searches
    - Only admins can view aggregated data
    - Service role has full access

  4. Purpose
    - Track all spell check attempts (not just successful ones)
    - Learn which suggestions users click vs ignore
    - Build training data for improving spell correction
    - Identify common misspellings that need manual corrections
*/

-- Create spell check log table
CREATE TABLE IF NOT EXISTS spell_check_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_query text NOT NULL,
  suggested_query text,
  confidence float DEFAULT 0.0,
  user_clicked boolean DEFAULT false,
  result_count_original int DEFAULT 0,
  result_count_suggested int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for analytics and learning
CREATE INDEX IF NOT EXISTS spell_check_log_original_query_idx ON spell_check_log (original_query);
CREATE INDEX IF NOT EXISTS spell_check_log_user_clicked_idx ON spell_check_log (user_clicked);
CREATE INDEX IF NOT EXISTS spell_check_log_created_at_idx ON spell_check_log (created_at DESC);
CREATE INDEX IF NOT EXISTS spell_check_log_confidence_idx ON spell_check_log (confidence DESC);
CREATE INDEX IF NOT EXISTS spell_check_log_user_id_idx ON spell_check_log (user_id);

-- Enable RLS
ALTER TABLE spell_check_log ENABLE ROW LEVEL SECURITY;

-- Anyone can insert their own searches
CREATE POLICY "Anyone can log their spell checks"
  ON spell_check_log
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Users can update their own logs to mark clicked
CREATE POLICY "Users can update their own spell check logs"
  ON spell_check_log
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Only admins can read aggregated data
CREATE POLICY "Admins can read all spell check logs"
  ON spell_check_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Service role has full access
CREATE POLICY "Service role has full access to spell check logs"
  ON spell_check_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to record spell check attempt
CREATE OR REPLACE FUNCTION record_spell_check_attempt(
  p_original_query text,
  p_suggested_query text DEFAULT NULL,
  p_confidence float DEFAULT 0.0,
  p_result_count int DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
  v_user_id uuid;
BEGIN
  -- Get current user ID if authenticated
  BEGIN
    v_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  -- Insert log entry
  INSERT INTO spell_check_log (
    original_query,
    suggested_query,
    confidence,
    result_count_original,
    user_id
  ) VALUES (
    p_original_query,
    p_suggested_query,
    p_confidence,
    p_result_count,
    v_user_id
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Function to mark suggestion as clicked
CREATE OR REPLACE FUNCTION mark_suggestion_clicked(
  p_log_id uuid,
  p_result_count_suggested int DEFAULT 0
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE spell_check_log
  SET
    user_clicked = true,
    result_count_suggested = p_result_count_suggested
  WHERE id = p_log_id;

  RETURN FOUND;
END;
$$;

-- Function to get top unlearned misspellings (clicked suggestions that aren't in spelling_corrections)
CREATE OR REPLACE FUNCTION get_top_unlearned_misspellings(limit_count int DEFAULT 50)
RETURNS TABLE (
  original_query text,
  suggested_query text,
  click_count bigint,
  avg_confidence float,
  last_seen timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    scl.original_query,
    scl.suggested_query,
    COUNT(*) as click_count,
    AVG(scl.confidence)::float as avg_confidence,
    MAX(scl.created_at) as last_seen
  FROM spell_check_log scl
  WHERE scl.user_clicked = true
    AND scl.suggested_query IS NOT NULL
    AND scl.original_query != scl.suggested_query
    AND NOT EXISTS (
      SELECT 1 FROM spelling_corrections sc
      WHERE sc.misspelling = scl.original_query
      AND sc.correction = scl.suggested_query
    )
  GROUP BY scl.original_query, scl.suggested_query
  HAVING COUNT(*) >= 3
  ORDER BY COUNT(*) DESC, MAX(scl.created_at) DESC
  LIMIT limit_count;
END;
$$;

-- Function to auto-learn corrections from clicked suggestions
CREATE OR REPLACE FUNCTION auto_learn_corrections(min_clicks int DEFAULT 5)
RETURNS TABLE (
  misspelling text,
  correction text,
  times_clicked bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH clicked_suggestions AS (
    SELECT
      original_query,
      suggested_query,
      COUNT(*) as click_count,
      AVG(confidence) as avg_confidence
    FROM spell_check_log
    WHERE user_clicked = true
      AND suggested_query IS NOT NULL
      AND original_query != suggested_query
    GROUP BY original_query, suggested_query
    HAVING COUNT(*) >= min_clicks
  )
  INSERT INTO spelling_corrections (misspelling, correction, confidence, frequency, source)
  SELECT
    cs.original_query,
    cs.suggested_query,
    LEAST(cs.avg_confidence, 0.95)::float,
    cs.click_count::int,
    'learned'
  FROM clicked_suggestions cs
  WHERE NOT EXISTS (
    SELECT 1 FROM spelling_corrections sc
    WHERE sc.misspelling = cs.original_query
  )
  ON CONFLICT (misspelling) DO UPDATE
  SET
    frequency = spelling_corrections.frequency + EXCLUDED.frequency,
    confidence = GREATEST(spelling_corrections.confidence, EXCLUDED.confidence),
    last_seen = now()
  RETURNING spelling_corrections.misspelling, spelling_corrections.correction, spelling_corrections.frequency;
END;
$$;
