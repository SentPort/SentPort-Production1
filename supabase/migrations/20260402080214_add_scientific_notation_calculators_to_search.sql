/*
  # Add Scientific Notation Calculators to Search Index

  1. Changes
    - Add calculator.net and inchcalculator.com to verified_external_domains
    - Add specific scientific notation calculator URLs to search_index
    - Mark them as verified external content with appropriate metadata

  2. URLs Added
    - https://www.calculator.net/scientific-notation-calculator.html
    - https://www.inchcalculator.com/scientific-notation-calculator/

  3. Purpose
    - Surface helpful scientific notation calculator tools when users search for:
      - Numbers in scientific notation (e.g., "3.17098e-8")
      - "What is" questions about scientific notation
      - Scientific notation calculator queries
*/

-- Add verified external domains
INSERT INTO verified_external_domains (domain, notes)
VALUES 
  ('calculator.net', 'Trusted calculator resource for scientific notation and other math tools'),
  ('inchcalculator.com', 'Trusted calculator resource for scientific notation and unit conversions')
ON CONFLICT (domain) DO NOTHING;

-- Add scientific notation calculator URLs to search index
INSERT INTO search_index (
  url,
  title,
  description,
  content_snippet,
  is_internal,
  is_verified_external,
  content_type,
  relevance_score
)
VALUES 
  (
    'https://www.calculator.net/scientific-notation-calculator.html',
    'Scientific Notation Calculator',
    'Online tool to convert between number formats including scientific notation, E-notation, engineering notation, and real numbers.',
    'Convert numbers to and from scientific notation. This calculator supports E-notation (also known as exponential notation) and can handle very large or very small numbers. Use it to understand numbers like 3.17098e-8 or convert between decimal and scientific notation formats.',
    false,
    true,
    'web_page',
    100
  ),
  (
    'https://www.inchcalculator.com/scientific-notation-calculator/',
    'Scientific Notation Calculator and Converter - Inch Calculator',
    'Use the scientific notation conversion calculator to convert a number to scientific notation, E notation, and engineering notation and back.',
    'Convert numbers between standard decimal format and scientific notation. Learn what E means in scientific notation and how to move the decimal point. Perfect for understanding exponential notation like 3.17098e-8 and converting between different number formats.',
    false,
    true,
    'web_page',
    100
  )
ON CONFLICT (url) DO UPDATE SET
  is_verified_external = EXCLUDED.is_verified_external,
  relevance_score = EXCLUDED.relevance_score;
