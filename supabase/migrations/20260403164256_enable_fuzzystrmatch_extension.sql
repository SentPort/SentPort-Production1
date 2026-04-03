/*
  # Enable fuzzystrmatch Extension for Spell Correction

  1. Changes
    - Enable the fuzzystrmatch PostgreSQL extension
    - This provides the levenshtein() function needed for edit distance calculations
    - Required for spell correction functionality to work properly

  2. Security
    - This is a standard PostgreSQL extension
    - Provides read-only string comparison functions
    - No security concerns
*/

-- Enable fuzzystrmatch extension for levenshtein function
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
