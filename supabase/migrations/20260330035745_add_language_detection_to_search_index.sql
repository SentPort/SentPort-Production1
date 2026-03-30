/*
  # Add Language Detection to Search Index

  1. Schema Changes
    - Add `language` column (text, default 'en') - ISO 639-1 language code
    - Add `language_confidence` column (numeric 0-1) - Detection confidence score
    - Add index on `language` for efficient filtering

  2. New Functions
    - `detect_language_simple(text)`: Basic language detection using character patterns
    - Returns 'en' for English, 'ja' for Japanese, 'zh' for Chinese, 'ko' for Korean,
      'ar' for Arabic, 'ru' for Russian, 'other' for everything else

  3. Purpose
    - Enable filtering of search results by language
    - Allow crawling of non-English content for future use
    - Default all content to English unless detected otherwise
    - Provide language analytics for admins

  4. Detection Logic
    - Uses Unicode character ranges to identify non-Latin scripts
    - Uses common English words for Latin script content
    - Conservative approach: defaults to 'en' when uncertain
*/

-- Add language columns to search_index
ALTER TABLE search_index
ADD COLUMN IF NOT EXISTS language text DEFAULT 'en' CHECK (language IN ('en', 'ja', 'zh', 'ko', 'ar', 'ru', 'es', 'fr', 'de', 'it', 'pt', 'pl', 'other'));

ALTER TABLE search_index
ADD COLUMN IF NOT EXISTS language_confidence numeric DEFAULT 0.8 CHECK (language_confidence >= 0 AND language_confidence <= 1);

-- Create index for efficient language filtering
CREATE INDEX IF NOT EXISTS idx_search_index_language ON search_index(language);

-- Create simple language detection function
CREATE OR REPLACE FUNCTION detect_language_simple(content text)
RETURNS TABLE(language text, confidence numeric)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_content text;
  v_length integer;
  v_cjk_chars integer := 0;
  v_cyrillic_chars integer := 0;
  v_arabic_chars integer := 0;
  v_latin_chars integer := 0;
  v_english_words integer := 0;
  v_total_chars integer := 0;
BEGIN
  -- Normalize and clean content
  v_content := LOWER(TRIM(content));
  v_length := LENGTH(v_content);

  -- Empty or too short content defaults to English
  IF v_length < 10 THEN
    RETURN QUERY SELECT 'en'::text, 0.5::numeric;
    RETURN;
  END IF;

  -- Count different script characters
  -- CJK (Chinese, Japanese, Korean) Unicode ranges
  v_cjk_chars := LENGTH(regexp_replace(v_content, '[^\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]', '', 'g'));

  -- Cyrillic (Russian, etc.) Unicode range
  v_cyrillic_chars := LENGTH(regexp_replace(v_content, '[^\u0400-\u04FF]', '', 'g'));

  -- Arabic Unicode range
  v_arabic_chars := LENGTH(regexp_replace(v_content, '[^\u0600-\u06FF]', '', 'g'));

  -- Latin characters
  v_latin_chars := LENGTH(regexp_replace(v_content, '[^a-z ]', '', 'g'));

  v_total_chars := v_cjk_chars + v_cyrillic_chars + v_arabic_chars + v_latin_chars;

  -- If more than 20% CJK characters, it's likely CJK language
  IF v_total_chars > 0 AND (v_cjk_chars::numeric / v_total_chars::numeric) > 0.2 THEN
    -- Distinguish between Japanese (has Hiragana/Katakana) and Chinese
    IF LENGTH(regexp_replace(v_content, '[^\u3040-\u309F\u30A0-\u30FF]', '', 'g')) > 5 THEN
      RETURN QUERY SELECT 'ja'::text, 0.9::numeric;
    ELSIF LENGTH(regexp_replace(v_content, '[^\uAC00-\uD7AF]', '', 'g')) > 5 THEN
      RETURN QUERY SELECT 'ko'::text, 0.9::numeric;
    ELSE
      RETURN QUERY SELECT 'zh'::text, 0.85::numeric;
    END IF;
    RETURN;
  END IF;

  -- If more than 20% Cyrillic characters, it's likely Russian
  IF v_total_chars > 0 AND (v_cyrillic_chars::numeric / v_total_chars::numeric) > 0.2 THEN
    RETURN QUERY SELECT 'ru'::text, 0.9::numeric;
    RETURN;
  END IF;

  -- If more than 20% Arabic characters, it's likely Arabic
  IF v_total_chars > 0 AND (v_arabic_chars::numeric / v_total_chars::numeric) > 0.2 THEN
    RETURN QUERY SELECT 'ar'::text, 0.9::numeric;
    RETURN;
  END IF;

  -- For Latin script, check for common English words
  -- Count common English words (the, a, an, is, are, was, were, in, on, at, to, for, of, and, or, but)
  v_english_words :=
    (LENGTH(v_content) - LENGTH(REPLACE(v_content, ' the ', ''))) / 5 +
    (LENGTH(v_content) - LENGTH(REPLACE(v_content, ' a ', ''))) / 3 +
    (LENGTH(v_content) - LENGTH(REPLACE(v_content, ' is ', ''))) / 4 +
    (LENGTH(v_content) - LENGTH(REPLACE(v_content, ' are ', ''))) / 5 +
    (LENGTH(v_content) - LENGTH(REPLACE(v_content, ' and ', ''))) / 5 +
    (LENGTH(v_content) - LENGTH(REPLACE(v_content, ' to ', ''))) / 4 +
    (LENGTH(v_content) - LENGTH(REPLACE(v_content, ' for ', ''))) / 5 +
    (LENGTH(v_content) - LENGTH(REPLACE(v_content, ' of ', ''))) / 4 +
    (LENGTH(v_content) - LENGTH(REPLACE(v_content, ' in ', ''))) / 4;

  -- If we found common English words, it's likely English
  IF v_english_words >= 2 THEN
    RETURN QUERY SELECT 'en'::text, 0.85::numeric;
    RETURN;
  END IF;

  -- Check for other Romance language patterns (Spanish, French, Portuguese, Italian)
  IF v_content ~ '(el |la |los |las |de |que |es |en |un |una |por )' THEN
    RETURN QUERY SELECT 'es'::text, 0.7::numeric;
    RETURN;
  ELSIF v_content ~ '(le |la |les |de |que |et |est |pour |dans |un |une |des )' THEN
    RETURN QUERY SELECT 'fr'::text, 0.7::numeric;
    RETURN;
  ELSIF v_content ~ '(der |die |das |und |ist |zu |den |dem |des |von |mit )' THEN
    RETURN QUERY SELECT 'de'::text, 0.7::numeric;
    RETURN;
  ELSIF v_content ~ '(o |a |os |as |de |que |e |do |da |em |um |uma |para )' THEN
    RETURN QUERY SELECT 'pt'::text, 0.7::numeric;
    RETURN;
  ELSIF v_content ~ '(il |la |le |di |che |e |è |per |un |una |dei |delle )' THEN
    RETURN QUERY SELECT 'it'::text, 0.7::numeric;
    RETURN;
  ELSIF v_content ~ '(w |z |i |na |do |się |nie |to |jest |jako |być )' THEN
    RETURN QUERY SELECT 'pl'::text, 0.7::numeric;
    RETURN;
  END IF;

  -- Default to English with low confidence for Latin script
  IF v_latin_chars > v_length / 2 THEN
    RETURN QUERY SELECT 'en'::text, 0.6::numeric;
  ELSE
    RETURN QUERY SELECT 'other'::text, 0.5::numeric;
  END IF;

  RETURN;
END;
$$;