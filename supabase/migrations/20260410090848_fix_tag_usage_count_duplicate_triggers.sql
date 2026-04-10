/*
  # Fix Duplicate Tag Usage Count Triggers

  ## Problem
  Two separate triggers were both incrementing tag usage counts on every INSERT/DELETE:
  
  On heddit_subreddit_custom_tags:
  - trigger_update_tag_counts_subreddit -> update_tag_counts_on_subreddit_tag()
  - trg_tag_subreddit_count -> update_tag_subreddit_count()
  
  On heddit_post_tags:
  - trigger_update_tag_counts_post -> update_tag_counts_on_post_tag()
  - trg_tag_post_count -> update_tag_post_count()

  This caused every tag addition to double-count, so 1 community showed as 2, etc.

  ## Fix
  1. Drop the duplicate triggers (keeping the ones that also update last_used_at)
  2. Recalculate all tag usage counts from the actual data in the junction tables
*/

-- Drop duplicate subreddit trigger (keep trigger_update_tag_counts_subreddit which updates last_used_at)
DROP TRIGGER IF EXISTS trg_tag_subreddit_count ON heddit_subreddit_custom_tags;

-- Drop duplicate post trigger (keep trigger_update_tag_counts_post which updates last_used_at)
DROP TRIGGER IF EXISTS trg_tag_post_count ON heddit_post_tags;

-- Recalculate all tag counts from actual data
UPDATE heddit_custom_tags t
SET
  subreddit_usage_count = (
    SELECT COUNT(*) FROM heddit_subreddit_custom_tags sct WHERE sct.tag_id = t.id
  ),
  post_usage_count = (
    SELECT COUNT(*) FROM heddit_post_tags pt WHERE pt.tag_id = t.id
  ),
  usage_count = (
    SELECT COUNT(*) FROM heddit_subreddit_custom_tags sct WHERE sct.tag_id = t.id
  ) + (
    SELECT COUNT(*) FROM heddit_post_tags pt WHERE pt.tag_id = t.id
  );
