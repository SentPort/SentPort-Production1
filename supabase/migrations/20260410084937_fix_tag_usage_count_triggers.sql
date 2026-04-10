/*
  # Fix Tag Usage Count Triggers

  ## Problem
  Custom tags added to communities (via heddit_subreddit_custom_tags) were being
  created in the heddit_custom_tags table but their usage counts (usage_count,
  subreddit_usage_count, post_usage_count) were never being updated. This caused:
  - Tags showing "0 communities" even when linked to a community
  - Tags showing "0 total uses" in search results
  - Communities not surfacing when users search for their custom tags

  ## Changes

  ### New Trigger Functions
  - `update_tag_subreddit_count()` - increments/decrements subreddit_usage_count
    and usage_count when tags are linked/unlinked from communities
  - `update_tag_post_count()` - increments/decrements post_usage_count and
    usage_count when tags are linked/unlinked from posts

  ### New Triggers
  - `trg_tag_subreddit_count` on heddit_subreddit_custom_tags (INSERT, DELETE)
  - `trg_tag_post_count` on heddit_post_tags (INSERT, DELETE)

  ### Backfill
  - Recalculates subreddit_usage_count, post_usage_count, and usage_count
    for all existing tags so previously linked tags show correct counts
*/

-- Trigger function for community tag links
CREATE OR REPLACE FUNCTION update_tag_subreddit_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE heddit_custom_tags
    SET
      subreddit_usage_count = subreddit_usage_count + 1,
      usage_count = usage_count + 1
    WHERE id = NEW.tag_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE heddit_custom_tags
    SET
      subreddit_usage_count = GREATEST(subreddit_usage_count - 1, 0),
      usage_count = GREATEST(usage_count - 1, 0)
    WHERE id = OLD.tag_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger function for post tag links
CREATE OR REPLACE FUNCTION update_tag_post_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE heddit_custom_tags
    SET
      post_usage_count = post_usage_count + 1,
      usage_count = usage_count + 1
    WHERE id = NEW.tag_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE heddit_custom_tags
    SET
      post_usage_count = GREATEST(post_usage_count - 1, 0),
      usage_count = GREATEST(usage_count - 1, 0)
    WHERE id = OLD.tag_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Drop existing triggers if any (idempotent)
DROP TRIGGER IF EXISTS trg_tag_subreddit_count ON heddit_subreddit_custom_tags;
DROP TRIGGER IF EXISTS trg_tag_post_count ON heddit_post_tags;

-- Trigger on community tag links
CREATE TRIGGER trg_tag_subreddit_count
AFTER INSERT OR DELETE ON heddit_subreddit_custom_tags
FOR EACH ROW EXECUTE FUNCTION update_tag_subreddit_count();

-- Trigger on post tag links
CREATE TRIGGER trg_tag_post_count
AFTER INSERT OR DELETE ON heddit_post_tags
FOR EACH ROW EXECUTE FUNCTION update_tag_post_count();

-- Backfill: recalculate all existing tag counts from actual data
UPDATE heddit_custom_tags t
SET
  subreddit_usage_count = (
    SELECT COUNT(*) FROM heddit_subreddit_custom_tags WHERE tag_id = t.id
  ),
  post_usage_count = (
    SELECT COUNT(*) FROM heddit_post_tags WHERE tag_id = t.id
  ),
  usage_count = (
    SELECT COUNT(*) FROM heddit_subreddit_custom_tags WHERE tag_id = t.id
  ) + (
    SELECT COUNT(*) FROM heddit_post_tags WHERE tag_id = t.id
  );
