/*
  # Create Spelling Corrections Mapping Table

  1. New Tables
    - `spelling_corrections`
      - `misspelling` (text, primary key) - The misspelled word
      - `correction` (text, not null) - The correct spelling
      - `confidence` (float) - Confidence score (0.0 to 1.0)
      - `frequency` (integer) - How many times this correction was used
      - `last_seen` (timestamptz) - Last time this misspelling was seen
      - `source` (text) - 'manual', 'learned', or 'algorithm'

  2. Indexes
    - Primary key index on misspelling for instant lookups
    - B-tree index on correction for reverse lookups
    - B-tree index on frequency for ranking

  3. Security
    - Enable RLS
    - Public read access for correction lookups
    - Only service role can insert/update
*/

-- Create spelling corrections table
CREATE TABLE IF NOT EXISTS spelling_corrections (
  misspelling text PRIMARY KEY,
  correction text NOT NULL,
  confidence float DEFAULT 0.8 CHECK (confidence >= 0.0 AND confidence <= 1.0),
  frequency integer DEFAULT 1,
  last_seen timestamptz DEFAULT now(),
  source text DEFAULT 'algorithm' CHECK (source IN ('manual', 'learned', 'algorithm')),
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS spelling_corrections_correction_idx ON spelling_corrections (correction);
CREATE INDEX IF NOT EXISTS spelling_corrections_frequency_idx ON spelling_corrections (frequency DESC);
CREATE INDEX IF NOT EXISTS spelling_corrections_source_idx ON spelling_corrections (source);

-- Enable RLS
ALTER TABLE spelling_corrections ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Anyone can read spelling corrections"
  ON spelling_corrections
  FOR SELECT
  TO public
  USING (true);

-- Only service role can modify
CREATE POLICY "Only service role can modify spelling corrections"
  ON spelling_corrections
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Seed with common misspellings
INSERT INTO spelling_corrections (misspelling, correction, confidence, frequency, source) VALUES
  ('adma', 'adam', 0.95, 100, 'manual'),
  ('adan', 'adam', 0.90, 50, 'manual'),
  ('addm', 'adam', 0.85, 30, 'manual'),
  ('adom', 'adam', 0.85, 25, 'manual'),
  ('smth', 'smith', 0.90, 80, 'manual'),
  ('smoth', 'smith', 0.85, 40, 'manual'),
  ('smmith', 'smith', 0.85, 30, 'manual'),
  ('smithh', 'smith', 0.80, 20, 'manual'),
  ('wikipdeia', 'wikipedia', 0.95, 150, 'manual'),
  ('wikpedia', 'wikipedia', 0.95, 140, 'manual'),
  ('wikipedi', 'wikipedia', 0.90, 100, 'manual'),
  ('wikipeida', 'wikipedia', 0.90, 90, 'manual'),
  ('gogle', 'google', 0.95, 200, 'manual'),
  ('googel', 'google', 0.95, 180, 'manual'),
  ('gooogle', 'google', 0.90, 120, 'manual'),
  ('googl', 'google', 0.85, 80, 'manual'),
  ('teh', 'the', 0.99, 500, 'manual'),
  ('hte', 'the', 0.95, 300, 'manual'),
  ('thier', 'their', 0.98, 400, 'manual'),
  ('recieve', 'receive', 0.98, 350, 'manual'),
  ('seperate', 'separate', 0.98, 320, 'manual'),
  ('definately', 'definitely', 0.98, 300, 'manual'),
  ('occured', 'occurred', 0.95, 250, 'manual'),
  ('untill', 'until', 0.95, 200, 'manual'),
  ('writting', 'writing', 0.95, 180, 'manual'),
  ('begining', 'beginning', 0.95, 160, 'manual'),
  ('reccomend', 'recommend', 0.95, 150, 'manual'),
  ('recomend', 'recommend', 0.95, 140, 'manual'),
  ('refering', 'referring', 0.90, 120, 'manual'),
  ('developement', 'development', 0.95, 130, 'manual'),
  ('experiance', 'experience', 0.95, 125, 'manual'),
  ('explaination', 'explanation', 0.95, 115, 'manual'),
  ('accomodate', 'accommodate', 0.95, 105, 'manual'),
  ('arguement', 'argument', 0.95, 100, 'manual'),
  ('beleive', 'believe', 0.95, 95, 'manual'),
  ('calender', 'calendar', 0.95, 90, 'manual'),
  ('cemetary', 'cemetery', 0.95, 85, 'manual'),
  ('changable', 'changeable', 0.90, 80, 'manual'),
  ('collegue', 'colleague', 0.95, 75, 'manual'),
  ('concious', 'conscious', 0.95, 70, 'manual'),
  ('dissapoint', 'disappoint', 0.95, 65, 'manual'),
  ('embarass', 'embarrass', 0.95, 60, 'manual'),
  ('enviroment', 'environment', 0.95, 180, 'manual'),
  ('existance', 'existence', 0.95, 55, 'manual'),
  ('harrass', 'harass', 0.95, 45, 'manual'),
  ('independant', 'independent', 0.95, 40, 'manual'),
  ('jewelery', 'jewelry', 0.90, 35, 'manual'),
  ('liason', 'liaison', 0.95, 30, 'manual'),
  ('millenium', 'millennium', 0.95, 28, 'manual'),
  ('noticable', 'noticeable', 0.90, 26, 'manual'),
  ('occassion', 'occasion', 0.95, 24, 'manual'),
  ('playwrite', 'playwright', 0.95, 22, 'manual'),
  ('pubblic', 'public', 0.90, 20, 'manual'),
  ('rythm', 'rhythm', 0.95, 18, 'manual')
ON CONFLICT (misspelling) DO UPDATE
SET
  confidence = GREATEST(spelling_corrections.confidence, EXCLUDED.confidence),
  frequency = spelling_corrections.frequency + EXCLUDED.frequency,
  last_seen = now();
