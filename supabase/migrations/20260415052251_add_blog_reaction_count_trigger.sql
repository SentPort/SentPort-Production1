/*
  # Add Blog Reaction Count Trigger

  ## Summary
  Fixes the blog reaction count columns in `blog_posts` which were never being
  updated when reactions were added or removed. The frontend was only updating
  counts in local React state, meaning counts reset to 0 on every page load.

  ## Changes

  ### New Function: `update_blog_reaction_counts()`
  - Trigger function that fires after INSERT, DELETE, or UPDATE on `blog_reactions`
  - On INSERT: increments the relevant `[type]_count` and `total_reaction_count` in `blog_posts`
  - On DELETE: decrements those columns (floored at 0 via GREATEST)
  - On UPDATE: decrements the old reaction type, increments the new reaction type

  ### New Trigger: `trigger_update_blog_reaction_counts`
  - Fires AFTER INSERT OR DELETE OR UPDATE on `blog_reactions`
  - Row-level trigger, calls `update_blog_reaction_counts()`

  ## Notes
  - Uses GREATEST(0, count - 1) to prevent counts from going negative
  - Handles all 7 reaction types: like, love, insightful, inspiring, thoughtful, helpful, mindblown
*/

CREATE OR REPLACE FUNCTION update_blog_reaction_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE blog_posts
    SET
      like_count       = like_count       + CASE WHEN NEW.reaction_type = 'like'        THEN 1 ELSE 0 END,
      love_count       = love_count       + CASE WHEN NEW.reaction_type = 'love'        THEN 1 ELSE 0 END,
      insightful_count = insightful_count + CASE WHEN NEW.reaction_type = 'insightful'  THEN 1 ELSE 0 END,
      inspiring_count  = inspiring_count  + CASE WHEN NEW.reaction_type = 'inspiring'   THEN 1 ELSE 0 END,
      thoughtful_count = thoughtful_count + CASE WHEN NEW.reaction_type = 'thoughtful'  THEN 1 ELSE 0 END,
      helpful_count    = helpful_count    + CASE WHEN NEW.reaction_type = 'helpful'     THEN 1 ELSE 0 END,
      mindblown_count  = mindblown_count  + CASE WHEN NEW.reaction_type = 'mindblown'   THEN 1 ELSE 0 END,
      total_reaction_count = total_reaction_count + 1
    WHERE id = NEW.post_id;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE blog_posts
    SET
      like_count       = GREATEST(0, like_count       - CASE WHEN OLD.reaction_type = 'like'        THEN 1 ELSE 0 END),
      love_count       = GREATEST(0, love_count       - CASE WHEN OLD.reaction_type = 'love'        THEN 1 ELSE 0 END),
      insightful_count = GREATEST(0, insightful_count - CASE WHEN OLD.reaction_type = 'insightful'  THEN 1 ELSE 0 END),
      inspiring_count  = GREATEST(0, inspiring_count  - CASE WHEN OLD.reaction_type = 'inspiring'   THEN 1 ELSE 0 END),
      thoughtful_count = GREATEST(0, thoughtful_count - CASE WHEN OLD.reaction_type = 'thoughtful'  THEN 1 ELSE 0 END),
      helpful_count    = GREATEST(0, helpful_count    - CASE WHEN OLD.reaction_type = 'helpful'     THEN 1 ELSE 0 END),
      mindblown_count  = GREATEST(0, mindblown_count  - CASE WHEN OLD.reaction_type = 'mindblown'   THEN 1 ELSE 0 END),
      total_reaction_count = GREATEST(0, total_reaction_count - 1)
    WHERE id = OLD.post_id;

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.reaction_type <> NEW.reaction_type THEN
      UPDATE blog_posts
      SET
        like_count       = GREATEST(0, like_count       - CASE WHEN OLD.reaction_type = 'like'        THEN 1 ELSE 0 END)
                           + CASE WHEN NEW.reaction_type = 'like'        THEN 1 ELSE 0 END,
        love_count       = GREATEST(0, love_count       - CASE WHEN OLD.reaction_type = 'love'        THEN 1 ELSE 0 END)
                           + CASE WHEN NEW.reaction_type = 'love'        THEN 1 ELSE 0 END,
        insightful_count = GREATEST(0, insightful_count - CASE WHEN OLD.reaction_type = 'insightful'  THEN 1 ELSE 0 END)
                           + CASE WHEN NEW.reaction_type = 'insightful'  THEN 1 ELSE 0 END,
        inspiring_count  = GREATEST(0, inspiring_count  - CASE WHEN OLD.reaction_type = 'inspiring'   THEN 1 ELSE 0 END)
                           + CASE WHEN NEW.reaction_type = 'inspiring'   THEN 1 ELSE 0 END,
        thoughtful_count = GREATEST(0, thoughtful_count - CASE WHEN OLD.reaction_type = 'thoughtful'  THEN 1 ELSE 0 END)
                           + CASE WHEN NEW.reaction_type = 'thoughtful'  THEN 1 ELSE 0 END,
        helpful_count    = GREATEST(0, helpful_count    - CASE WHEN OLD.reaction_type = 'helpful'     THEN 1 ELSE 0 END)
                           + CASE WHEN NEW.reaction_type = 'helpful'     THEN 1 ELSE 0 END,
        mindblown_count  = GREATEST(0, mindblown_count  - CASE WHEN OLD.reaction_type = 'mindblown'   THEN 1 ELSE 0 END)
                           + CASE WHEN NEW.reaction_type = 'mindblown'   THEN 1 ELSE 0 END
      WHERE id = NEW.post_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_blog_reaction_counts ON blog_reactions;

CREATE TRIGGER trigger_update_blog_reaction_counts
  AFTER INSERT OR DELETE OR UPDATE ON blog_reactions
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_reaction_counts();
