/*
  # Create Spell Correction Dictionary System

  1. New Tables
    - `word_dictionary`
      - `word` (text, primary key) - Correctly spelled word
      - `frequency` (bigint) - Number of occurrences in indexed content
      - `is_common` (boolean) - Whether word is in top 10,000 most common words
      - `last_updated` (timestamptz) - Last time frequency was updated
      - `word_length` (int) - Length of word for quick filtering

  2. Indexes
    - GIN trigram index on word for fast fuzzy matching
    - B-tree index on frequency for ranking
    - B-tree index on is_common for filtering
    - B-tree index on word_length for optimization

  3. Security
    - Enable RLS
    - Public read access for dictionary lookups
    - Only service role can insert/update
*/

-- Enable pg_trgm extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create word dictionary table
CREATE TABLE IF NOT EXISTS word_dictionary (
  word text PRIMARY KEY,
  frequency bigint DEFAULT 1,
  is_common boolean DEFAULT false,
  last_updated timestamptz DEFAULT now(),
  word_length int GENERATED ALWAYS AS (length(word)) STORED
);

-- Create trigram GIN index for fast fuzzy matching
CREATE INDEX IF NOT EXISTS word_dictionary_word_trgm_idx ON word_dictionary USING gin (word gin_trgm_ops);

-- Create B-tree indexes for filtering and sorting
CREATE INDEX IF NOT EXISTS word_dictionary_frequency_idx ON word_dictionary (frequency DESC);
CREATE INDEX IF NOT EXISTS word_dictionary_is_common_idx ON word_dictionary (is_common) WHERE is_common = true;
CREATE INDEX IF NOT EXISTS word_dictionary_word_length_idx ON word_dictionary (word_length);

-- Enable RLS
ALTER TABLE word_dictionary ENABLE ROW LEVEL SECURITY;

-- Allow public read access for dictionary lookups
CREATE POLICY "Anyone can read word dictionary"
  ON word_dictionary
  FOR SELECT
  TO public
  USING (true);

-- Only service role can insert/update/delete
CREATE POLICY "Only service role can modify word dictionary"
  ON word_dictionary
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to extract and index words from search index content
CREATE OR REPLACE FUNCTION extract_words_from_text(input_text text)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  words text[];
  cleaned_text text;
BEGIN
  -- Remove special characters and convert to lowercase
  cleaned_text := lower(regexp_replace(input_text, '[^a-zA-Z0-9\s]', ' ', 'g'));

  -- Split into words and filter
  words := (
    SELECT array_agg(DISTINCT word)
    FROM (
      SELECT unnest(string_to_array(cleaned_text, ' ')) AS word
    ) subquery
    WHERE length(word) >= 2 AND length(word) <= 45
  );

  RETURN COALESCE(words, ARRAY[]::text[]);
END;
$$;

-- Function to populate word dictionary from search index
CREATE OR REPLACE FUNCTION populate_word_dictionary()
RETURNS TABLE(words_added bigint, words_updated bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_words_added bigint := 0;
  v_words_updated bigint := 0;
  v_word text;
  v_count bigint;
BEGIN
  -- Extract all words from search index with their frequencies
  FOR v_word, v_count IN
    SELECT
      word,
      COUNT(*) as freq
    FROM (
      SELECT unnest(
        extract_words_from_text(title) ||
        extract_words_from_text(description) ||
        extract_words_from_text(content_snippet)
      ) AS word
      FROM search_index
      WHERE language_backfill_processed = true
        AND (language IS NULL OR language IN ('en', 'unknown'))
    ) words_table
    WHERE length(word) >= 2
    GROUP BY word
    HAVING COUNT(*) >= 2
  LOOP
    -- Insert or update word in dictionary
    INSERT INTO word_dictionary (word, frequency, last_updated)
    VALUES (v_word, v_count, now())
    ON CONFLICT (word) DO UPDATE
    SET
      frequency = word_dictionary.frequency + EXCLUDED.frequency,
      last_updated = now();

    IF FOUND THEN
      IF (SELECT frequency FROM word_dictionary WHERE word = v_word) = v_count THEN
        v_words_added := v_words_added + 1;
      ELSE
        v_words_updated := v_words_updated + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_words_added, v_words_updated;
END;
$$;

-- Function to mark common words based on frequency
CREATE OR REPLACE FUNCTION mark_common_words(top_n int DEFAULT 10000)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count bigint;
BEGIN
  -- Reset all is_common flags
  UPDATE word_dictionary SET is_common = false;

  -- Mark top N most frequent words as common
  WITH top_words AS (
    SELECT word
    FROM word_dictionary
    ORDER BY frequency DESC, word
    LIMIT top_n
  )
  UPDATE word_dictionary
  SET is_common = true
  WHERE word IN (SELECT word FROM top_words);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Seed with common English words
INSERT INTO word_dictionary (word, frequency, is_common) VALUES
  ('the', 1000000, true),
  ('be', 500000, true),
  ('to', 500000, true),
  ('of', 450000, true),
  ('and', 400000, true),
  ('a', 400000, true),
  ('in', 350000, true),
  ('that', 300000, true),
  ('have', 280000, true),
  ('i', 270000, true),
  ('it', 260000, true),
  ('for', 250000, true),
  ('not', 240000, true),
  ('on', 230000, true),
  ('with', 220000, true),
  ('he', 210000, true),
  ('as', 200000, true),
  ('you', 190000, true),
  ('do', 180000, true),
  ('at', 170000, true),
  ('this', 160000, true),
  ('but', 150000, true),
  ('his', 140000, true),
  ('by', 130000, true),
  ('from', 120000, true),
  ('they', 110000, true),
  ('we', 100000, true),
  ('say', 95000, true),
  ('her', 90000, true),
  ('she', 85000, true),
  ('or', 80000, true),
  ('an', 75000, true),
  ('will', 70000, true),
  ('my', 65000, true),
  ('one', 60000, true),
  ('all', 55000, true),
  ('would', 50000, true),
  ('there', 48000, true),
  ('their', 46000, true),
  ('what', 44000, true),
  ('so', 42000, true),
  ('up', 40000, true),
  ('out', 38000, true),
  ('if', 36000, true),
  ('about', 34000, true),
  ('who', 32000, true),
  ('get', 30000, true),
  ('which', 28000, true),
  ('go', 26000, true),
  ('me', 24000, true),
  ('when', 22000, true),
  ('make', 20000, true),
  ('can', 19000, true),
  ('like', 18000, true),
  ('time', 17000, true),
  ('no', 16000, true),
  ('just', 15000, true),
  ('him', 14000, true),
  ('know', 13000, true),
  ('take', 12000, true),
  ('people', 11000, true),
  ('into', 10000, true),
  ('year', 9500, true),
  ('your', 9000, true),
  ('good', 8500, true),
  ('some', 8000, true),
  ('could', 7500, true),
  ('them', 7000, true),
  ('see', 6500, true),
  ('other', 6000, true),
  ('than', 5500, true),
  ('then', 5000, true),
  ('now', 4800, true),
  ('look', 4600, true),
  ('only', 4400, true),
  ('come', 4200, true),
  ('its', 4000, true),
  ('over', 3800, true),
  ('think', 3600, true),
  ('also', 3400, true),
  ('back', 3200, true),
  ('after', 3000, true),
  ('use', 2900, true),
  ('two', 2800, true),
  ('how', 2700, true),
  ('our', 2600, true),
  ('work', 2500, true),
  ('first', 2400, true),
  ('well', 2300, true),
  ('way', 2200, true),
  ('even', 2100, true),
  ('new', 2000, true),
  ('want', 1900, true),
  ('because', 1800, true),
  ('any', 1700, true),
  ('these', 1600, true),
  ('give', 1500, true),
  ('day', 1400, true),
  ('most', 1300, true),
  ('us', 1200, true),
  ('is', 1100000, true),
  ('was', 900000, true),
  ('are', 800000, true),
  ('been', 700000, true),
  ('has', 650000, true),
  ('had', 600000, true),
  ('were', 550000, true),
  ('said', 500000, true),
  ('did', 450000, true),
  ('having', 400000, true),
  ('may', 380000, true),
  ('should', 360000, true),
  ('must', 340000, true),
  ('might', 320000, true),
  ('adam', 50000, true),
  ('smith', 45000, true),
  ('john', 44000, true),
  ('james', 43000, true),
  ('robert', 42000, true),
  ('michael', 41000, true),
  ('william', 40000, true),
  ('david', 39000, true),
  ('richard', 38000, true),
  ('joseph', 37000, true),
  ('thomas', 36000, true),
  ('charles', 35000, true),
  ('wikipedia', 80000, true),
  ('google', 75000, true),
  ('search', 70000, true),
  ('information', 65000, true),
  ('internet', 60000, true),
  ('website', 55000, true),
  ('page', 50000, true),
  ('article', 48000, true),
  ('content', 46000, true),
  ('data', 44000, true)
ON CONFLICT (word) DO UPDATE
SET
  frequency = GREATEST(word_dictionary.frequency, EXCLUDED.frequency),
  is_common = EXCLUDED.is_common,
  last_updated = now();
