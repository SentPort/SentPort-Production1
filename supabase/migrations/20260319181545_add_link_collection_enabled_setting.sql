/*
  # Add Link Collection Control Setting

  1. New Settings
    - Adds `link_collection_enabled` setting to crawler_settings table
    - Default value: 'true' (maintains current behavior)
    - Controls whether discovered links are added to queue during crawls
  
  2. Purpose
    - Allows administrators to pause link discovery while continuing to process existing queue
    - Helps manage database growth when queue is large
    - Independent from auto_crawl_enabled setting
  
  3. Important Notes
    - When 'true': Links discovered during crawls are added to queue (default behavior)
    - When 'false': Crawls continue but new links are NOT added to queue
    - This allows queue to shrink while completed crawls increase
*/

-- Insert link_collection_enabled setting if it doesn't exist
INSERT INTO crawler_settings (key, value, updated_at)
VALUES ('link_collection_enabled', 'true', now())
ON CONFLICT (key) DO NOTHING;
