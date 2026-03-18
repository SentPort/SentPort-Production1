/*
  # Remove Social Platform Content from Search Index

  This migration removes all internal social platform content from the search index,
  ensuring that HuTube videos, Heddit posts, Switter tweets, HuBook profiles,
  Hinsta posts, and Blog articles are excluded from search results.

  ## Changes Made
  
  1. Delete all search index entries for social platform URLs:
     - HuTube videos (/hutube/)
     - Heddit posts (/heddit/)
     - Switter tweets (/switter/)
     - HuBook profiles (/hubook/)
     - Hinsta posts (/hinsta/)
     - Blog articles (/blog/)
  
  2. Delete all search index entries with social platform source_platform values
  
  This ensures the search engine focuses on verified external content and
  non-social SentPort pages (homepage, about, legal, etc.)
*/

-- Delete all social platform URLs from search_index
DELETE FROM search_index 
WHERE url LIKE '%/hutube/%'
   OR url LIKE '%/heddit/%'
   OR url LIKE '%/switter/%'
   OR url LIKE '%/hubook/%'
   OR url LIKE '%/hinsta/%'
   OR url LIKE '%/blog/%';

-- Delete any remaining entries with social platform source_platform
DELETE FROM search_index 
WHERE source_platform IN ('hutube', 'heddit', 'switter', 'hubook', 'hinsta', 'blog');