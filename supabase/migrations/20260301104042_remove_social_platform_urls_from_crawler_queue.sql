/*
  # Remove Social Platform URLs from Crawler Queue

  This migration removes all internal social platform URLs from the crawler queue,
  preventing them from being crawled and indexed in the future.

  ## Changes Made
  
  1. Delete all crawler queue entries for social platform URLs:
     - HuTube videos (/hutube/)
     - Heddit posts (/heddit/)
     - Switter tweets (/switter/)
     - HuBook profiles (/hubook/)
     - Hinsta posts (/hinsta/)
     - Blog articles (/blog/)
  
  This clears all pending, failed, and completed social platform crawl attempts
  from the queue, ensuring they won't be re-crawled.
*/

-- Delete all social platform URLs from crawler_queue
DELETE FROM crawler_queue 
WHERE url LIKE '%/hutube/%'
   OR url LIKE '%/heddit/%'
   OR url LIKE '%/switter/%'
   OR url LIKE '%/hubook/%'
   OR url LIKE '%/hinsta/%'
   OR url LIKE '%/blog/%';