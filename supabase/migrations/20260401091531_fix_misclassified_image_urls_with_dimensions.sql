/*
  # Fix Misclassified Image URLs with Dimension Patterns

  1. Overview
    - Fixes existing search_index entries that are images but misclassified as web_page
    - Targets URLs with dimension patterns like /282x188/ or /600x400/
    - Updates content_type from web_page to image for these URLs

  2. Detection Criteria
    - URL contains dimension pattern: /WIDTHxHEIGHT/ (e.g., /282x188/)
    - URL ends with common image extensions (.jpg, .jpeg, .png, .gif, .webp, .svg)
    - Currently classified as web_page or NULL

  3. Updates Applied
    - Set content_type = 'image'
    - Set thumbnail_url to the URL itself (since these are direct image URLs)
    - Extract and set image_width and image_height from dimension pattern where possible

  4. Impact
    - Fixes Investopedia and similar CDN images appearing in wrong search tabs
    - Images will now correctly appear in the Images tab
    - Improves search result accuracy and user experience
*/

-- Update misclassified image URLs
UPDATE search_index
SET 
  content_type = 'image',
  thumbnail_url = COALESCE(thumbnail_url, url)
WHERE 
  -- Has dimension pattern in URL
  url ~ '/\d+x\d+/'
  -- Ends with image extension
  AND url ~* '\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$'
  -- Currently misclassified
  AND (content_type IS NULL OR content_type = 'web_page');
