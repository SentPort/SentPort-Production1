/*
  # Fix Language Constraint to Support All Detected Languages

  1. Changes
    - Drop existing language CHECK constraint on search_index table
    - Add new CHECK constraint with expanded language list
    - Include all languages that the detection function can return: th, he, hi, el, nl, pl, tr, vi
    
  2. Security
    - No RLS changes needed
    - Only modifies data validation constraint
*/

-- Drop the old constraint
ALTER TABLE search_index DROP CONSTRAINT IF EXISTS search_index_language_check;

-- Add new constraint with all supported language codes
ALTER TABLE search_index ADD CONSTRAINT search_index_language_check 
  CHECK (language = ANY (ARRAY[
    'en', 'ja', 'zh', 'ko', 'ar', 'ru', 'es', 'fr', 'de', 'pt', 'it',
    'th', 'he', 'hi', 'el', 'nl', 'pl', 'tr', 'vi',
    'unknown', 'other'
  ]::text[]));