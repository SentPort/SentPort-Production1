/*
  # Add Priority Crawl System to Crawler Queue

  1. New Columns
    - `priority_crawl` (boolean, default false)
      - Marks URLs that should be crawled first in the next manual crawl
      - Takes precedence over normal priority ordering
    - `priority_crawl_failed` (boolean, default false)
      - Tracks if a URL marked for priority crawl failed during crawling
      - Helps identify which priority crawl attempts didn't succeed
      - Reverts to normal queue behavior after failure but remains identifiable

  2. Indexes
    - Partial index on `priority_crawl` column for fast filtering of priority URLs
    - Only indexes rows where priority_crawl = true for optimal performance

  3. Purpose
    - Allows admins to mark specific URLs for immediate crawling
    - Priority crawl URLs are processed first, before normal pending queue
    - Failed priority crawls are trackable and distinguishable from normal failures
    - Maximum 100 URLs can be marked for priority crawl at once (enforced in UI)
*/

-- Add priority crawl columns to crawler_queue table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crawler_queue' AND column_name = 'priority_crawl'
  ) THEN
    ALTER TABLE crawler_queue ADD COLUMN priority_crawl BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crawler_queue' AND column_name = 'priority_crawl_failed'
  ) THEN
    ALTER TABLE crawler_queue ADD COLUMN priority_crawl_failed BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Create partial index for fast filtering of priority crawl items
CREATE INDEX IF NOT EXISTS idx_crawler_queue_priority_crawl 
ON crawler_queue(priority_crawl) 
WHERE priority_crawl = true;