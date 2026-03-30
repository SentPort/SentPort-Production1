/*
  # Reset Language Backfill for Reprocessing
  
  1. Changes
    - Reset all external URLs to be reprocessed with corrected detection logic
    - Set language back to 'en' and confidence to 0.8 as defaults
    - Mark all as unprocessed (language_backfill_processed = false)
  
  2. Important Notes
    - This prepares all 156,349 external URLs for reprocessing
    - The new enhanced detection logic will:
      - Exclude URLs without sufficient SEO content (marked as 'unknown')
      - Detect non-English content accurately using text + URL analysis
      - Only mark actual English content as 'en'
    - Search results will automatically exclude 'unknown' and non-'en' languages
*/

-- Reset all external URLs to be reprocessed
UPDATE search_index 
SET 
  language = 'en',
  language_confidence = 0.8,
  language_backfill_processed = false
WHERE is_internal = false;